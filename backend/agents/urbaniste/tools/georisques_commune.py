from langchain.tools import tool

META = {
    "name": "georisques_commune",
    "label": "GéoRisques",
    "icon": "search",
    "description": "Interroge l'API GéoRisques (georisques.gouv.fr) pour retourner l'ensemble des risques naturels et technologiques d'une commune : inondation, séisme, mouvement de terrain, radon, risque industriel, TMD, ainsi que l'historique des catastrophes naturelles reconnues (arrêtés CatNat).",
    "input_label": "Code INSEE",
    "input_example": "75056",
    "source": "GéoRisques — georisques.gouv.fr",
}

_RISK_ICONS = {
    "inondation": "🌊",
    "séisme": "🌍",
    "mouvement": "⛰️",
    "radon": "☢️",
    "industriel": "🏭",
    "transport": "🚛",
    "foudre": "⚡",
    "neige": "❄️",
    "grêle": "🌨️",
    "tempête": "🌪️",
    "rupture": "🚧",
    "barrage": "🚧",
    "atmosphère": "🌪️",
    "sécheresse": "🌵",
}


def _risk_icon(label: str) -> str:
    label_lower = label.lower()
    for key, icon in _RISK_ICONS.items():
        if key in label_lower:
            return icon
    return "⚠️"


@tool
def georisques_commune(code_insee: str) -> str:
    """Get all natural and technological risks for a French commune using its INSEE code. Returns risk list, Cat Nat history (last 5 events), and a link to the full risk report. Use the INSEE code from geocode_address."""
    try:
        import httpx

        code_insee = code_insee.strip()

        # 1. Risques recensés
        r_risques = httpx.get(
            "https://www.georisques.gouv.fr/api/v1/gaspar/risques",
            params={"code_insee": code_insee},
            timeout=15,
        )
        r_risques.raise_for_status()
        data_risques = r_risques.json()

        commune_label = "—"
        risques = []
        if data_risques.get("data"):
            entry = data_risques["data"][0]
            commune_label = entry.get("libelle_commune", code_insee)
            risques = entry.get("risques_detail", [])

        # 2. Catastrophes naturelles (5 dernières)
        r_catnat = httpx.get(
            "https://www.georisques.gouv.fr/api/v1/gaspar/catnat",
            params={"code_insee": code_insee, "page": 1, "page_size": 5},
            timeout=15,
        )
        r_catnat.raise_for_status()
        catnats = r_catnat.json().get("data", [])
        total_catnat = r_catnat.json().get("results", 0)

        lines = [f"## 🗺 Risques — {commune_label} (INSEE : {code_insee})\n"]

        # Risques
        if risques:
            lines.append(f"**{len(risques)} risque(s) recensé(s)** :")
            for r in risques:
                label = r.get("libelle_risque_long", "")
                icon = _risk_icon(label)
                zone = f" | Zone sismique : {r['zone_sismicite']}" if r.get("zone_sismicite") else ""
                lines.append(f"  {icon} {label}{zone}")
        else:
            lines.append("✅ Aucun risque majeur recensé dans la base GASPAR.")

        # Cat Nat
        lines.append(f"\n**Catastrophes naturelles reconnues** : {total_catnat} arrêté(s) CatNat au total")
        if catnats:
            lines.append("*5 plus récents :*")
            for c in catnats:
                lines.append(
                    f"  📋 {c.get('libelle_risque_jo')} — "
                    f"du {c.get('date_debut_evt')} au {c.get('date_fin_evt')} "
                    f"(JO : {c.get('date_publication_jo')})"
                )

        lines.append(
            f"\n🔗 Rapport complet : https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi"
        )
        lines.append(
            f"🔗 ERIAL (état des risques) : https://erp.georisques.gouv.fr/"
        )

        return "\n".join(lines)

    except Exception as e:
        return f"Erreur GéoRisques : {e}"
