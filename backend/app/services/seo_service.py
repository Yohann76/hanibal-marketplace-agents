import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse


async def fetch_url_content(url: str) -> str:
    parsed = urlparse(url)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; SEO-Analyzer/1.0)"})
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    base_host = parsed.netloc

    title = soup.find("title")
    title_text = title.get_text(strip=True) if title else ""

    def meta(name=None, prop=None):
        if name:
            tag = soup.find("meta", attrs={"name": name})
        else:
            tag = soup.find("meta", attrs={"property": prop})
        return tag["content"] if tag and tag.get("content") else ""

    canonical_tag = soup.find("link", attrs={"rel": "canonical"})
    canonical = canonical_tag["href"] if canonical_tag else ""

    h1s = [t.get_text(strip=True) for t in soup.find_all("h1")]
    h2s = [t.get_text(strip=True) for t in soup.find_all("h2")]
    h3s = [t.get_text(strip=True) for t in soup.find_all("h3")]

    images = soup.find_all("img")
    images_total = len(images)
    images_no_alt = sum(1 for img in images if not img.get("alt"))

    links = soup.find_all("a", href=True)
    internal, external = 0, 0
    for link in links:
        href = link["href"]
        if href.startswith("#") or href.startswith("javascript:"):
            continue
        link_host = urlparse(href).netloc
        if not link_host or link_host == base_host:
            internal += 1
        else:
            external += 1

    def trunc(items, n=3):
        return ", ".join(f'"{s[:60]}"' for s in items[:n]) if items else "(none)"

    lines = [
        f"URL: {url}",
        f"HTTP status: {resp.status_code}",
        "",
        "=== TAGS ===",
        f'Title: "{title_text}" ({len(title_text)} chars)',
        f'Meta description: "{meta(name="description")}" ({len(meta(name="description"))} chars)',
        f'Meta robots: "{meta(name="robots")}"',
        f'Canonical: "{canonical}"',
        f'OG Title: "{meta(prop="og:title")}"',
        f'OG Description: "{meta(prop="og:description")}"',
        "",
        "=== HEADING STRUCTURE ===",
        f"H1 ({len(h1s)}): {trunc(h1s)}",
        f"H2 ({len(h2s)}): {trunc(h2s, 5)}",
        f"H3 ({len(h3s)}): {trunc(h3s, 5)}",
        "",
        "=== IMAGES ===",
        f"Total: {images_total}",
        f"Missing alt: {images_no_alt}",
        "",
        "=== LINKS ===",
        f"Internal: {internal}",
        f"External: {external}",
    ]
    return "\n".join(lines)
