from langchain.tools import tool

META = {
    "name": "extract_html",
    "label": "Extraction HTML SEO",
    "icon": "code",
    "description": "Extrait les données SEO structurées d'une page web : balises titre, meta, Open Graph, hiérarchie Hn, images, liens internes/externes et code HTTP.",
    "input_label": "URL",
    "input_example": "https://example.com",
    "source": "HTTP direct",
}


@tool
def extract_html(url: str) -> str:
    """Extract structured SEO data from a webpage: HTTP status, title, meta tags, Open Graph, heading structure, images alt coverage, internal/external links."""
    try:
        import httpx
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse, urljoin

        resp = httpx.get(
            url, timeout=15, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SEO-Analyzer/1.0)"},
        )
        status = resp.status_code
        soup = BeautifulSoup(resp.text, "html.parser")
        base_host = urlparse(url).netloc

        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""

        def meta(name=None, prop=None):
            if name:
                tag = soup.find("meta", attrs={"name": name})
            else:
                tag = soup.find("meta", attrs={"property": prop})
            return tag["content"].strip() if tag and tag.get("content") else ""

        canonical_tag = soup.find("link", rel="canonical")
        canonical = canonical_tag["href"] if canonical_tag and canonical_tag.get("href") else ""

        h1s = [t.get_text(strip=True) for t in soup.find_all("h1")]
        h2s = [t.get_text(strip=True) for t in soup.find_all("h2")]
        h3s = [t.get_text(strip=True) for t in soup.find_all("h3")]

        imgs = soup.find_all("img")
        imgs_no_alt = sum(1 for i in imgs if not i.get("alt", "").strip())

        links_int, links_ext = 0, 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("#") or href.startswith("javascript:"):
                continue
            abs_href = urljoin(url, href)
            host = urlparse(abs_href).netloc
            if host == base_host or not host:
                links_int += 1
            else:
                links_ext += 1

        def trunc(items, n=3, max_len=70):
            out = []
            for s in items[:n]:
                out.append(s[:max_len] + "…" if len(s) > max_len else s)
            return ", ".join(f'"{x}"' for x in out) if out else "(aucun)"

        lines = [
            f"URL : {url}",
            f"Code HTTP : {status}",
            "",
            "=== BALISES ===",
            f"Title : {title!r} ({len(title)} car.)",
            f"Meta description : {meta(name='description')!r} ({len(meta(name='description'))} car.)",
            f"Meta robots : {meta(name='robots')!r}",
            f"Canonical : {canonical!r}",
            f"OG Title : {meta(prop='og:title')!r}",
            f"OG Description : {meta(prop='og:description')!r}",
            "",
            "=== TITRES ===",
            f"H1 ({len(h1s)}) : {trunc(h1s)}",
            f"H2 ({len(h2s)}) : {trunc(h2s, 5)}",
            f"H3 ({len(h3s)}) : {trunc(h3s, 5)}",
            "",
            "=== IMAGES ===",
            f"Total : {len(imgs)} — Sans alt : {imgs_no_alt}",
            "",
            "=== LIENS ===",
            f"Internes : {links_int} — Externes : {links_ext}",
        ]
        return "\n".join(lines)

    except Exception as e:
        return f"Erreur lors de l'extraction : {e}"
