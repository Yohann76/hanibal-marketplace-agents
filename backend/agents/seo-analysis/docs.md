# Analyse SEO

## Description
Cet agent analyse la page web fournie et génère un rapport SEO complet avec un score, une analyse technique et des recommandations priorisées.

## Utilisation
1. Saisissez l'URL complète de la page à analyser (avec `https://`)
2. Lancez l'agent
3. Consultez le rapport avec le score et les recommandations

## Format d'entrée
Une URL complète et accessible publiquement. Exemples :
- `https://example.com`
- `https://example.com/page-produit`
- `https://blog.example.com/article`

## Éléments analysés
| Élément | Ce qui est vérifié |
|---|---|
| Balises HTML | Title, meta description, robots, canonical |
| Open Graph | og:title, og:description |
| Structure Hn | Hiérarchie H1/H2/H3, H1 unique |
| Images | Présence de l'attribut `alt` |
| Liens | Ratio internes / externes |
| HTTP | Code de réponse de la page |

## Format de sortie
- **Score SEO global** — note sur 100
- **Balises & métadonnées** — analyse détaillée avec valeurs exactes
- **Structure des titres** — évaluation de la hiérarchie
- **Images** — ratio alt manquants
- **Liens** — répartition interne/externe
- **Recommandations prioritaires** — actions classées par importance
- **Points positifs** — ce qui est bien fait

## Conseils
- Analysez vos pages les plus importantes en priorité (home, pages produit, articles populaires)
- Relancez l'analyse après chaque modification pour mesurer l'amélioration
- Le score tient compte des éléments techniques uniquement, pas de la qualité du contenu éditorial

## Limitations
- L'agent ne peut pas analyser les pages protégées par mot de passe ou derrière un login
- Les pages avec JavaScript lourd (SPA sans SSR) peuvent renvoyer des données incomplètes
- L'analyse ne prend pas en compte les Core Web Vitals ni la vitesse de chargement
