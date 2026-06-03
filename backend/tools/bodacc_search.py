from langchain.tools import tool

META = {
    "name": "bodacc_search",
    "label": "Annonces BODACC",
    "icon": "building",
    "description": "Interroge le Bulletin Officiel des Annonces Civiles et Commerciales (BODACC) via l'API OpenDataSoft. Retourne les annonces légales récentes : créations d'entreprises, modifications, dépôts de comptes, procédures collectives. Utile pour détecter des signaux d'affaires (nouveaux acteurs, changements de cap, difficultés).",
    "input_label": "Secteur et/ou ville",
    "input_example": "agence web Paris",
    "source": "BODACC / OpenDataSoft",
}

_STOP_WORDS = {"le","la","les","de","du","des","en","et","ou","à","a","au","aux","un","une","sur","pour","avec","par","dans","qui","que","est","son","sa","ses"}

_FAMILLE_LABELS = {
    "creation": "Création",
    "modification": "Modification",
    "dpc": "Dépôt de comptes",
    "vente": "Vente / Cession",
    "pc": "Procédure collective",
    "radiation": "Radiation",
}

_FAMILLE_ICONS = {
    "creation": "🟢",
    "modification": "🔵",
    "dpc": "📋",
    "vente": "🔄",
    "pc": "🔴",
    "radiation": "⚫",
}


def _build_where(query: str) -> str:
    """Chaque mot de la requête est cherché dans commercant ET ville — aucune liste de villes nécessaire."""
    mots = [m for m in query.split() if len(m) > 2 and m.lower() not in _STOP_WORDS]
    if not mots:
        return "commercant is not null"
    conditions = [f'(commercant like "%{m}%" or ville like "%{m}%")' for m in mots]
    return " and ".join(conditions)


@tool
def bodacc_search(query: str) -> str:
    """Search recent BODACC legal announcements (company creations, modifications, insolvencies) by sector and/or city. Returns the 8 most recent matching announcements with company name, type, SIREN, location and date."""
    try:
        import httpx, json

        where = _build_where(query)

        params = {
            "where": where,
            "limit": 8,
            "order_by": "dateparution desc",
        }

        resp = httpx.get(
            "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records",
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("results", [])

        if not records:
            return f"Aucune annonce BODACC trouvée pour : {query}"

        total = data.get("total_count", len(records))
        lines = [f"**{total} annonces BODACC** pour « {query} » (8 plus récentes) :\n"]

        for r in records:
            famille = r.get("familleavis", "")
            icon = _FAMILLE_ICONS.get(famille, "📄")
            type_label = r.get("familleavis_lib") or _FAMILLE_LABELS.get(famille, famille)
            nom = r.get("commercant", "—")
            ville_r = r.get("ville", "")
            cp = r.get("cp", "")
            date = r.get("dateparution", "")[:10]
            siren_list = r.get("registre", [])
            siren = siren_list[1] if len(siren_list) > 1 else (siren_list[0] if siren_list else "—")
            url = r.get("url_complete", "")

            # Extraire la forme juridique si disponible
            forme = ""
            try:
                personnes = json.loads(r.get("listepersonnes") or "{}")
                p = personnes.get("personne", {})
                forme = p.get("formeJuridique", "")
            except Exception:
                pass

            lines.append(
                f"{icon} **{nom}** — {type_label}\n"
                f"   📍 {cp} {ville_r}  |  SIREN : {siren}  |  🗓 {date}"
                + (f"  |  {forme}" if forme else "")
                + (f"\n   🔗 {url}" if url else "")
            )

        return "\n\n".join(lines)

    except Exception as e:
        return f"Erreur BODACC : {e}"
