# LangFuse — Observabilité pour agents IA

> **Rôle dans ce projet** : LangFuse est le système de monitoring de toutes les exécutions d'agents. Il enregistre chaque conversation, chaque appel LLM, chaque outil utilisé, avec les tokens consommés, les coûts, les latences — et permet de collecter les retours utilisateurs.


Model definition 

name : mistral-small-latest
input price per token : 0.00000015
output price per token: 0,00000060
pattern: (?i)^(mistral-small-latest)$
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

## Architecture générale

```mermaid
graph TB
    subgraph Client["Navigateur"]
        UI["Interface Next.js"]
    end

    subgraph Docker["Réseau Docker"]
        subgraph App["Backend FastAPI"]
            AR["agent_runner.py"]
            SDK["SDK LangFuse v2"]
        end

        subgraph LF["Serveur LangFuse :3000"]
            API["API REST LangFuse"]
            LFApp["Application LangFuse"]
        end

        subgraph PG["PostgreSQL"]
            DB1[("base: marketplace\nmessages / sessions")]
            DB2[("base: langfuse\ntraces / scores / prompts")]
        end
    end

    subgraph Ext["APIs externes"]
        Mistral["Mistral AI"]
        Claude["Anthropic Claude"]
    end

    UI -->|"SSE stream"| AR
    AR -->|"appel LLM"| Mistral
    AR -->|"appel LLM"| Claude
    AR -->|"lf.trace() / generation() / span()"| SDK
    SDK -->|"HTTP POST http://langfuse:3000"| API
    API --> LFApp
    LFApp -->|"stocke"| DB2
    AR -->|"message_store"| DB1
    UI -->|"POST /api/traces/.../score"| AR
    AR -->|"lf.score()"| SDK
```

---

## Ce qui est stocké et où

```mermaid
graph LR
    subgraph PG["PostgreSQL — même instance, deux bases"]
        subgraph marketplace["base: marketplace"]
            MS["message_store\nHistorique des messages"]
            CS["conversation_sessions\nListe des conversations"]
        end
        subgraph langfuse["base: langfuse"]
            TR["traces\nChaque run d'agent"]
            OB["observations\nGenerations + Spans"]
            SC["scores\n👍 / 👎 utilisateurs"]
            PR["prompts\nSystem prompts versionnés"]
        end
    end

    Backend -->|"save_history()"| MS
    Backend -->|"upsert_conversation_session()"| CS
    SDK -->|"via LangFuse server"| TR
    SDK -->|"via LangFuse server"| OB
    SDK -->|"lf.score()"| SC
    SDK -->|"lf.create_prompt()"| PR
```

**Deux bases, un seul PostgreSQL.** La base `langfuse` est créée automatiquement au premier démarrage via `db/init.sql`. LangFuse gère ses propres migrations Prisma dedans.

---

## Comment LangFuse s'intègre avec LangChain

LangChain propose un système de **callbacks** : des hooks appelés automatiquement à chaque étape (début LLM, token reçu, fin LLM, outil appelé...). LangFuse fournit un `CallbackHandler` qui écoute ces événements et crée les traces correspondantes.

```mermaid
sequenceDiagram
    participant AR as agent_runner.py
    participant LF as LangFuse SDK
    participant LC as LangChain LLM
    participant API as API Mistral/Claude
    participant LFS as Serveur LangFuse

    AR->>LF: lf.trace(name, session_id, input)
    Note over LF: Trace ouverte en mémoire

    AR->>LF: LangfuseHandler(stateful_client=trace)
    Note over AR: Handler attaché au LLM

    AR->>LC: llm.ainvoke(messages, callbacks=[handler])
    LC->>API: POST /chat/completions
    API-->>LC: stream tokens
    LC-->>AR: réponse complète

    Note over LF: CallbackHandler intercepte<br/>on_llm_start / on_llm_end<br/>et crée automatiquement<br/>une Generation dans la trace

    AR->>LF: lf.flush()
    LF->>LFS: HTTP POST (batch d'événements)
    LFS-->>LF: 200 OK
```

### Chemin Mistral (direct HTTP — sans LangChain)

Pour Mistral, le code bypass LangChain et appelle l'API directement (bug de sérialisation des tool_call_id). Dans ce cas, le tracking est **manuel** :

```mermaid
sequenceDiagram
    participant AR as agent_runner.py
    participant LF as LangFuse SDK
    participant MI as API Mistral
    participant LFS as Serveur LangFuse

    AR->>LF: trace.generation(name, model, input, prompt)
    AR->>MI: POST /v1/chat/completions
    MI-->>AR: réponse + usage tokens

    AR->>LF: generation.end(output, usage)
    Note over LF: Tokens + coût calculé<br/>automatiquement par LangFuse

    loop Pour chaque outil appelé
        AR->>LF: trace.span(name=tool/xxx, input=args)
        AR->>AR: tool_fn.invoke(args)
        AR->>LF: span.end(output=résultat)
    end

    AR->>LF: trace.update(output, metadata)
    AR->>LF: lf.flush()
    LF->>LFS: HTTP POST (batch)
```

---

## Architecture de la trace

Chaque message utilisateur génère une trace avec cette hiérarchie :

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
- **`metadata`** : modèle utilisé, nombre d'outils, longueur de l'historique, tokens

### 2. Generations (appels LLM)

**Pour Mistral (direct HTTP)** : chaque itération de la boucle d'outils est une génération distincte, avec le modèle, l'historique complet, les tokens input/output. LangFuse calcule le coût automatiquement grâce aux modèles enregistrés au démarrage.

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

### 6. Prompts (gestion des system prompts)

Au premier run de chaque agent, le `system_prompt.txt` est automatiquement pushé dans LangFuse. Ensuite il est éditable depuis le dashboard sans redéployer, avec historique de versions.

---

## Configuration

### Variables d'environnement

| Variable | Local | Prod |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | clé du projet LangFuse local | injectée par Ansible (vault) |
| `LANGFUSE_SECRET_KEY` | clé du projet LangFuse local | injectée par Ansible (vault) |
| `LANGFUSE_HOST` | `http://langfuse:3000` (défaut docker-compose) | idem — ne pas surcharger |
| `LANGFUSE_NEXTAUTH_URL` | `http://162.19.241.44:42003` (défaut) | `https://langfuse.agents.hanibal.fr` (Ansible) |

**LangFuse est optionnel** : si les clés sont vides, le tracing est désactivé silencieusement.

### Accès au dashboard

| Environnement | URL |
|---|---|
| Local | `http://162.19.241.44:42003` |
| Production | `https://langfuse.agents.hanibal.fr` |

Email : `admin@oc-agents.local` — Mot de passe : `adminadmin`

---

## Flux complet avec score utilisateur

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant FE as Frontend Next.js
    participant BE as Backend FastAPI
    participant LF as LangFuse

    U->>FE: Envoie un message
    FE->>BE: POST /api/agents/{id}/stream
    BE->>LF: lf.trace() — ouverture
    BE->>BE: Appels LLM + outils
    BE->>LF: generations + spans
    BE-->>FE: SSE stream (tokens)
    BE->>LF: trace.update() + flush
    BE-->>FE: event done (trace_id)
    FE->>U: Affiche réponse + boutons 👍👎

    U->>FE: Clique 👍
    FE->>BE: POST /api/traces/{trace_id}/score
    BE->>LF: lf.score(value=1)
    LF-->>BE: 200 OK
```

---

## Utilisation au quotidien

### Déboguer une mauvaise réponse

1. Ouvrir LangFuse → **Traces**
2. Filtrer par tag (`agent_id`) ou par `session_id`
3. Cliquer sur la trace → voir exactement : quel prompt, quel historique, quels outils, quelle réponse

### Surveiller les coûts

**Dashboard → Analytics → Cost** : coût total par jour, par agent, par modèle.
- Filtrer `tag = claude` → coût total agents Claude
- Comparer avec `tag = mistral`

### Améliorer un agent

1. Filtrer les traces avec `score < 0` (feedback négatif)
2. Lire les conversations qui ont mal tourné
3. Corriger le prompt directement dans **Prompts** → `agent/{id}` sans redéployer

### Comparer les modèles (A/B)

LangFuse permet de voir les performances de deux modèles sur les mêmes types de requêtes — utile pour décider si passer un agent de Mistral à Claude vaut le coût supplémentaire.

---

## SDK et fichiers clés

**Package** : `langfuse>=2.0.0,<3.0.0` — pinné en v2 car la v4 (OpenTelemetry) a une API incompatible avec le code actuel.

| Chemin LLM | Méthode de tracking |
|---|---|
| Mistral (direct HTTP) | Générations + spans manuels via SDK |
| Claude (LangChain + outils) | `CallbackHandler(stateful_client=trace)` pour LLM, spans manuels pour outils |
| Streaming simple (sans outils) | `CallbackHandler(stateful_client=trace)` capture tout automatiquement |

**Fichiers clés** :
- `backend/app/services/agent_runner.py` — intégration complète tracing + prompts
- `backend/app/routers/agents.py` — endpoint `POST /api/traces/{trace_id}/score`
- `backend/main.py` — enregistrement des modèles au démarrage (`register_models_in_langfuse`)
- `frontend/app/api/traces/[trace_id]/score/route.ts` — proxy Next.js
- `frontend/components/AgentFullPage.tsx` — composant `FeedbackButtons`
- `db/init.sql` — création de la base `langfuse`
