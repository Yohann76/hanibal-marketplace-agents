from langchain.tools import tool

META = {
    "name": "plu_info",
    "label": "PLU / Urbanisme GPU",
    "icon": "code",
    "description": "Interroge le Géoportail National de l'Urbanisme (GPU) via APICarto IGN. Retourne le zonage PLU/PLUi/POS/CC applicable à des coordonnées GPS : type de zone (U, AU, N, A + libellé détaillé), document d'urbanisme (PLU, PLUi, Carte Communale, RNU), servitudes d'information surfaciques (DPU…), prescriptions et référence au règlement PDF.",
    "input_label": "lat,lon",
    "input_example": "49.7194,0.3324",
    "source": "APICarto IGN — GPU (Géoportail de l'Urbanisme)",
}

_DU_TYPES = {
    "PLU": "Plan Local d'Urbanisme",
    "PLUi": "Plan Local d'Urbanisme intercommunal",
    "POS": "Plan d'Occupation des Sols",
    "CC": "Carte Communale",
    "RNU": "Règlement National d'Urbanisme",
    "PSMV": "Plan de Sauvegarde et de Mise en Valeur",
    "SCOT": "Schéma de Cohérence Territoriale",
}

_ZONE_TYPES = {
    "U": "🏙️ Urbaine — constructibilité immédiate",
    "AU": "🏗️ À Urbaniser — extension future de l'urbanisation",
    "A": "🌾 Agricole — protégée, constructibilité très limitée",
    "N": "🌲 Naturelle — protégée, constructibilité très limitée",
}

_INF_TYPES = {
    "01": "Zone inondable",
    "02": "Zone de mouvement de terrain",
    "03": "Zone sismique",
    "04": "Droit de Préemption Urbain (DPU)",
    "05": "Zone d'aménagement différé (ZAD)",
    "06": "Zone d'aménagement concerté (ZAC)",
    "07": "Périmètre de sursis à statuer",
    "08": "Périmètre d'attente",
    "09": "Secteur sauvegardé / Site patrimonial",
    "10": "Plan de prévention des risques",
}


@tool
def plu_info(coordinates: str) -> str:
    """Get PLU/PLUi/POS/CC urban planning zone information for GPS coordinates using the national GPU database (all French communes). Returns zone type (U/AU/N/A), detailed label, document name, applicable regulations, surface prescriptions and information layers. Use coordinates from geocode_address."""
    try:
        import httpx, json

        parts = [p.strip() for p in coordinates.split(",")]
        lat = float(parts[0])
        lon = float(parts[1])
        geom = json.dumps({"type": "Point", "coordinates": [lon, lat]})
        params = {"geom": geom}

        def gpu_get(endpoint: str) -> list:
            r = httpx.get(
                f"https://apicarto.ign.fr/api/gpu/{endpoint}",
                params=params,
                timeout=30,
            )
            if r.status_code == 200:
                return r.json().get("features", [])
            return []

        # 1. Zone d'urbanisme
        zones = gpu_get("zone-urba")
        # 2. Document d'urbanisme
        docs = gpu_get("document")
        # 3. Informations surfaciques (DPU, SUP, etc.)
        infos = gpu_get("info-surf")
        # 4. Prescriptions surfaciques
        prescs = gpu_get("prescription-surf")

        if not zones and not docs:
            return (
                f"Aucune donnée PLU trouvée pour lat={lat}, lon={lon}.\n"
                "⚠️ La commune n'a peut-être pas encore numérisé son document d'urbanisme.\n"
                f"🔗 Vérifier sur : https://www.geoportail-urbanisme.gouv.fr/ "
                f"(coordonnées : {lat},{lon})"
            )

        lines = ["## 🏛 Zonage PLU / Document d'Urbanisme\n"]

        # Document d'urbanisme
        if docs:
            doc = docs[0]["properties"]
            du_type = doc.get("du_type", "")
            du_label = _DU_TYPES.get(du_type, du_type)
            lines.append(
                f"**Document applicable** : {doc.get('grid_title', '—')}\n"
                f"  Type : **{du_type}** — {du_label}\n"
                f"  Référence : `{doc.get('name', '—')}`\n"
                f"  Statut GPU : {doc.get('gpu_status', '—')} | Mise à jour : {str(doc.get('gpu_timestamp',''))[:10]}"
            )

        # Zone(s) d'urbanisme
        if zones:
            lines.append(f"\n**Zone(s) d'urbanisme** ({len(zones)} résultat(s)) :")
            for feat in zones:
                z = feat["properties"]
                type_zone = z.get("typezone", "")
                zone_desc = _ZONE_TYPES.get(type_zone, f"Zone {type_zone}")
                liblong = z.get("libelong") or z.get("libelle", "")
                libelle = z.get("libelle", "")

                lines.append(
                    f"\n  📌 **Zone {libelle}** — {zone_desc}\n"
                    f"     Libellé complet : {liblong or '—'}\n"
                    f"     ID zone : `{z.get('idurba', '—')}`"
                )

                # Règlement PDF
                if z.get("nomfic"):
                    lines.append(f"     📄 Règlement : `{z['nomfic']}`")
                if z.get("urlfic"):
                    lines.append(f"     🔗 {z['urlfic']}")

                # Dates
                if z.get("datappro"):
                    lines.append(f"     ✅ Date d'approbation : {z['datappro']}")
                if z.get("datvalid"):
                    lines.append(f"     ✅ Date de validité : {z['datvalid']}")

        # Informations surfaciques (DPU, servitudes…)
        if infos:
            lines.append(f"\n**Informations surfaciques** ({len(infos)}) :")
            for feat in infos:
                inf = feat["properties"]
                type_code = inf.get("typeinf", "")
                type_label = _INF_TYPES.get(type_code, f"Type {type_code}")
                libelle_inf = inf.get("libelle") or inf.get("txt", "")
                lines.append(f"  ⚖️ **{libelle_inf or type_label}** (code {type_code})")
                if inf.get("datvalid"):
                    lines.append(f"     Validité : {inf['datvalid']}")

        # Prescriptions surfaciques
        if prescs:
            lines.append(f"\n**Prescriptions surfaciques** ({len(prescs)}) :")
            for feat in prescs:
                p = feat["properties"]
                lines.append(
                    f"  📋 {p.get('libelle') or p.get('txt', '—')} "
                    f"(type {p.get('typepsc', '—')})"
                )

        # Interprétation urbanistique
        if zones:
            z0 = zones[0]["properties"]
            type_zone = z0.get("typezone", "")
            lines.append("\n**Interprétation** :")
            if type_zone == "U":
                lines.append("  ✅ Zone constructible — le droit à construire existe sous réserve du respect du règlement de zone (COS, hauteur, emprise, reculs…)")
            elif type_zone == "AU":
                lines.append("  🔶 Zone à urbaniser — constructibilité conditionnelle, souvent soumise à opération d'ensemble ou délibération municipale")
            elif type_zone == "A":
                lines.append("  🔴 Zone agricole protégée — seules les constructions nécessaires à l'exploitation agricole sont autorisées")
            elif type_zone == "N":
                lines.append("  🔴 Zone naturelle protégée — constructibilité très limitée, protection environnementale forte")

        lines.append(
            f"\n🔗 Géoportail Urbanisme : https://www.geoportail-urbanisme.gouv.fr/"
            f"#coords={lat},{lon}&zoom=18"
        )

        return "\n".join(lines)

    except Exception as e:
        return f"Erreur PLU : {e}"
