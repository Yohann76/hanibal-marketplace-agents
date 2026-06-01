from langchain.tools import tool

META = {
    "name": "fetch_webpage",
    "label": "Lecture de page web",
    "icon": "globe",
    "description": "Extrait et lit le contenu textuel d'une page web à partir de son URL. Permet à l'agent d'accéder à des articles, de la documentation ou tout contenu en ligne.",
    "input_label": "URL",
    "input_example": "https://example.com/article",
    "source": "HTTP direct",
}


@tool
def fetch_webpage(url: str) -> str:
    """Fetch and extract the readable text content of a webpage. Use to read articles, documentation or any URL."""
    try:
        import httpx
        from bs4 import BeautifulSoup
        resp = httpx.get(url, timeout=10, follow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; OC-Agent/1.0)"})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text[:6000] if len(text) > 6000 else text
    except Exception as e:
        return f"Failed to fetch URL: {e}"
