# Marketplace OC Agents

> An agentic resource marketplace — ready-to-use AI agents to automate your daily tasks.

---

## Concept

Where a traditional marketplace offers human resources, **OC Agents** offers **agentic resources**: AI-powered agents capable of executing tasks on your behalf.

Each agent is autonomous, configurable, and billed on consumption based on the AI tokens used.

---

## Interface

Agents are displayed as **cards** laid out at the center of the page. Each card shows:

- The agent's **name** and **description**
- Its **type** (chatbot or analysis)
- Its **inputs** and **outputs**
- A quick access button

### Agent types

| Type | Icon | Description |
|---|---|---|
| Chatbot | 🧑 Character | Conversational interaction with the user |
| Analysis | 🤖 Robot | Automatic processing of data or documents |

---

## Available agents

| Agent | Description | Input | Output |
|---|---|---|---|
| **SEO Analysis** | Audits a web page and generates an SEO report | Page URL | Structured report |
| **Meeting summary** | Transcribes and summarizes a meeting | Audio / text file | Formatted summary |
| **Email digest** | Reads and synthesizes today's emails | Mailbox connection | Daily summary |
| **Ontology** | Analyses a subject and generates a Mermaid visual diagram | Text | Mermaid diagram |
| **Use case diagram** | Generates a UML use case diagram | System description | Mermaid diagram |
| **Sequence diagram** | Generates a UML sequence diagram | Process description | Mermaid diagram |

---

## Input management

Each agent defines the **type of input** it accepts:

- **Free text** — direct input in the interface
- **File(s)** — clicking the agent icon opens a **modal window** to upload files for processing
- **Third-party service** — some agents (e.g. email agent) allow connecting an external account (mailbox, calendar…) via a dedicated form in the agent settings

---

## User accounts

Each user can:

- Browse the marketplace and **activate agents** of their choice
- **Configure their own agents** (settings, service credentials, custom prompts)
- View their **consumption dashboard** (tokens used, estimated cost)

---

## Agent structure (code)

Each agent is represented by a **self-contained folder** in the project:

```
agents/
└── email-summary/
    ├── config.json          # Input type, metadata, agent type
    ├── system_prompt.txt    # System prompt sent to the AI model
    ├── docs.md              # Agent documentation
    └── connaissance/        # Knowledge base files (injected into context)
        └── reference.md
```

### Example `config.json`

```json
{
  "id": "email-summary",
  "name": "Email digest",
  "type": "analyse",
  "provider": "mistral",
  "input": {
    "type": "gmail",
    "label": "Gmail connection",
    "placeholder": ""
  },
  "output": {
    "type": "text"
  }
}
```

---

## Billing

Each agent execution consumes **AI tokens**. These tokens are:

1. **Tracked** on every model call
2. **Aggregated** per user and per agent
3. **Converted to cost** based on the model's pricing grid

The final cost is displayed in the dashboard and can serve as the basis for client billing.

---

## Tech stack

- **Frontend** — Next.js (agent cards, modals, dashboard)
- **Backend** — Go + Fiber (agent API, token tracking)
- **Database** — PostgreSQL
- **AI** — API calls to models (Mistral, Claude, etc.)
- **Infrastructure** — Docker & docker-compose

---

## Running the project

```bash
cp .env.example .env
# Fill in your API keys in .env

make dev-build
make dev-run
```

---

## Technologies

- Docker & docker-compose (with `make dev-run`, `make dev-kill`, `make dev-logs`, `make dev-build`)
- Next.js
- PostgreSQL
- Backend: Go

- Interface: http://162.19.241.44:42000
- API: http://162.19.241.44:42001

Server IP: 162.19.241.44

---

## License

Private project — all rights reserved.
