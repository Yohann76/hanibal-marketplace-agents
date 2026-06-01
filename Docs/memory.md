# Agent Memory — Architecture & Implementation Plan

Use Langchain for prevent multi agent

## Why Memory Makes a Real Agent

Currently, each agent call is **stateless** — the agent has no recollection of previous interactions, past results, or user context. Every execution starts from zero.

True agents need memory to:
- Maintain context across a conversation ("as I mentioned earlier…")
- Learn from past interactions ("last week you asked me to analyze this URL")
- Personalize responses based on who the user is and what they do
- Build knowledge over time instead of repeating the same work

---

## The 3 Types of Agent Memory

```
┌─────────────────────────────────────────────────────────┐
│                        AGENT                            │
│                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  Working      │  │  Episodic     │  │  Semantic   │ │
│  │  Memory       │  │  Memory       │  │  Memory     │ │
│  │  (session)    │  │  (history)    │  │  (search)   │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1. Working Memory — Current Conversation
What happens within a single session. The agent remembers what was said 2 messages ago and builds on it.

- **What's missing now**: every API call is independent, no conversation history is passed
- **What it enables**: multi-turn conversations, follow-up questions, iterative refinement
- **Implementation**: store messages in a `conversations` table, re-inject the last N messages into the prompt on each call

### 2. Episodic Memory — Long-term History
The agent remembers past interactions across sessions.

> *"Last week you asked me to run an SEO analysis on this website — here's what changed since then."*

- **What's missing now**: executions are logged (token count) but content is never stored
- **What it enables**: continuity across sessions, proactive suggestions, progress tracking
- **Implementation**: store agent inputs/outputs in a `memories` table in PostgreSQL

### 3. Semantic Memory — Vector Search
The most powerful type. Past results are stored as **embedding vectors** so the agent can find *relevant* memories by meaning, not just by keyword.

> *"Find everything I've previously learned about SEO for e-commerce sites"* — even if the exact words were never used.

- **What's missing now**: no vector storage, no embedding generation
- **What it enables**: intelligent context retrieval, knowledge accumulation, cross-agent memory sharing
- **Implementation**: pgvector (PostgreSQL extension) + Mistral Embeddings API

---

## Recommended Stack

No new infrastructure needed — everything builds on what already exists.

```
PostgreSQL (already running)
  ├── pgvector extension    → semantic memory (vector similarity search)
  ├── conversations table   → working memory (message history per user/agent)
  └── memories table        → episodic + semantic memory (with embeddings)

Mistral API (already integrated)
  └── mistral-embed         → generate embeddings (included in existing API key)
```

### Why pgvector over a dedicated vector database?

| Option | Pros | Cons |
|---|---|---|
| **pgvector** (recommended) | Already have PostgreSQL, SQL joins work, no extra infra | Slightly slower at very large scale |
| Pinecone | Managed, fast | Paid, external service, no SQL |
| Chroma | Open source, simple | Separate service to manage |
| Qdrant | Fast, open source | Separate service to manage |

For this project's scale, **pgvector is the right choice** — one less service, SQL joins with users/agents, and free.

---

## Database Schema

```sql
-- Conversation history (working memory)
CREATE TABLE conversations (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(100) NOT NULL,
    agent_id    VARCHAR(100) NOT NULL,
    role        VARCHAR(10) NOT NULL,   -- 'user' or 'assistant'
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Long-term memories with semantic search (episodic + semantic)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memories (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(100) NOT NULL,
    agent_id    VARCHAR(100) NOT NULL,
    content     TEXT NOT NULL,          -- human-readable summary
    embedding   vector(1024),           -- Mistral embed dimension
    metadata    JSONB,                  -- input, tags, source, etc.
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX ON memories
    USING hnsw (embedding vector_cosine_ops);

-- User profiles (persistent context)
CREATE TABLE user_profiles (
    user_id     VARCHAR(100) PRIMARY KEY,
    context     TEXT,                  -- role, company, preferences
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

## How It Works in Practice

**Current flow:**
```
User input → System prompt + user input → AI → Response
```

**With memory:**
```
User input
  → retrieve relevant past memories (vector search, top 3-5)
  → load conversation history (last 10 messages)
  → load user profile
  → System prompt
    + user profile context
    + relevant past memories
    + conversation history
    + user input
  → AI → Response
  → store response as new memory (with embedding)
```

---

## Implementation Roadmap

### Phase 1 — Working Memory (est. 2-3h)
- [ ] Add `conversations` table to `db/init.sql`
- [ ] Store user message + agent response after each execution
- [ ] Inject last N messages into the system prompt on each call
- [ ] Surface conversation history in the agent UI

### Phase 2 — User Profile (est. 1h)
- [ ] Add `user_profiles` table
- [ ] UI to set user context (role, company, goals)
- [ ] Inject profile into every agent call

### Phase 3 — Semantic Memory (est. 1 day)
- [ ] Enable `pgvector` extension in PostgreSQL
- [ ] Add `memories` table with vector column
- [ ] Call Mistral `mistral-embed` to generate embeddings on each execution
- [ ] Before each call: similarity search to retrieve top relevant memories
- [ ] Inject retrieved memories into the prompt as "what I remember about this"
- [ ] UI to browse and delete memories per agent

---

## Mistral Embeddings

Mistral provides an embeddings endpoint included in the existing API key:

```go
// POST https://api.mistral.ai/v1/embeddings
{
  "model": "mistral-embed",
  "input": ["text to embed"]
}
// Returns: float32[1024]
```

Cost: ~$0.1 / 1M tokens — negligible for this use case.

---

## Suggested Starting Point

**Phase 1 (working memory)** is the highest-impact, lowest-effort change.
It immediately makes every agent feel like a real conversational assistant
instead of a one-shot tool.

Ready to implement when you are.
