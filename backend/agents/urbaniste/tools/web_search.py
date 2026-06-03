from langchain.tools import tool
from app.config import TAVILY_API_KEY

META = {
    "name": "web_search",
    "label": "Recherche web",
    "icon": "search",
    "description": "Recherche des informations récentes sur le web via Tavily, une API de recherche conçue pour les agents IA. Retourne des extraits propres et factuels, sans rate limit.",
    "input_label": "Requête",
    "input_example": "startups fintech à Lyon 2024",
    "source": "Tavily AI Search",
}


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
