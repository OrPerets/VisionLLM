from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, AsyncIterator, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

import httpx

from ingestion.utils_extract import extract_markdown
from ingestion.utils_url import (
    canonicalize,
    domain_key,
    is_allowed,
    normalize_url,
)


# -----------------------------
# CLI and configuration models
# -----------------------------


@dataclass
class SourceDomain:
    product: str
    allow: List[str]
    deny: List[str]
    version_label: str
    rate_limit_rps: float
    sitemap_urls: List[str]
    manual_urls_file: Optional[str]


UserAgent = "VisionLLM-Ingestor/1.0 (+https://example.com)"


def load_sources(path: str) -> List[SourceDomain]:
    try:
        import yaml  # type: ignore
    except Exception as exc:  # pragma: no cover - dependency must be installed
        raise RuntimeError("PyYAML is required for loading sources.yaml") from exc

    with open(path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    domains: List[SourceDomain] = []
    for entry in cfg.get("domains", []):
        domains.append(
            SourceDomain(
                product=str(entry["product"]).strip(),
                allow=list(entry.get("allow", []) or []),
                deny=list(entry.get("deny", []) or []),
                version_label=str(entry.get("version_label", "")).strip(),
                rate_limit_rps=float(entry.get("rate_limit_rps", 1.0)),
                sitemap_urls=list(entry.get("sitemap_urls", []) or []),
                manual_urls_file=entry.get("manual_urls_file"),
            )
        )
    return domains


# -----------------------------
# Rate limiting & robots
# -----------------------------


class RateLimiter:
    """Simple per-domain rate limiter respecting min interval between calls."""

    def __init__(self, rps: float) -> None:
        self.min_interval = 1.0 / rps if rps > 0 else 0.0
        self._lock = asyncio.Lock()
        self._last: float = 0.0
        self._delay_extra: float = 0.0  # e.g., Retry-After pushes extra delay

    async def wait(self) -> None:
        async with self._lock:
            now = time.monotonic()
            target = self._last + self.min_interval + self._delay_extra
            sleep_for = max(0.0, target - now)
            if sleep_for > 0:
                await asyncio.sleep(sleep_for)
            self._last = time.monotonic()
            # Reset extra delay after we honored it once
            self._delay_extra = 0.0

    def push_delay(self, seconds: float) -> None:
        if seconds > 0:
            # Take the maximum with current pending extra delay
            self._delay_extra = max(self._delay_extra, float(seconds))


class RobotsCache:
    """Cache of robots.txt per domain using urllib.robotparser-style semantics."""

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    async def get(self, client: httpx.AsyncClient, url: str) -> Any:
        key = domain_key(url)
        if key in self._cache:
            return self._cache[key]
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            if key in self._cache:
                return self._cache[key]
            from urllib import robotparser

            rp = robotparser.RobotFileParser()
            robots_url = f"https://{key}/robots.txt"
            try:
                resp = await client.get(robots_url, headers={"User-Agent": UserAgent}, timeout=10.0)
                if resp.status_code == 200 and resp.text:
                    rp.parse(resp.text.splitlines())
                else:
                    # Treat as empty robots (allow all) per common practice
                    rp.parse("")
            except Exception:
                rp.parse("")
            self._cache[key] = rp
            return rp


# -----------------------------
# Sitemap crawling
# -----------------------------


SITEMAP_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
}


async def _fetch_text(client: httpx.AsyncClient, url: str, timeout: float) -> Optional[str]:
    try:
        r = await client.get(url, headers={"User-Agent": UserAgent}, timeout=timeout)
        if r.status_code == 200:
            return r.text
        return None
    except Exception:
        return None


def _iter_sitemap_urls(xml_text: str) -> Tuple[List[str], List[str]]:
    """Parse a sitemap XML text and return (sitemaps, urls).

    Supports both <sitemapindex> and <urlset> with or without namespaces.
    """
    sitemaps: List[str] = []
    urls: List[str] = []

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return (sitemaps, urls)

    tag = root.tag.lower()
    if tag.endswith("sitemapindex"):
        for sm in root.findall(".//{*}sitemap"):
            loc = sm.find("{*}loc")
            if loc is not None and loc.text:
                sitemaps.append(loc.text.strip())
    elif tag.endswith("urlset"):
        for url in root.findall(".//{*}url"):
            loc = url.find("{*}loc")
            if loc is not None and loc.text:
                urls.append(loc.text.strip())
    return (sitemaps, urls)


async def discover_urls_via_sitemaps(
    client: httpx.AsyncClient, sitemap_urls: Iterable[str], timeout: float, max_depth: int = 3
) -> Set[str]:
    seen_xml: Set[str] = set()
    found_urls: Set[str] = set()

    async def _walk(url: str, depth: int) -> None:
        if depth > max_depth:
            return
        if url in seen_xml:
            return
        seen_xml.add(url)
        text = await _fetch_text(client, url, timeout)
        if not text:
            return
        sub_sitemaps, urls = _iter_sitemap_urls(text)
        for u in urls:
            found_urls.add(u)
        for sm in sub_sitemaps:
            await _walk(sm, depth + 1)

    await asyncio.gather(*[_walk(u, 1) for u in sitemap_urls])
    return found_urls


# -----------------------------
# Fetching, extraction, persistence
# -----------------------------


def _ensure_dirs(out_dir: Path, product: str) -> Tuple[Path, Path, Path]:
    raw_dir = out_dir / "raw" / product
    md_dir = out_dir / "md" / product
    meta_dir = out_dir / "meta"
    raw_dir.mkdir(parents=True, exist_ok=True)
    md_dir.mkdir(parents=True, exist_ok=True)
    meta_dir.mkdir(parents=True, exist_ok=True)
    return raw_dir, md_dir, meta_dir


def _read_existing_meta(meta_path: Path) -> Tuple[Set[str], Dict[str, Dict[str, Any]]]:
    seen_urls: Set[str] = set()
    url_to_record: Dict[str, Dict[str, Any]] = {}
    if meta_path.exists():
        with meta_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                url = rec.get("url")
                status = int(rec.get("status", 0))
                if url and status == 200:
                    n = normalize_url(url)
                    seen_urls.add(n)
                    url_to_record[n] = rec
                # Track canonical URLs as well to dedup downstream
                c = rec.get("canonical_url")
                if c:
                    seen_urls.add(normalize_url(c))
    return seen_urls, url_to_record


def _estimate_tokens(markdown: str) -> int:
    # Heuristic: ~1 token per 4 chars or number of words, whichever larger
    by_chars = max(1, len(markdown) // 4)
    by_words = max(1, len(re.findall(r"\w+", markdown)))
    return max(by_chars, by_words)


async def _fetch_with_retries(
    client: httpx.AsyncClient,
    url: str,
    domain_sem: asyncio.Semaphore,
    rate_limiter: RateLimiter,
    timeout: float,
    max_attempts: int = 3,
) -> Tuple[int, Optional[str], Optional[str], float, Optional[str]]:
    """Return (status, final_url, html_text, elapsed_ms, error)."""

    error: Optional[str] = None
    final_url: Optional[str] = None
    html: Optional[str] = None
    start = time.perf_counter()
    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        await rate_limiter.wait()
        async with domain_sem:
            try:
                resp = await client.get(url, headers={"User-Agent": UserAgent}, timeout=timeout, follow_redirects=True)
                final_url = str(resp.url)
                status = resp.status_code
                if status in (429, 503):
                    # apply retry-after if present
                    ra = resp.headers.get("Retry-After")
                    if ra:
                        try:
                            delay = float(ra)
                        except ValueError:
                            delay = 0.0
                        rate_limiter.push_delay(delay)
                    # Backoff and retry
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                    continue
                if 200 <= status < 300:
                    html = resp.text
                    elapsed_ms = (time.perf_counter() - start) * 1000
                    return status, final_url, html, elapsed_ms, None
                if 500 <= status < 600:
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                    continue
                # Non-retryable status
                elapsed_ms = (time.perf_counter() - start) * 1000
                return status, final_url, None, elapsed_ms, f"http_status_{status}"
            except httpx.RequestError as exc:
                error = f"request_error: {exc.__class__.__name__}"
                await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
            except Exception as exc:  # pragma: no cover - unexpected
                error = f"unexpected_error: {exc.__class__.__name__}"
                await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
    elapsed_ms = (time.perf_counter() - start) * 1000
    return 0, final_url, html, elapsed_ms, error or "max_retries_exceeded"


async def process_product(
    client: httpx.AsyncClient,
    out_dir: Path,
    product: SourceDomain,
    timeout: float,
    concurrency: int,
    max_urls: int,
    resume: bool,
    dry_run: bool,
) -> None:
    raw_dir, md_dir, meta_dir = _ensure_dirs(out_dir, product.product)
    meta_path = meta_dir / f"{product.product}.jsonl"

    # Discover URLs via sitemaps
    discovered = await discover_urls_via_sitemaps(client, product.sitemap_urls, timeout)
    # Load manual URLs
    if product.manual_urls_file and os.path.exists(product.manual_urls_file):
        with open(product.manual_urls_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                discovered.add(line)

    # Normalize & filter
    urls = []
    seen_norm: Set[str] = set()
    for u in discovered:
        n = normalize_url(u)
        if n in seen_norm:
            continue
        if not is_allowed(n, product.allow, product.deny):
            continue
        seen_norm.add(n)
        urls.append(n)

    if max_urls > 0:
        urls = urls[:max_urls]

    if dry_run:
        for u in urls:
            print(f"[{product.product}] {u}")
        return

    # Resumability: read existing successful URLs
    seen_success, url_to_record = _read_existing_meta(meta_path)

    # Rate limiters and robots per domain
    per_domain_sem: Dict[str, asyncio.Semaphore] = {}
    per_domain_rl: Dict[str, RateLimiter] = {}
    robots_cache = RobotsCache()

    def get_sem(url: str) -> asyncio.Semaphore:
        k = domain_key(url)
        if k not in per_domain_sem:
            # One at a time per domain for politeness
            per_domain_sem[k] = asyncio.Semaphore(1)
        return per_domain_sem[k]

    def get_rl(url: str) -> RateLimiter:
        k = domain_key(url)
        if k not in per_domain_rl:
            per_domain_rl[k] = RateLimiter(max(0.001, product.rate_limit_rps))
        return per_domain_rl[k]

    # Canonical dedup within this run and across previous runs
    seen_canonical: Set[str] = set()
    seen_canonical.update({normalize_url(u) for u in seen_success})

    total = 0
    successes = 0

    meta_fh = meta_path.open("a", encoding="utf-8")
    meta_fh.flush()

    overall_sem = asyncio.Semaphore(concurrency)

    async def worker(u: str) -> None:
        nonlocal successes, total
        total += 1
        # Resume skip by URL existence
        if resume and normalize_url(u) in seen_success:
            logging.info("product=%s status=%s size=%s ms=%s url=%s", product.product, "skip-resume", "-", "-", u)
            return

        # Robots check
        rp = await robots_cache.get(client, u)
        try:
            can = rp.can_fetch(UserAgent, u)  # type: ignore[attr-defined]
        except Exception:
            can = True
        if not can:
            record = {
                "url": u,
                "status": 0,
                "final_url": None,
                "canonical_url": None,
                "title": "",
                "product": product.product,
                "version": product.version_label,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "hash_html": None,
                "hash_md": None,
                "path_html": None,
                "path_md": None,
                "content_tokens_est": 0,
                "error": "robots-disallow",
            }
            meta_fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            meta_fh.flush()
            logging.info("product=%s status=%s size=%s ms=%s url=%s", product.product, 0, "-", "-", u)
            return

        async with overall_sem:
            status, final_url, html, elapsed_ms, error = await _fetch_with_retries(
                client, u, get_sem(u), get_rl(u), timeout
            )
        size = len(html.encode("utf-8")) if html else 0

        if status != 200 or not html:
            record = {
                "url": u,
                "status": status,
                "final_url": final_url,
                "canonical_url": None,
                "title": "",
                "product": product.product,
                "version": product.version_label,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "hash_html": None,
                "hash_md": None,
                "path_html": None,
                "path_md": None,
                "content_tokens_est": 0,
                "error": error,
            }
            meta_fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            meta_fh.flush()
            logging.info(
                "product=%s status=%s size=%d ms=%.0f url=%s",
                product.product,
                status,
                size,
                elapsed_ms,
                u,
            )
            return

        # Dedup by canonical URL if present
        canonical = canonicalize(final_url or u, html)
        if canonical and normalize_url(canonical) in seen_canonical:
            logging.info(
                "product=%s status=%s size=%d ms=%.0f url=%s",
                product.product,
                "skip-canonical-dupe",
                size,
                elapsed_ms,
                u,
            )
            return

        # Extract Markdown and title
        markdown, title = extract_markdown(html, final_url or u)

        # Heuristic: skip index-only pages (few words, many links)
        if markdown:
            words = len(re.findall(r"\w+", markdown))
            links = markdown.count("[")
            if words < 60 and links > 10:
                logging.info(
                    "product=%s status=%s size=%d ms=%.0f url=%s",
                    product.product,
                    "skip-index-like",
                    size,
                    elapsed_ms,
                    u,
                )
                return

        html_bytes = html.encode("utf-8")
        md_text = markdown or ""

        hash_html = sha256(html_bytes).hexdigest()
        hash_md = sha256(md_text.encode("utf-8")).hexdigest()

        html_path_rel = f"raw/{product.product}/{hash_html}.html"
        md_path_rel = f"md/{product.product}/{hash_md}.md"
        html_path = (out_dir / html_path_rel)
        md_path = (out_dir / md_path_rel)

        # If resume and content is identical (file exists), skip writing
        if resume and html_path.exists() and md_path.exists():
            logging.info(
                "product=%s status=%s size=%d ms=%.0f url=%s",
                product.product,
                "skip-existing",
                size,
                elapsed_ms,
                u,
            )
        else:
            html_path.write_bytes(html_bytes)
            md_path.write_text(md_text, encoding="utf-8")

        record = {
            "url": u,
            "status": 200,
            "final_url": final_url,
            "canonical_url": canonical,
            "title": title,
            "product": product.product,
            "version": product.version_label,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "hash_html": hash_html,
            "hash_md": hash_md,
            "path_html": html_path_rel,
            "path_md": md_path_rel,
            "content_tokens_est": _estimate_tokens(md_text),
        }
        meta_fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        meta_fh.flush()
        successes += 1
        if canonical:
            seen_canonical.add(normalize_url(canonical))
        logging.info(
            "product=%s status=%s size=%d ms=%.0f url=%s",
            product.product,
            200,
            size,
            elapsed_ms,
            u,
        )

    # Launch workers
    tasks = [asyncio.create_task(worker(u)) for u in urls]
    # Run with backpressure using overall_sem inside worker
    if tasks:
        await asyncio.gather(*tasks)

    meta_fh.close()
    logging.info(
        "product=%s status=summary total=%d success=%d", product.product, total, successes
    )


# -----------------------------
# Main entrypoint
# -----------------------------


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sitemap + Scraper collector for RAG")
    parser.add_argument(
        "--sources",
        type=str,
        default="configs/sources.yaml",
        help="Path to sources.yaml (default: configs/sources.yaml)",
    )
    parser.add_argument("--out", type=str, default=".cache", help="Output directory (default: .cache)")
    parser.add_argument(
        "--product",
        type=str,
        default="all",
        help="Product to crawl (e.g., snowflake|dbt|tableau|all)",
    )
    parser.add_argument("--max-urls", type=int, default=0, help="Max URLs per product (0 = no limit)")
    parser.add_argument("--timeout", type=float, default=20.0, help="Request timeout in seconds")
    parser.add_argument("--concurrency", type=int, default=8, help="Concurrent workers")
    parser.add_argument("--resume", action="store_true", help="Skip URLs already processed successfully")
    parser.add_argument("--dry-run", action="store_true", help="List URLs only; do not fetch")
    return parser.parse_args(argv)


async def amain(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        stream=sys.stdout,
        force=True,
    )

    sources = load_sources(args.sources)
    products = [s.product for s in sources]

    if args.product != "all":
        target = args.product.strip().lower()
        sources = [s for s in sources if s.product.lower() == target]
        if not sources:
            raise SystemExit(f"Product '{args.product}' not found in sources: {products}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    timeout = httpx.Timeout(args.timeout)
    async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": UserAgent}) as client:
        for src in sources:
            await process_product(
                client=client,
                out_dir=out_dir,
                product=src,
                timeout=args.timeout,
                concurrency=args.concurrency,
                max_urls=args.max_urls,
                resume=bool(args.resume),
                dry_run=bool(args.dry_run),
            )


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(amain(args))
    except KeyboardInterrupt:  # pragma: no cover - interactive scenario
        pass


if __name__ == "__main__":
    main()
