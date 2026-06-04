# LangFuse — Observabilité pour agents IA

> **Rôle dans ce projet** : LangFuse est le système de monitoring de toutes les exécutions d'agents. Il enregistre chaque conversation, chaque appel LLM, chaque outil utilisé, avec les tokens consommés, les coûts, les latences — et permet de collecter les retours utilisateurs.

---

## Pourquoi LangFuse ?

Les agents IA sont des boîtes noires par nature. Sans observabilité, impossible de répondre à ces questions :

| Question | Sans LangFuse | Avec LangFuse |
|---|---|---|
| Pourquoi cette réponse est mauvaise ? | Mystère | Trace complète : prompt → outils → réponse |
| Quel agent coûte le plus cher ? | Calcul manuel | Dashboard en temps réel |
| Les réponses s'améliorent-elles ? | Subjectif | Scores utilisateurs agrégés |
| Combien de tokens par session ? | Approximatif | Exact, par session/agent/modèle |
| Où se passe la latence ? | Inconnu | Chaque span est chronométré |

---

## Architecture de la trace

Chaque fois qu'un utilisateur envoie un message à un agent, une **trace** est créée dans LangFuse. Voici sa structure :

```
Trace: agent/seo-analysis  [session: abc-123]
│
├── Generation: mistral-llm-0          ← 1er appel LLM
│   ├── input: [system, history, user]
│   ├── output: "Je vais analyser..."
│   └── usage: 1 200 input / 85 output tokens
│
├── Span: tool/web_search              ← Outil déclenché
│   ├── input: { query: "SEO best practices 2025" }
│   └── output: "Résultat de la recherche..."
│
├── Generation: mistral-llm-1          ← 2ème appel LLM après outil
│   ├── input: [... + résultat outil]
│   ├── output: "Voici l'analyse complète..."
│   └── usage: 2 100 input / 420 output tokens
│
└── Score: user-feedback = 1           ← 👍 utilisateur
```

---

## Ce qui est tracé

### 1. Traces (par message utilisateur)

Chaque appel à `stream_agent()` crée une trace avec :

- **`name`** : `agent/{agent_id}` (ex: `agent/seo-analysis`)
- **`session_id`** : identifiant de la conversation — regroupe tous les messages d'une session
- **`input`** : le message de l'utilisateur
- **`output`** : la réponse finale de l'agent
- **`tags`** : `[agent_id, provider]` — pour filtrer dans le dashboard
- **`metadata`** : modèle utilisé, nombre d'outils, longueur de l'historique, tokens, coût

### 2. Generations (appels LLM)

**Pour Mistral (direct HTTP)** : chaque itération de la boucle d'outils est une génération distincte, avec :
- Le modèle exact (`mistral-small-latest`)
- L'historique complet envoyé en input
- La réponse ou les tool_calls en output
- Les tokens input/output

**Pour Claude (LangChain)** : le `CallbackHandler` LangFuse capture automatiquement chaque `ainvoke()`.

**Pour le streaming simple** (sans outils) : le `CallbackHandler` capture le flux complet.

### 3. Spans (exécutions d'outils)

Chaque outil déclenché par l'agent crée un span :
- **`name`** : `tool/{nom_outil}` (ex: `tool/web_search`, `tool/gmail_read`)
- **`input`** : les arguments passés à l'outil
- **`output`** : le résultat (tronqué à 4 000 caractères)
- **Durée** : automatiquement calculée (start → end)

### 4. Sessions (regroupement de conversations)

Le `session_id` relie toutes les traces d'une même conversation. Dans le dashboard LangFuse, la vue "Sessions" permet de voir l'intégralité d'un échange multi-tours avec l'évolution des coûts.

### 5. Scores (feedback utilisateurs)

Les boutons 👍 / 👎 dans l'interface envoient un score LangFuse :
- `value: 1` → réponse utile
- `value: -1` → réponse mauvaise
- `name: "user-feedback"`

Ces scores s'agrègent dans le dashboard et permettent de mesurer la qualité moyenne par agent ou par modèle.

---

## Configuration

### Zéro configuration nécessaire

LangFuse est **déjà embarqué dans le docker-compose** avec un projet pré-configuré. Aucune clé externe, aucun compte cloud.

```bash
docker compose up -d
```

C'est tout. LangFuse démarre sur le port `3001` avec :

| Paramètre | Valeur |
|---|---|
| Dashboard | `http://162.19.241.44:42003` |
| Email | `admin@oc-agents.local` |
| Mot de passe | `adminadmin` |
| Public Key (auto) | `pk-lf-oc-agents-local` |
| Secret Key (auto) | `sk-lf-oc-agents-local` |

Le backend pointe automatiquement vers `http://langfuse:3000` (réseau Docker interne). Aucun `.env` à modifier.

### Comment ça fonctionne

LangFuse utilise les variables `LANGFUSE_INIT_*` pour créer automatiquement au premier démarrage :
- Une organisation `OC Agents`
- Un projet `marketplace-oc-agents`
- Un compte admin
- Des clés API fixes (correspondant à celles du backend)

```yaml
# docker-compose.yml — extrait
langfuse:
  image: langfuse/langfuse:3
  environment:
    LANGFUSE_INIT_PROJECT_PUBLIC_KEY: pk-lf-oc-agents-local
    LANGFUSE_INIT_PROJECT_SECRET_KEY: sk-lf-oc-agents-local
    LANGFUSE_INIT_USER_EMAIL: admin@oc-agents.local
    LANGFUSE_INIT_USER_PASSWORD: adminadmin
```

### Surcharger avec un vrai compte (production)

En production, définir dans `.env` des clés générées depuis votre instance ou depuis cloud.langfuse.com :

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-votre-vraie-cle
LANGFUSE_SECRET_KEY=sk-lf-votre-vraie-cle
LANGFUSE_HOST=https://votre-langfuse.example.com  # ou cloud.langfuse.com
```

**LangFuse est optionnel** : si les variables sont vides, le tracing est désactivé silencieusement. Le projet continue de fonctionner.

---

## Comment lire le dashboard

### Vue Traces

```
┌─────────────────────────────────────────────────────────────────┐
│  Traces                                            Filtres ▼    │
├──────────┬────────────────┬──────────┬────────┬────────────────┤
│  Nom     │  Session       │ Tokens   │  Coût  │  Score         │
├──────────┼────────────────┼──────────┼────────┼────────────────┤
│ agent/   │ abc-123        │  3 420   │ €0.001 │  👍 1.0        │
│ seo      │                │          │        │                │
├──────────┼────────────────┼──────────┼────────┼────────────────┤
│ agent/   │ def-456        │  1 200   │ €0.000 │  👎 -1.0       │
│ vulga    │                │          │        │                │
└──────────┴────────────────┴──────────┴────────┴────────────────┘
```

Cliquer sur une trace ouvre le **détail complet** : timeline des spans, contenu exact des messages, tokens par étape.

### Vue Sessions

Regroupe toutes les traces d'une même conversation. Permet de voir l'évolution du coût et de la qualité au fil des échanges.

### Vue Scores / Analytics

Agrège tous les feedbacks utilisateurs :
- Score moyen par agent
- Score moyen par modèle (Mistral vs Claude)
- Évolution dans le temps

---

## Flux de données

```
Utilisateur envoie un message
         │
         ▼
   [Frontend Next.js]
   POST /api/agents/{id}/stream
         │
         ▼
   [Backend FastAPI]
   stream_agent()
         │
         ├─── lf.trace() ──────────────────────────► [LangFuse Cloud]
         │         │                                       │
         │         ├─ generation: llm-call-0 ─────────────┤
         │         ├─ span: tool/web_search ───────────────┤
         │         ├─ generation: llm-call-1 ─────────────┤
         │         └─ update(output, usage) ───────────────┤
         │                                                  │
         ▼                                                  │
   SSE stream → frontend                                    │
         │                                                  │
         │  [done event avec trace_id]                      │
         ▼                                                  │
   Boutons 👍/👎 affichés                                   │
         │                                                  │
         │  [clic utilisateur]                              │
         ▼                                                  │
   POST /api/traces/{trace_id}/score ────────────────────► [LangFuse Cloud]
```

---

## Utilisation au quotidien

### Déboguer une mauvaise réponse

1. Ouvrir LangFuse → **Traces**
2. Filtrer par `tag = agent_id` ou par `session_id`
3. Cliquer sur la trace
4. Voir exactement : quel prompt système, quel historique, quels outils appelés, quelle réponse finale

### Surveiller les coûts

**Dashboard → Analytics → Cost** : coût total par jour, par agent, par modèle.

Exemple de requête utile dans LangFuse :
- Filtrer `tag = claude` → voir le coût total des agents Claude
- Comparer avec `tag = mistral`

### Améliorer un agent

1. Filtrer les traces avec `score < 0` (feedback négatif)
2. Lire les conversations qui ont mal tourné
3. Identifier le pattern : prompt trop vague ? outil qui retourne un mauvais résultat ?
4. Corriger le `system_prompt.txt` ou la logique de l'outil

### Comparer les modèles (A/B)

LangFuse permet de voir side-by-side les performances de deux modèles sur les mêmes types de requêtes. Utile pour décider si passer un agent de Mistral à Claude en vaut le coût supplémentaire.

---

## SDK utilisé

**Package** : `langfuse>=2.0.0`

**Intégrations actives dans ce projet** :

| Chemin LLM | Méthode de tracking |
|---|---|
| Mistral (direct HTTP) | Générations + spans manuels via SDK |
| Claude (LangChain + outils) | `CallbackHandler(stateful_client=trace)` pour les LLM, spans manuels pour les outils |
| Streaming simple (sans outils) | `CallbackHandler(stateful_client=trace)` capture tout automatiquement |

**Fichiers clés** :
- `backend/app/services/agent_runner.py` — intégration tracing
- `backend/app/routers/agents.py` — endpoint `POST /api/traces/{trace_id}/score`
- `frontend/app/api/traces/[trace_id]/score/route.ts` — proxy Next.js
- `frontend/components/AgentFullPage.tsx` — composant `FeedbackButtons`
