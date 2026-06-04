# MCP — Model Context Protocol

> **En une phrase** : MCP est un protocole standard qui permet à un LLM de se connecter à n'importe quelle source de données ou outil externe, de façon uniforme, peu importe le fournisseur.

---

## Le problème que MCP résout

Sans MCP, chaque intégration LLM ↔ outil est custom :

```mermaid
graph LR
    LLM["🧠 LLM"]
    G["Gmail\n(code custom)"]
    DB["PostgreSQL\n(code custom)"]
    GH["GitHub\n(code custom)"]
    FS["Fichiers\n(code custom)"]

    LLM --> G
    LLM --> DB
    LLM --> GH
    LLM --> FS
```

Avec MCP, un seul protocole pour tout :

```mermaid
graph LR
    LLM["🧠 LLM\n(MCP Client)"]
    P["Protocole MCP"]
    G["MCP Server\nGmail"]
    DB["MCP Server\nPostgreSQL"]
    GH["MCP Server\nGitHub"]
    FS["MCP Server\nFichiers"]

    LLM <-->|JSON-RPC| P
    P <--> G
    P <--> DB
    P <--> GH
    P <--> FS
```

---

## Architecture MCP

MCP repose sur trois concepts : **Host**, **Client** et **Server**.

```mermaid
graph TB
    subgraph Host["Host (ex: Claude Desktop, IDE)"]
        App["Application IA"]
        Client["MCP Client"]
    end

    subgraph Servers["MCP Servers"]
        S1["Server A\nFichiers locaux"]
        S2["Server B\nPostgreSQL"]
        S3["Server C\nAPI externe"]
    end

    subgraph Resources["Ressources exposées"]
        R["📄 Resources\ndonnées en lecture"]
        T["🔧 Tools\nactions exécutables"]
        Pr["💬 Prompts\ntemplates réutilisables"]
    end

    App --> Client
    Client <-->|"JSON-RPC\n(stdio ou SSE)"| S1
    Client <-->|"JSON-RPC\n(stdio ou SSE)"| S2
    Client <-->|"JSON-RPC\n(stdio ou SSE)"| S3
    S1 --> R
    S2 --> T
    S3 --> Pr
```

| Concept | Rôle |
|---|---|
| **Host** | L'application IA (Claude Desktop, Cursor, votre app) |
| **Client** | Partie du Host qui parle le protocole MCP |
| **Server** | Service externe qui expose des capacités via MCP |
| **Resources** | Données lisibles (fichiers, BDD, URLs) |
| **Tools** | Actions exécutables (écrire, appeler une API) |
| **Prompts** | Templates de prompts réutilisables |

---

## Comment fonctionne une conversation MCP

```mermaid
sequenceDiagram
    actor User as 👤 Utilisateur
    participant App as Application IA
    participant Client as MCP Client
    participant Server as MCP Server
    participant Data as Source de données

    User->>App: "Quels sont mes emails non lus ?"
    App->>Client: Quels outils sont disponibles ?
    Client->>Server: tools/list
    Server-->>Client: [{name: "gmail_read", description: "..."}]
    Client-->>App: Liste des outils

    App->>Client: Appelle gmail_read({max: 10})
    Client->>Server: tools/call {name: "gmail_read", args: {max: 10}}
    Server->>Data: Requête Gmail API
    Data-->>Server: 10 emails
    Server-->>Client: Résultat JSON
    Client-->>App: Résultat
    App-->>User: "Vous avez 3 emails non lus : ..."
```

---

## Les deux modes de transport

```mermaid
graph LR
    subgraph Local["Mode local — stdio"]
        C1["MCP Client"]
        S1["MCP Server\n(processus local)"]
        C1 <-->|"stdin / stdout"| S1
    end

    subgraph Remote["Mode distant — SSE / HTTP"]
        C2["MCP Client"]
        S2["MCP Server\n(service HTTP)"]
        C2 <-->|"HTTP + Server-Sent Events"| S2
    end
```

| Mode | Usage | Exemple |
|---|---|---|
| **stdio** | Outils locaux, même machine | Accès fichiers, commandes shell |
| **SSE/HTTP** | Services distants, microservices | API externe, base de données distante |

---

## MCP vs LangChain Tools — quelle différence ?

```mermaid
graph TB
    subgraph LCTools["LangChain @tool — lié au code"]
        LLM1["LLM"] --> T1["@tool gmail_read\n(code Python dans le projet)"]
        LLM1 --> T2["@tool web_search\n(code Python dans le projet)"]
    end

    subgraph MCPTools["MCP Tools — découplé"]
        LLM2["LLM (MCP Client)"]
        MS1["MCP Server Gmail\n(service indépendant)"]
        MS2["MCP Server Search\n(service indépendant)"]
        LLM2 <-->|protocole| MS1
        LLM2 <-->|protocole| MS2
    end
```

| | LangChain `@tool` | MCP Tool |
|---|---|---|
| **Couplage** | Dans le code Python | Service indépendant |
| **Partage** | Non réutilisable ailleurs | Utilisable par n'importe quel LLM compatible MCP |
| **Déploiement** | Avec le backend | Peut tourner séparément |
| **Standard** | Propriétaire LangChain | Standard ouvert (Anthropic) |
| **Maturité** | Stable, bien documenté | Standard émergent (2024) |

---

## Comment brancher MCP sur ce projet avec LangChain

LangChain supporte MCP via l'adaptateur `langchain-mcp-adapters`. Il convertit les outils MCP en `@tool` LangChain standard, compatibles avec notre `agent_runner.py` existant.

### Architecture cible

```mermaid
graph TB
    subgraph Actuel["Architecture actuelle"]
        AR1["agent_runner.py"]
        T1["tools/gmail_read.py\n@tool LangChain"]
        T2["tools/web_search.py\n@tool LangChain"]
        AR1 --> T1
        AR1 --> T2
    end

    subgraph Cible["Architecture avec MCP"]
        AR2["agent_runner.py"]
        Adapter["langchain-mcp-adapters\nConvertit MCP → @tool"]
        MS1["MCP Server\nGmail"]
        MS2["MCP Server\nFilesystem"]
        MS3["MCP Server\nPostgreSQL"]
        AR2 --> Adapter
        Adapter <-->|"JSON-RPC"| MS1
        Adapter <-->|"JSON-RPC"| MS2
        Adapter <-->|"JSON-RPC"| MS3
    end
```

### Intégration concrète dans `agent_runner.py`

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools

# Charger les outils depuis un MCP Server local
async def load_mcp_agent_tools(agent_id: str):
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", "/data"],
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            # Conversion automatique MCP → LangChain @tool
            tools = await load_mcp_tools(session)
            return tools

# Dans stream_agent(), remplacer load_agent_tools() par :
tools = await load_mcp_agent_tools(agent_id)
llm_with_tools = llm.bind_tools(tools)
```

### Avec un MCP Server HTTP distant (SSE)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_tools_from_mcp():
    client = MultiServerMCPClient({
        "gmail": {
            "url": "http://mcp-gmail-server:8000/sse",
            "transport": "sse",
        },
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem"],
            "transport": "stdio",
        },
    })
    async with client:
        return await client.get_tools()
```

### Ajout dans docker-compose

```yaml
services:
  mcp-filesystem:
    image: node:20-alpine
    command: npx -y @modelcontextprotocol/server-filesystem /data
    volumes:
      - ./data:/data

  mcp-postgres:
    image: node:20-alpine
    command: npx -y @modelcontextprotocol/server-postgres
    environment:
      POSTGRES_URL: postgresql://postgres:postgres@postgres:5432/marketplace
```

---

## Serveurs MCP disponibles (officiel Anthropic)

| Serveur | Capacités |
|---|---|
| `@modelcontextprotocol/server-filesystem` | Lire/écrire des fichiers locaux |
| `@modelcontextprotocol/server-postgres` | Requêtes SQL sur PostgreSQL |
| `@modelcontextprotocol/server-github` | Repos, issues, PRs GitHub |
| `@modelcontextprotocol/server-google-maps` | Géolocalisation, itinéraires |
| `@modelcontextprotocol/server-brave-search` | Recherche web via Brave |
| `@modelcontextprotocol/server-slack` | Messages, canaux Slack |

> Catalogue complet : [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

---

## Résumé — Quand utiliser MCP vs LangChain Tools ?

```mermaid
graph TD
    Q{"L'outil est-il\nréutilisable par\nd'autres projets ?"}
    Q -->|Oui| MCP["→ MCP Server\nService indépendant,\nstandard ouvert"]
    Q -->|Non| LC["→ LangChain @tool\nDans le code,\nsimple et rapide"]

    MCP --> Ex1["Gmail, PostgreSQL,\nGitHub, Filesystem"]
    LC --> Ex2["Logique métier spécifique\nau projet"]
```

**Pour ce projet aujourd'hui** : les outils `@tool` LangChain dans `agents/{id}/tools/` sont adaptés. MCP devient pertinent quand on veut partager des outils entre plusieurs agents ou projets sans dupliquer le code.
