"""URL utilities for the ingestion pipeline.

This module provides helpers for normalizing and canonicalizing URLs, building
path-safe names derived from URLs, and filtering by allow/deny globs.

All functions are typed and designed to be stable, deterministic, and
side-effect free.
"""

from __future__ import annotations

from hashlib import sha256
from typing import Iterable, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import fnmatch


_TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gclid",
    "fbclid",
    "msclkid",
    "mc_cid",
    "mc_eid",
}


def _strip_default_port(scheme: str, netloc: str) -> str:
    if ":" not in netloc:
        return netloc
    host, port = netloc.rsplit(":", 1)
    if (scheme == "http" and port == "80") or (scheme == "https" and port == "443"):
        return host
    return netloc


def normalize_url(url: str) -> str:
    """Normalize a URL for comparison and deduplication.

    Operations:
    - Lowercase scheme and netloc
    - Remove URL fragment (everything after '#')
    - Remove default ports (:80, :443)
    - Remove tracking query params (utm_*, gclid, fbclid, etc)
    - Sort remaining query parameters for stable ordering
    - Remove trailing slash from path (except root)
    """

    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    netloc = _strip_default_port(scheme, parts.netloc.lower())
    path = parts.path or "/"

    # Normalize path: collapse trailing slash (except for root)
    if path != "/" and path.endswith("/"):
        path = path[:-1]

    # Remove tracking parameters
    query_items = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in _TRACKING_PARAMS and not k.startswith("utm_")]
    # Sort for stable canonical representation
    query_items.sort()
    query = urlencode(query_items)

    normalized = urlunsplit((scheme, netloc, path, query, ""))
    return normalized


def canonicalize(url: str, html: str) -> Optional[str]:
    """Extract canonical URL from HTML if present.

    Returns a normalized absolute URL or None if not found.
    """

    try:
        from bs4 import BeautifulSoup  # Imported lazily to avoid heavy import cost
    except Exception:
        return None

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return None

    # Prefer <link rel="canonical" href="...">
    link = soup.find("link", rel=lambda v: v and "canonical" in str(v).lower())
    href = link.get("href") if link else None
    if not href:
        # Fallback to og:url
        og = soup.find("meta", property="og:url") or soup.find("meta", attrs={"name": "og:url"})
        href = og.get("content") if og and og.has_attr("content") else None
    if not href:
        return None

    abs_url = urljoin(url, href)
    return normalize_url(abs_url)


def is_allowed(url: str, allow_globs: Iterable[str], deny_globs: Optional[Iterable[str]] = None) -> bool:
    """Check allow/deny glob patterns against normalized URL.

    - URL must match at least one allow glob
    - URL must NOT match any deny glob
    """

    nurl = normalize_url(url)
    allowed = False
    for pat in allow_globs:
        if fnmatch.fnmatchcase(nurl, pat):
            allowed = True
            break
    if not allowed:
        return False

    if deny_globs:
        for pat in deny_globs:
            if fnmatch.fnmatchcase(nurl, pat):
                return False
    return True


def safe_name(url: str) -> str:
    """Generate a path-safe short filename for a URL.

    Format: "<sha256[:12]>-<short-slug>"
    The slug is derived from the last path segment, lowercased and sanitized.
    """

    digest = sha256(url.encode("utf-8")).hexdigest()[:12]
    parts = urlsplit(url)
    last_segment = parts.path.rsplit("/", 1)[-1] or parts.netloc
    slug_chars = []
    for ch in last_segment.lower():
        if ch.isalnum():
            slug_chars.append(ch)
        elif ch in {"-", "_", "."}:
            slug_chars.append(ch)
        else:
            slug_chars.append("-")
    slug = "".join(slug_chars).strip("-_.")
    if not slug:
        slug = parts.netloc.replace(".", "-")
    if len(slug) > 30:
        slug = slug[:30]
    return f"{digest}-{slug}"


def domain_key(url: str) -> str:
    """Return a key for per-domain rate limiting and robots lookup.

    Lowercased hostname without "www." and without port.
    """

    parts = urlsplit(url)
    netloc = parts.netloc.lower()
    if ":" in netloc:
        netloc = netloc.split(":", 1)[0]
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


