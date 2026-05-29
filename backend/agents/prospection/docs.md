# Prospection

## Description
Cet agent interroge l'**Annuaire des Entreprises français** (données SIRENE via data.gouv.fr) pour identifier des entreprises cibles, leurs dirigeants, et génère une fiche de prospection commerciale structurée avec une stratégie d'approche.

## Utilisation
1. Décrivez votre cible en langage naturel (secteur, localisation, type d'entreprise)
2. Lancez l'agent
3. Récupérez une fiche de prospection avec les entreprises et les angles d'approche

## Source de données principale
L'agent utilise l'**API Recherche Entreprises** du gouvernement français :
- URL : `https://recherche-entreprises.api.gouv.fr`
- Données : registre SIRENE (INSEE), mis à jour quotidiennement
- Contenu : nom, SIREN/SIRET, code NAF, adresse, dirigeants
- Accès : gratuit, sans authentification

## Exemples d'inputs
- `agences de communication digitale à Lyon`
- `startups SaaS en Île-de-France`
- `cabinets de conseil en transformation numérique`
- `PME industrielles dans le Nord-Pas-de-Calais`
- `ESN et sociétés de services informatiques à Bordeaux`

## Limitations actuelles
- Maximum **10 entreprises** par recherche (limite API)
- Les **emails et numéros de téléphone** ne sont pas dans SIRENE — utiliser LinkedIn ou Societe.com pour compléter
- Les **micro-entreprises** et auto-entrepreneurs sont inclus — filtrer si nécessaire

---

## MCP data.gouv.fr — Intégré ✅

> Source : https://www.data.gouv.fr/posts/experimentation-autour-dun-serveur-mcp-pour-datagouv

Le serveur MCP officiel de data.gouv.fr est **disponible publiquement**, sans clé API, en lecture seule.

### Connexion
```
URL  : https://mcp.data.gouv.fr/mcp
Auth : aucune (lecture seule)
Transport : Streamable HTTP (JSON-RPC over POST)
```

### Intégration dans Claude Code
```bash
claude mcp add --transport http datagouv https://mcp.data.gouv.fr/mcp
```

### Les 7 outils disponibles

| Outil | Description |
|---|---|
| `search_datasets` | Rechercher des datasets sur data.gouv.fr |
| `search_organizations` | Rechercher des organisations productrices |
| `get_dataset_info` | Métadonnées complètes d'un dataset |
| `list_dataset_resources` | Lister les ressources d'un dataset |
| `get_resource_info` | Détails d'une ressource spécifique |
| `query_resource_data` | **Interroger directement les données** d'une ressource |
| `get_metrics` | Indicateurs d'usage (production uniquement) |

### Datasets utiles pour la prospection

| Dataset | Usage | Accès MCP |
|---|---|---|
| **SIRENE** | Base nationale des entreprises (INSEE) | `search_datasets` → `query_resource_data` |
| **BODACC** | Annonces légales (dépôts de bilan, créations, cessions) | `search_datasets` → `query_resource_data` |
| **DECP** | Données essentielles des marchés publics | `search_datasets` → `query_resource_data` |
| **Transparence** | Subventions accordées par l'État | `search_datasets` → `query_resource_data` |
| **RNE** | Registre National des Entreprises | `search_datasets` → `query_resource_data` |

### Ce que le MCP permet en plus de l'API SIRENE

- Croiser les données entreprises avec les **marchés publics remportés**
- Identifier les entreprises ayant reçu des **subventions**
- Détecter les **annonces BODACC** (levées de fonds, cessions, dépôts de bilan)
- Accéder à n'importe quel des **50 000+ datasets** de data.gouv.fr

### ⚠️ Avertissement officiel data.gouv.fr
> Les réponses générées par les modèles de langage peuvent être incomplètes, approximatives ou erronées. Vérifiez toujours les informations critiques sur data.gouv.fr directement.
