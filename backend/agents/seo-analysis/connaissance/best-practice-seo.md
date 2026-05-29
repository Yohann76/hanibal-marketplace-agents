# Bonnes pratiques SEO — analyse d’une page (une URL)

Référentiel synthétique pour auditer **une URL** (on-page + signaux techniques visibles).  
Périmètre : ce qui est observable sur la page et dans les en-têtes HTTP. Hors scope : backlinks, historique domaine, CWV détaillés, Search Console.

---

## 1. Grille de lecture rapide

| Priorité | Thème | Impact typique |
|----------|--------|----------------|
| P0 | Indexabilité (200, pas de noindex involontaire, canonical) | Bloquant |
| P0 | Title + H1 cohérents avec l’intention | Fort |
| P1 | Meta description, canonical, hreflang si multilingue | Moyen–fort |
| P1 | Hiérarchie Hn, contenu principal au-dessus de la ligne de flottaison | Moyen |
| P2 | Images (alt, poids, format), liens internes | Moyen |
| P2 | OG/Twitter, données structurées | Moyen (partage + rich results) |
| P3 | Micro-copy, attributs title sur liens, ancres descriptives | Faible–moyen |

---

## 2. Seuils chiffrés (référence)

| Élément | Cible | Acceptable | Problème |
|---------|--------|------------|----------|
| `<title>` | 50–60 car. (≈580 px) | 30–65 | <30, >70, doublon site |
| Meta description | 140–160 car. | 120–170 | Absente OK ; >170 tronquée |
| H1 | 1 seul, 20–70 car. | 2 si legacy | 0 ou >1 sans raison |
| URL slug | Courte, mots-clés, tirets | — | Paramètres inutiles, ID seuls |
| Alt image | Descriptif, 5–125 car. | Vide si décorative (`alt=""`) | Absent sur image informative |
| Liens internes (page pilier) | ≥3 contextuels | 1–2 | 0 vers maillage |
| Taille title lien | 50 car. max utile | — | « Cliquez ici » |

*Les pixels Google varient ; privilégier la lisibilité humaine.*

---

## 3. Balises `<head>` essentielles

### Title
- **Unique** par URL ; mot-clé principal **au début** si naturel.
- Refléter le **contenu réel** (pas le branding seul).
- Éviter : keyword stuffing, ALL CAPS, duplication sur tout le site.

### Meta description
- **Incitative** : bénéfice + différenciation ; pas une liste de mots-clés.
- Peut être réécrite par Google → viser la meilleure proposition de clic possible.

### Meta robots
- `index, follow` par défaut sur pages à ranker.
- `noindex` : pages fines (filtres, recherche interne, merci, login, paginations dupliquées).
- `nofollow` : liens non approuvés (UGC non modéré) — pas sur tout le menu.

### Canonical (`link rel="canonical"`)
- **Auto-référente** sur l’URL préférée (HTTPS, avec ou sans slash — choix unique site).
- Indispensable si paramètres UTM, variantes, HTTP→HTTPS, www/non-www.
- Une seule canonical par page ; URL absolue.

### Hreflang (si multilingue / multi-pays)
- Paires réciproques ; `x-default` pour la page de choix internationale.
- Cohérent avec l’URL servie (pas de hreflang vers 404).

### Viewport & charset
- `<meta name="viewport" content="width=device-width, initial-scale=1">` pour mobile-first.

---

## 4. Structure des titres (Hn)
