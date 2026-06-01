import httpx
from urllib.parse import quote


async def search_entreprises(query: str) -> str:
    url = f"https://recherche-entreprises.api.gouv.fr/search?q={quote(query)}&per_page=10"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers={"User-Agent": "OC-Agents/1.0"})
        resp.raise_for_status()

    data = resp.json()
    results = data.get("results", [])
    total = data.get("total_results", 0)

    if not results:
        return (
            f'No companies found for: "{query}"\n\n'
            "Suggestions:\n"
            "- Try broader terms\n"
            "- Specify a city or region\n"
            "- Use a sector name"
        )

    lines = [
        "Source: API Annuaire des Entreprises (data.gouv.fr / SIRENE)",
        f'Search: "{query}"',
        f"Total results: {total} (showing first 10)",
        "",
    ]

    for i, e in enumerate(results, 1):
        lines.append(f"=== Company {i} ===")
        lines.append(f"Name         : {e.get('nom_complet', '')}")
        lines.append(f"SIREN        : {e.get('siren', '')}")
        lines.append(f"Activity (NAF): {e.get('activite_principale', '')}")
        lines.append(f"Location     : {e.get('code_postal', '')} {e.get('commune', '')}")
        if e.get("date_creation"):
            lines.append(f"Created      : {e['date_creation']}")
        if e.get("nature_juridique"):
            lines.append(f"Legal form   : {e['nature_juridique']}")
        dirigeants = e.get("dirigeants", [])
        if dirigeants:
            lines.append("Directors    :")
            for d in dirigeants:
                name = f"{d.get('prenom', '')} {d.get('nom', '')}".strip()
                qualite = d.get("qualite", "")
                lines.append(f"  • {name}{' — ' + qualite if qualite else ''}")
        else:
            lines.append("Directors    : not available")
        lines.append("")

    return "\n".join(lines)
