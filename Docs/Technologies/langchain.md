# LangChain

LangChain est un framework open-source qui permet de construire des applications alimentées par des modèles de langage (LLM). Il fournit des abstractions pour chaîner des appels LLM, connecter des outils externes, gérer la mémoire et orchestrer des agents autonomes.

---

## Vue d'ensemble

```mermaid
graph LR
    User["👤 Utilisateur"]
    App["Application LangChain"]
    LLM["🧠 LLM\n(OpenAI, Mistral, Claude…)"]
    Tools["🔧 Outils\n(recherche, BDD, API…)"]
    Memory["💾 Mémoire\n(historique, vecteurs)"]
    Data["📄 Données\n(documents, PDFs, web)"]

    User -->|requête| App
    App -->|prompt| LLM
    LLM -->|décision| App
    App -->|appel| Tools
    App -->|lecture/écriture| Memory
    App -->|récupération| Data
    Tools -->|résultat| App
    App -->|réponse| User
```

LangChain joue le rôle de **chef d'orchestre** : il prépare les prompts, décide quels outils utiliser, gère la mémoire de contexte et assemble la réponse finale.

---

## Les composants fondamentaux

### 1. Les modèles (LLMs & Chat Models)

LangChain abstrait l'accès aux différents LLMs derrière une interface unifiée. Peu importe le fournisseur, l'appel reste identique dans le code.

```mermaid
graph LR
    Interface["LangChain\nChatModel"]
    OAI["OpenAI GPT-4"]
    Mistral["Mistral AI"]
    Claude["Anthropic Claude"]
    Ollama["Ollama (local)"]

    Interface --> OAI
    Interface --> Mistral
    Interface --> Claude
    Interface --> Ollama
```

```python
from langchain_anthropic import ChatAnthropic
from langchain_mistralai import ChatMistralAI

# Même interface, fournisseurs différents
llm_claude  = ChatAnthropic(model="claude-sonnet-4-6")
llm_mistral = ChatMistralAI(model="mistral-small-latest")

reponse = llm_claude.invoke("Explique LangChain en une phrase.")
```

---

### 2. Les Prompts

Les **PromptTemplates** permettent de construire des prompts dynamiques en injectant des variables. Ils séparent la logique métier du texte brut.

```mermaid
graph LR
    Tpl["PromptTemplate\n'Analyse {sujet} en {langue}'"]
    Vars["Variables\nsujet='IA'\nlangue='français'"]
    Prompt["Prompt final\n'Analyse IA en français'"]
    LLM["🧠 LLM"]

    Tpl -->|remplacement| Prompt
    Vars -->|injection| Prompt
    Prompt -->|envoi| LLM
```

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "Tu es un expert en {domaine}."),
    ("human",  "{question}"),
])

# Génère le prompt final avec les variables
messages = prompt.format_messages(
    domaine="cybersécurité",
    question="Qu'est-ce qu'une injection SQL ?"
)
```

---

### 3. Les Chaînes (LCEL)

Le **LangChain Expression Language (LCEL)** permet d'assembler des composants avec l'opérateur `|` pour former des pipelines déclaratifs.

```mermaid
graph LR
    Input["📥 Input"]
    Prompt["PromptTemplate"]
    LLM["🧠 LLM"]
    Parser["OutputParser"]
    Output["📤 Output"]

    Input -->|données| Prompt
    Prompt -->|messages formatés| LLM
    LLM -->|réponse brute| Parser
    Parser -->|texte propre| Output
```

```python
from langchain_core.output_parsers import StrOutputParser

# Chaîne déclarative avec l'opérateur pipe
chain = prompt | llm | StrOutputParser()

# Exécution
result = chain.invoke({
    "domaine": "cybersécurité",
    "question": "Qu'est-ce qu'une injection SQL ?"
})
```

Ce modèle de composition est puissant : chaque étape est indépendante, testable et remplaçable.

---

### 4. Les Outils (Tools)

Les outils permettent au LLM d'**agir sur le monde** : faire des recherches, lire une base de données, appeler une API, exécuter du code.

```mermaid
graph LR
    LLM["🧠 LLM"]
    Decision["Décide d'utiliser\nun outil"]
    T1["🔍 Recherche web"]
    T2["📊 Requête SQL"]
    T3["📧 Envoi d'email"]
    T4["🐍 Code Python"]
    Result["Résultat injecté\ndans le contexte"]

    LLM -->|analyse la requête| Decision
    Decision --> T1
    Decision --> T2
    Decision --> T3
    Decision --> T4
    T1 -->|résultat| Result
    T2 -->|résultat| Result
    T3 -->|résultat| Result
    T4 -->|résultat| Result
    Result -->|contexte enrichi| LLM
```

```python
from langchain.tools import tool

@tool
def recherche_meteo(ville: str) -> str:
    """Retourne la météo actuelle d'une ville."""
    # Appel API météo...
    return f"Il fait 22°C et ensoleillé à {ville}."
```

Le décorateur `@tool` expose automatiquement la fonction au LLM avec son nom, sa description et son schéma d'entrée.

---

### 5. La Mémoire

Par défaut un LLM est **sans état** — il ne se souvient pas des échanges précédents. LangChain propose plusieurs types de mémoire :

```mermaid
graph TD
    Types["Types de mémoire LangChain"]
    Conv["ConversationBufferMemory\nHistorique complet"]
    Window["ConversationWindowMemory\nDerniers N échanges"]
    Summary["ConversationSummaryMemory\nRésumé par LLM"]
    Vector["VectorStoreMemory\nRecherche sémantique"]

    Types --> Conv
    Types --> Window
    Types --> Summary
    Types --> Vector

    Conv -->|simple, coûteux sur longues conv| Note1[" "]
    Window -->|économique, perd le passé lointain| Note2[" "]
    Summary -->|compact, perd les détails| Note3[" "]
    Vector -->|puissant, retrouve ce qui est pertinent| Note4[" "]
```

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(k=5)  # garde les 5 derniers échanges

memory.save_context(
    {"input": "Mon nom est Yohann"},
    {"output": "Bonjour Yohann !"}
)
```

---

### 6. Les Agents

Un **agent** est la pièce maîtresse de LangChain : il utilise un LLM comme moteur de raisonnement pour décider **à chaque étape** quelle action effectuer, jusqu'à obtenir la réponse finale.

#### Cycle de raisonnement ReAct

```mermaid
sequenceDiagram
    actor User as 👤 Utilisateur
    participant Agent as 🤖 Agent
    participant LLM as 🧠 LLM
    participant Tool as 🔧 Outil

    User->>Agent: "Quel est le PIB de la France en 2024 ?"
    Agent->>LLM: Prompt + liste des outils disponibles
    LLM-->>Agent: Thought: je dois chercher\nAction: recherche_web("PIB France 2024")
    Agent->>Tool: recherche_web("PIB France 2024")
    Tool-->>Agent: "PIB France 2024 : 2 923 milliards €"
    Agent->>LLM: Observation + nouveau prompt
    LLM-->>Agent: Thought: j'ai la réponse\nFinal Answer: Le PIB de la France...
    Agent-->>User: "Le PIB de la France en 2024 est de 2 923 Md€"
```

Ce cycle **Thought → Action → Observation** se répète jusqu'à ce que l'agent considère avoir suffisamment d'informations.

#### Types d'agents

| Type | Description | Usage |
|------|-------------|-------|
| `ReAct` | Raisonnement + Action en alternance | Usage général |
| `OpenAI Tools` | Utilise le function calling natif d'OpenAI | GPT-4, performances élevées |
| `Structured Chat` | Sorties structurées JSON | Intégrations complexes |
| `Self-Ask` | Se pose des sous-questions | Raisonnement multi-étapes |

---

## Architecture complète d'un agent LangChain

```mermaid
graph LR
    User["👤 Requête\nutilisateur"]

    subgraph AgentLoop
        AgentExec["Agent Executor"]
        LLM["🧠 LLM\n(cerveau)"]
        Parser["Output\nParser"]
    end

    subgraph ToolKit
        T1["🔍 Web Search"]
        T2["📄 Doc Retriever"]
        T3["🐍 Code Exec"]
    end

    subgraph Memory
        Hist["Historique\nconversation"]
        VDB["Vector Store\n(embeddings)"]
    end

    User --> AgentExec
    AgentExec --> LLM
    LLM --> Parser
    Parser -->|tool call| T1
    Parser -->|tool call| T2
    Parser -->|tool call| T3
    T1 -->|observation| AgentExec
    T2 -->|observation| AgentExec
    T3 -->|observation| AgentExec
    AgentExec <-->|lecture/écriture| Hist
    AgentExec <-->|recherche sémantique| VDB
    AgentExec -->|réponse finale| User
```

---

## RAG — Retrieval Augmented Generation

Le **RAG** est l'un des patterns les plus utilisés avec LangChain. Il permet d'enrichir le contexte du LLM avec des documents externes au lieu de tout stocker dans le prompt.

```mermaid
graph LR
    Docs["📄 Documents\n(PDFs, web, BDD)"]
    Splitter["Text Splitter\nDécoupage en chunks"]
    Embedder["Embedding Model\nVectorisation"]
    VDB["🗄️ Vector Store\n(Chroma, Pinecone…)"]
    Query["❓ Question\nutilisateur"]
    Retriever["Retriever\nRecherche similarité"]
    Context["Chunks pertinents"]
    LLM["🧠 LLM"]
    Answer["✅ Réponse\nfondée sur les docs"]

    Docs --> Splitter
    Splitter --> Embedder
    Embedder --> VDB

    Query --> Retriever
    VDB -->|top-k chunks| Retriever
    Retriever --> Context
    Context -->|contexte injecté| LLM
    Query -->|question| LLM
    LLM --> Answer
```

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.chains import RetrievalQA

# Indexation des documents
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=OpenAIEmbeddings()
)

# Chaîne RAG
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
)

reponse = qa_chain.invoke("Quelle est la politique de remboursement ?")
```

---

## LangChain dans ce projet

Dans `marketplace-oc-agents`, LangChain est utilisé uniquement pour les agents configurés avec le provider **Claude** (Anthropic). Le flow Python dans `backend/app/services/agent_runner.py` suit ce pattern :

```mermaid
graph LR
    Config["config.json\nprovider: claude"]
    Runner["agent_runner.py"]
    LC["LangChain\nChatAnthropic"]
    Tools["Tools Python\n@tool decorator"]
    Loop["Tool loop\nmax 5 itérations"]
    Stream["StreamingResponse\nevents SSE"]

    Config --> Runner
    Runner --> LC
    Runner --> Tools
    LC -->|bind_tools| Tools
    LC --> Loop
    Loop -->|tool_start / tool_end| Stream
    Loop -->|token| Stream
```

Pour **Mistral**, le projet utilise une boucle d'appel direct à l'API REST sans passer par LangChain (voir `_mistral_tool_loop` dans `agent_runner.py`).

---

## Ressources

- [Documentation officielle LangChain](https://python.langchain.com/docs/)
- [LangChain Expression Language (LCEL)](https://python.langchain.com/docs/expression_language/)
- [LangSmith — observabilité](https://smith.langchain.com/)
- [LangGraph — agents multi-étapes complexes](https://langchain-ai.github.io/langgraph/)
