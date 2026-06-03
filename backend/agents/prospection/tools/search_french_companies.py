from langchain.tools import tool

META = {
    "name": "search_french_companies",
    "label": "Registre SIRENE",
    "icon": "building",
    "description": "Recherche des entreprises françaises dans le registre officiel SIRENE (data.gouv.fr). Retourne le nom, le numéro SIREN, la localisation et les dirigeants.",
    "input_label": "Requête",
    "input_example": "agences web Paris",
    "source": "API data.gouv.fr",
}


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
