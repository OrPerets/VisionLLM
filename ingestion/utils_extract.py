"""Content extraction helpers for the ingestion pipeline.

Strategy:
- Prefer trafilatura to extract high-quality Markdown with tables and code.
- Fallback to readability-lxml to get a clean HTML subtree, then convert to
  Markdown via markdownify.
- Post-process Markdown for cleanliness: collapse extra blank lines and trim.
"""

from __future__ import annotations

from typing import Tuple


def _postprocess_markdown(markdown: str) -> str:
    # Normalize newlines and collapse >2 blank lines into max 2
    lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cleaned_lines: list[str] = []
    blank_run = 0
    for line in lines:
        if line.strip() == "":
            blank_run += 1
            if blank_run <= 2:
                cleaned_lines.append("")
        else:
            blank_run = 0
            cleaned_lines.append(line.rstrip())
    # Trim leading and trailing blank lines
    while cleaned_lines and cleaned_lines[0] == "":
        cleaned_lines.pop(0)
    while cleaned_lines and cleaned_lines[-1] == "":
        cleaned_lines.pop()
    return "\n".join(cleaned_lines).strip()


def extract_markdown(html: str, url: str) -> Tuple[str, str]:
    """Extract Markdown and title from raw HTML.

    Returns a tuple of (markdown, title).
    """

    title: str = ""
    md: str | None = None

    # Attempt trafilatura first
    try:
        import trafilatura

        tr_opts = trafilatura.settings.use_config()
        # Be explicit about what we want to keep; trafilatura already removes nav/ads
        md = trafilatura.extract(
            html,
            url=url,
            output_format="markdown",
            include_comments=False,
            include_tables=True,
            include_images=False,
            config=tr_opts,
        )
        try:
            title = trafilatura.extract_metadata(html, url=url).title or ""
        except Exception:
            # Metadata extraction can fail independently
            pass
    except Exception:
        md = None

    # Fallback to readability + markdownify if needed
    if not md:
        try:
            from bs4 import BeautifulSoup
            from readability import Document
            from markdownify import markdownify as md_convert

            doc = Document(html)
            title = doc.short_title() or title
            content_html = doc.summary(html_partial=True)

            soup = BeautifulSoup(content_html, "lxml")
            # Remove likely non-content elements
            for tag in soup(["script", "style", "noscript", "header", "footer", "form", "nav", "aside"]):
                tag.decompose()
            # Remove common on-page navigation blocks
            for bad in soup.select('[role="navigation"], .toc, .table-of-contents, .on-this-page'):
                bad.decompose()

            md = md_convert(
                str(soup),
                heading_style="ATX",
                strip="script,style",
                code_friendly=True,
                bullets="-",
            )
        except Exception:
            md = None

    if md is None:
        # As a last resort, return minimal content with title if possible
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html, "lxml")
            title = title or (soup.title.string.strip() if soup.title and soup.title.string else "")
        except Exception:
            pass
        return ("", title)

    return (_postprocess_markdown(md), title)


