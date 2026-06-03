from langchain.tools import tool

META = {
    "name": "geocode_address",
    "label": "Géocodage adresse",
    "icon": "globe",
    "description": "Convertit une adresse française en coordonnées GPS (latitude/longitude) et retourne le code INSEE de la commune, le code postal, le département et l'identifiant BAN. Première étape obligatoire pour tout diagnostic urbain.",
    "input_label": "Adresse",
    "input_example": "10 rue de Rivoli 75004 Paris",
    "source": "API Adresse — data.gouv.fr",
}


@tool
def geocode_address(address: str) -> str:
    """Geocode a French address to GPS coordinates and return INSEE code, city, postal code and BAN identifier. Required first step before any other urban analysis tool."""
    try:
        import httpx

        resp = httpx.get(
            "https://api-adresse.data.gouv.fr/search/",
            params={"q": address, "limit": 1},
            timeout=10,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])

        if not features:
            return f"Adresse introuvable : {address}"

        feat = features[0]
        props = feat["properties"]
        lon, lat = feat["geometry"]["coordinates"]

        dep = props.get("context", "").split(",")[0].strip()

        return (
            f"📍 **Adresse normalisée** : {props.get('label')}\n"
            f"🗺  Coordonnées : lat={lat:.6f}, lon={lon:.6f}\n"
            f"🏛  Commune : {props.get('city')} ({props.get('citycode')}) — CP {props.get('postcode')}\n"
            f"🗂  Département : {dep}\n"
            f"🔑 Code INSEE : {props.get('citycode')}\n"
            f"🆔 ID BAN : {props.get('id')}\n"
            f"📌 Type : {props.get('type')} | Score fiabilité : {props.get('score', 0):.0%}"
        )

    except Exception as e:
        return f"Erreur géocodage : {e}"
