from langchain.tools import tool

META = {
    "name": "cadastre_parcelle",
    "label": "Cadastre parcelle",
    "icon": "code",
    "description": "Retrouve les informations cadastrales d'une parcelle à partir de coordonnées GPS ou d'un code INSEE : numéro IDU, section, numéro de parcelle, surface en m², commune. Utilise l'API APICarto de l'IGN.",
    "input_label": "lat,lon ou lat,lon,code_insee",
    "input_example": "48.8555,2.3604",
    "source": "APICarto IGN — cadastre",
}


@tool
def cadastre_parcelle(coordinates: str) -> str:
    """Look up cadastral parcel information from GPS coordinates (lat,lon) or lat,lon,code_insee. Returns parcel IDU, section, number, surface area and commune. Use coordinates obtained from geocode_address."""
    try:
        import httpx

        parts = [p.strip() for p in coordinates.split(",")]
        lat = float(parts[0])
        lon = float(parts[1])
        code_insee = parts[2] if len(parts) > 2 else None

        params: dict = {"lat": lat, "lon": lon, "_limit": 5}
        if code_insee:
            params["code_insee"] = code_insee

        resp = httpx.get(
            "https://apicarto.ign.fr/api/cadastre/parcelle",
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])

        if not features:
            return f"Aucune parcelle cadastrale trouvée pour : {coordinates}"

        lines = [f"**{len(features)} parcelle(s) cadastrale(s) trouvée(s)**\n"]
        for f in features:
            p = f["properties"]
            surface_ha = p["contenance"] / 10000
            lines.append(
                f"🏷  **IDU** : `{p['idu']}`\n"
                f"   Section : **{p['section']}** | N° parcelle : **{p['numero']}**\n"
                f"   Commune : {p['nom_com']} ({p['code_insee']})\n"
                f"   Surface : **{p['contenance']:,} m²** ({surface_ha:.4f} ha)\n"
                f"   Feuille cadastrale : {p['feuille']}"
            )

        lines.append(
            f"\n🔗 Consulter sur cadastre.gouv.fr : "
            f"https://www.cadastre.gouv.fr/scpc/rechercherPlan.do"
        )
        return "\n\n".join(lines)

    except Exception as e:
        return f"Erreur cadastre : {e}"
