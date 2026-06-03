from langchain.tools import tool
from app.config import TAVILY_API_KEY

META = {
    "name": "linkedin_search",
    "label": "Recherche LinkedIn",
    "icon": "contact",
    "description": "Recherche des profils LinkedIn (décideurs, dirigeants) et des pages entreprises via Tavily ciblé sur linkedin.com. Utile pour identifier les contacts clés d'une entreprise ou les acteurs d'un secteur.",
    "input_label": "Requête",
    "input_example": "directeur commercial agence web Paris",
    "source": "LinkedIn via Tavily",
}


@tool
def linkedin_search(query: str) -> str:
    """Search LinkedIn profiles (people) and company pages via Tavily. Use to find decision-makers, directors or key contacts at target companies. Input can be a job title + company, a sector + city, or a person's name."""
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)

        # Deux passes : profils personnes + pages entreprises
        results_people = client.search(
            f"site:linkedin.com/in {query}",
            max_results=4,
            search_depth="basic",
        ).get("results", [])

        results_companies = client.search(
            f"site:linkedin.com/company {query}",
            max_results=3,
            search_depth="basic",
        ).get("results", [])

        if not results_people and not results_companies:
            return f"Aucun profil LinkedIn trouvé pour : {query}"

        lines = []

        if results_people:
            lines.append("**👤 Profils LinkedIn (personnes)**\n")
            for r in results_people:
                title = r.get("title", "").replace(" | LinkedIn", "").replace(" - LinkedIn", "").strip()
                url = r.get("url", "")
                snippet = r.get("content", "")[:160].strip()
                lines.append(f"• **{title}**\n  {snippet}\n  🔗 {url}")

        if results_companies:
            lines.append("\n**🏢 Pages LinkedIn (entreprises)**\n")
            for r in results_companies:
                title = r.get("title", "").replace(" | LinkedIn", "").replace(" - LinkedIn", "").strip()
                url = r.get("url", "")
                snippet = r.get("content", "")[:160].strip()
                lines.append(f"• **{title}**\n  {snippet}\n  🔗 {url}")

        return "\n\n".join(lines)

    except Exception as e:
        return f"Recherche LinkedIn échouée : {e}"
