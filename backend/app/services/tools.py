import httpx
from bs4 import BeautifulSoup
from langchain.tools import tool
from app.config import TAVILY_API_KEY


@tool
def web_search(query: str) -> str:
    """Search the web for current information. Use for recent news, facts, or anything requiring up-to-date data."""
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(query, max_results=6, search_depth="basic")
        results = response.get("results", [])
        if not results:
            return "No results found."
        return "\n\n".join(
            f"**{r['title']}**\n{r.get('content', '')}\nSource: {r['url']}"
            for r in results
        )
    except Exception as e:
        return f"Search failed: {e}"


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
        # Truncate to avoid token overflow
        return text[:6000] if len(text) > 6000 else text
    except Exception as e:
        return f"Failed to fetch URL: {e}"


@tool
def search_french_companies(query: str) -> str:
    """Search for French companies in the official SIRENE registry. Returns company name, SIREN, location and directors."""
    try:
        import httpx
        from urllib.parse import quote
        url = f"https://recherche-entreprises.api.gouv.fr/search?q={quote(query)}&per_page=10"
        resp = httpx.get(url, timeout=10, headers={"User-Agent": "OC-Agents/1.0"})
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return f"No companies found for: {query}"
        lines = [f"Found {data.get('total_results', 0)} companies for '{query}':\n"]
        for e in results:
            dirigeants = e.get("dirigeants", [])
            dirs = ", ".join(
                f"{d.get('prenom', '')} {d.get('nom', '')}".strip()
                for d in dirigeants[:2]
            )
            lines.append(
                f"- **{e.get('nom_complet', '')}** (SIREN: {e.get('siren', '')})\n"
                f"  Activity: {e.get('activite_principale', '')} | "
                f"Location: {e.get('code_postal', '')} {e.get('commune', '')}\n"
                f"  Directors: {dirs or 'N/A'}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Company search failed: {e}"


TOOLS_REGISTRY: dict = {
    "web_search": web_search,
    "fetch_webpage": fetch_webpage,
    "search_french_companies": search_french_companies,
}

TOOLS_META: dict = {
    "web_search": {
        "name": "web_search",
        "label": "Recherche web",
        "icon": "search",
        "description": "Recherche des informations récentes sur le web via Tavily, une API de recherche conçue pour les agents IA. Retourne des extraits propres et factuels, sans rate limit.",
        "input_label": "Requête",
        "input_example": "startups fintech à Lyon 2024",
        "source": "Tavily AI Search",
    },
    "fetch_webpage": {
        "name": "fetch_webpage",
        "label": "Lecture de page web",
        "icon": "globe",
        "description": "Extrait et lit le contenu textuel d'une page web à partir de son URL. Permet à l'agent d'accéder à des articles, de la documentation ou tout contenu en ligne.",
        "input_label": "URL",
        "input_example": "https://example.com/article",
        "source": "HTTP direct",
    },
    "search_french_companies": {
        "name": "search_french_companies",
        "label": "Registre SIRENE",
        "icon": "building",
        "description": "Recherche des entreprises françaises dans le registre officiel SIRENE (data.gouv.fr). Retourne le nom, le numéro SIREN, la localisation et les dirigeants.",
        "input_label": "Requête",
        "input_example": "agences web Paris",
        "source": "API data.gouv.fr",
    },
}


def get_tools(tool_names: list[str]) -> list:
    return [TOOLS_REGISTRY[name] for name in tool_names if name in TOOLS_REGISTRY]


def get_tools_info(tool_names: list[str]) -> list[dict]:
    return [TOOLS_META[name] for name in tool_names if name in TOOLS_META]
