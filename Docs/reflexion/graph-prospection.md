# Graph LangGraph — Agent de Prospection Hanibal

> **Principe directeur** : Hanibal applique à lui-même la méthode qu'il vend. L'Agent de Prospection est le premier **actif agentique gouverné** — un démonstrateur interne de la méthode avant d'être une offre client.

---

## 0. Intention stratégique

```mermaid
graph LR
    A["Vision Hanibal\n(doctrine OC, gouvernance agents)"]
    B["Agent de Prospection\n(premier actif agentique)"]
    C["Preuve commerciale\n(eat your own dog food)"]
    D["Offre client\n(location d'agents supervisés)"]

    A -->|"traduit en"| B
    B -->|"démontre"| C
    C -->|"devient"| D
```

L'agent joue un **double rôle** :
- **Outil interne d'acquisition** — aide Hanibal à prospecter concrètement
- **Démonstrateur de méthode** — prouve que les agents supervisés fonctionnent sur un cas réel

---

## 1. Les 7 fonctions de l'agent

```mermaid
graph TD
    Agent["🤖 Agent de Prospection Hanibal"]

    Agent --> F1["1️⃣ Clarification des segments cibles\n(PME, ETI, DSI, dirigeants...)"]
    Agent --> F2["2️⃣ Formalisation des personas\n(douleurs, objections, motivations)"]
    Agent --> F3["3️⃣ Structuration des offres\n(coaching, IA Canvas, location d'agents)"]
    Agent --> F4["4️⃣ Production de messages\n(LinkedIn, email, accroches)"]
    Agent --> F5["5️⃣ Préparation des rendez-vous\n(scripts, questions, objections anticipées)"]
    Agent --> F6["6️⃣ Analyse des retours terrain\n(objections récurrentes, signaux d'intérêt)"]
    Agent --> F7["7️⃣ Capitalisation commerciale\n(journal, registre, synthèse hebdo)"]
```

---

## 2. Ce que l'agent peut et ne peut pas faire

```mermaid
graph LR
    subgraph PEUT["✅ L'agent PEUT"]
        P1["Proposer des cibles"]
        P2["Formuler des angles"]
        P3["Rédiger des brouillons"]
        P4["Analyser les objections"]
        P5["Préparer des séquences"]
        P6["Produire des contenus"]
        P7["Structurer un suivi"]
    end

    subgraph NEPEUT["❌ L'agent NE PEUT PAS"]
        N1["Envoyer sans validation"]
        N2["Inventer des références clients"]
        N3["Promettre un ROI non démontré"]
        N4["Prendre des engagements commerciaux"]
        N5["Modifier un CRM sans contrôle"]
        N6["Publier sans relecture"]
    end
```

---

## 3. Grille de tri du travail réel

```mermaid
graph TD
    Travail["Travail de prospection existant"]

    Travail --> S1["🗑️ SUPPRIMER\nMessages trop longs\nFormulations trop techniques\nPromesses non vérifiables\nArgumentaires qui mélangent tout"]
    Travail --> S2["✂️ SIMPLIFIER\nLa promesse Hanibal\nLa distinction entre offres\nL'explication des OC\nLe discours dirigeant"]
    Travail --> S3["🤖 ASSISTER\nRédaction de messages\nPréparation de RDV\nAnalyse des objections\nProduction LinkedIn"]
    Travail --> S4["👤 GARDER HUMAINEMENT\nArbitrage final du message\nRelation commerciale\nNégociation\nDécision de relancer"]
    Travail --> S5["🔒 SÉCURISER\nPromesses de résultat\nRéférences clients\nFormulations réglementaires\nMessages publics"]
```

---

## 4. Graphe de connaissances

```mermaid
flowchart TD
    A["🎯 Offre Hanibal"] --> B["👤 Persona cible"]
    B --> C["💢 Douleur métier"]
    C --> D["💡 Promesse commerciale"]
    D --> E["✉️ Message de prospection"]
    E --> F["🧪 Expérience terrain"]
    F --> G["↩️ Retour / Objection"]
    G --> H["📋 Décision d'amélioration"]
    H --> A

    A --> I["📄 Source de preuve"]
    A --> J["🤖 Agent de Prospection"]
    J --> K["📦 Livrable commercial"]
    K --> E

    G --> L["⚠️ Risque de surpromesse"]
    L --> M["🛡️ Garde-fou"]
    M --> N["✅ Validation humaine"]
```

---

## 5. Structure des données (data mesh simplifié)

```mermaid
graph TD
    subgraph D1["📦 Domaine Offres"]
        O1["coaching dirigeant\natelier IA Canvas\nlocation d'agents\nbénéfices / livrables"]
    end
    subgraph D2["🎯 Domaine Cibles"]
        O2["segments\npersonas\ndécideurs\ndouleurs"]
    end
    subgraph D3["✉️ Domaine Messages"]
        O3["LinkedIn\nemails\naccroches\nscripts / posts"]
    end
    subgraph D4["📚 Domaine Sources"]
        O4["master brief Hanibal\nmanifeste OC\npages site\nnotes stratégie"]
    end
    subgraph D5["🚧 Domaine Objections"]
        O5["objections dirigeant\nDSI / métier\nbudget / confiance\nréponses possibles"]
    end
    subgraph D6["🧪 Domaine Expériences"]
        O6["messages testés\ntaux de réponse\nRDV générés\nreformulations"]
    end

    Agent["🤖 Agent de Prospection"]
    Agent <-->|"lit"| D1
    Agent <-->|"lit"| D2
    Agent <-->|"lit & écrit"| D3
    Agent <-->|"lit"| D4
    Agent <-->|"lit & enrichit"| D5
    Agent <-->|"écrit"| D6
```

---

## 6. Le State — Colonne vertébrale du graph

```mermaid
classDiagram
    class ProspectionState {
        +String target_name
        +String target_company
        +String objective

        +String lead_name
        +String lead_role
        +String lead_company
        +String linkedin_url
        +String email
        +List pain_points
        +String enrichment_status

        +String channel
        +String draft_message
        +String draft_subject
        +List draft_sequence

        +Boolean human_approved
        +String human_feedback
        +Int revision_count

        +Boolean sent
        +String send_confirmation
        +String report

        +List messages
        +Int retry_count
    }
```

---

## 7. Vue d'ensemble du Graph LangGraph

```mermaid
graph TD
    START([▶ START]) --> orchestrator

    orchestrator["🧠 Orchestrateur\n(planifie, délègue)"]
    scraper["🔍 Scraper\n(enrichit le lead)"]
    router{"📡 Router\nquel canal ?"}
    linkedin_writer["✍️ Copywriter LinkedIn\n(rédige le message)"]
    email_writer["✍️ Copywriter Email\n(rédige la séquence)"]
    human_review["⏸ Human Review\n(checkpoint)"]
    revise{"🔄 Révision\nnécessaire ?"}
    sender["📤 Sender\n(envoie)"]
    reporter["📋 Reporter\n(génère le rapport)"]
    END_NODE([⏹ END])

    orchestrator --> scraper
    scraper --> router

    router -->|"linkedin_url trouvée"| linkedin_writer
    router -->|"email trouvé"| email_writer
    router -->|"rien trouvé"| orchestrator

    linkedin_writer --> human_review
    email_writer --> human_review

    human_review --> revise
    revise -->|"✅ approuvé"| sender
    revise -->|"✏️ révision\nmax 3 fois"| linkedin_writer
    revise -->|"✏️ révision\nmax 3 fois"| email_writer
    revise -->|"❌ annulé"| reporter

    sender --> reporter
    reporter --> END_NODE
```

---

## 8. Nœuds et outils connectés

```mermaid
graph LR
    subgraph N1["🧠 Orchestrateur"]
        O1["Analyse l'objectif\nPlanifie les étapes\nGère les erreurs"]
    end

    subgraph N2["🔍 Scraper"]
        S1["Recherche web\n(Tavily)"]
        S2["Scraping LinkedIn"]
        S3["Finder email\n(Hunter.io)"]
        S4["Enrichissement\n(Apollo/Clearbit)"]
    end

    subgraph N3["✍️ Copywriter LinkedIn"]
        L1["LLM spécialisé\nPrompt court"]
        L2["Output Pydantic\nLinkedInMessage"]
    end

    subgraph N4["✍️ Copywriter Email"]
        E1["LLM spécialisé\nPrompt cold email"]
        E2["Output Pydantic\nEmailSequence"]
    end

    subgraph N5["📤 Sender"]
        SE1["API LinkedIn\n(PhantomBuster / Unipile)"]
        SE2["API Email\n(SMTP / SendGrid)"]
    end

    State(["💾 ProspectionState"]) <-->|"lit & écrit"| N1
    State <-->|"lit & écrit"| N2
    State <-->|"lit & écrit"| N3
    State <-->|"lit & écrit"| N4
    State <-->|"lit & écrit"| N5
```

---

## 9. Workflow humain-agent (10 étapes)

```mermaid
flowchart TD
    A["👤 Hypothèse commerciale humaine\n(cible, angle, offre)"]
    B["🤖 Agent analyse la cible"]
    C["📋 Persona et douleur prioritaire"]
    D["✅ Validation humaine"]
    E["🤖 Agent produit message / email / script"]
    F["⏸ Approval Gate\nrelecture obligatoire"]
    G["👤 Envoi ou publication par l'humain"]
    H["↩️ Retour terrain"]
    I["🤖 Agent analyse objections et signaux"]
    J["📝 Note de décision"]
    K["🔄 Mise à jour offre / message / persona"]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J --> K --> A
```

---

## 10. Séquence complète avec Human-in-the-loop

```mermaid
sequenceDiagram
    actor User as 👤 Hanibal
    participant Orch as 🧠 Orchestrateur
    participant Scrap as 🔍 Scraper
    participant Tools as 🛠️ Outils
    participant Copy as ✍️ Copywriter
    participant HiL as ⏸ Approval Gate
    participant Send as 📤 Sender

    User->>Orch: "Prospecte Marie Dupont, Head of Sales @ Acme"

    Orch->>Scrap: Enrichis le profil de Marie Dupont
    Scrap->>Tools: tavily_search("Marie Dupont Acme")
    Tools-->>Scrap: Résultats web + pain points
    Scrap->>Tools: linkedin_scrape()
    Tools-->>Scrap: linkedin_url
    Scrap->>Tools: email_finder()
    Tools-->>Scrap: email confirmé
    Scrap-->>Orch: LeadData { linkedin_url, email, pain_points }

    Orch->>Copy: Rédige message LinkedIn\n(angle: douleur scalabilité → offre Hanibal)
    Copy-->>Orch: LinkedInMessage { message, tone, hook }

    Orch-->>User: ⏸ PAUSE — Message rédigé :\n"Bonjour Marie, j'ai vu que..."
    Note over User,HiL: Graph figé — checkpoint LangGraph

    alt ✅ Approuvé
        User->>HiL: Envoyer
        HiL->>Send: API LinkedIn
        Send-->>User: ✅ Message envoyé
    else ✏️ Révision
        User->>HiL: "Parle du churn plutôt que scalabilité"
        HiL->>Copy: Révise avec feedback
        Copy-->>HiL: LinkedInMessage v2
        HiL-->>User: ⏸ Version révisée...
    else ❌ Annulé
        User->>HiL: Annuler
        HiL-->>User: 📋 Rapport : prospection annulée
    end
```

---

## 11. Conditions de routage

```mermaid
graph TD
    S["État après Scraper"]

    S --> C1{"linkedin_url\ndisponible ?"}
    C1 -->|Oui| LI["→ Copywriter LinkedIn"]
    C1 -->|Non| C2{"email\ndisponible ?"}
    C2 -->|Oui| EM["→ Copywriter Email"]
    C2 -->|Non| C3{"retry_count\n< 3 ?"}
    C3 -->|Oui| RE["→ Orchestrateur\n(retry autre stratégie)"]
    C3 -->|Non| FAIL["→ Reporter\n(échec enrichissement)"]

    HR["État après Human Review"]
    HR --> C4{"human_approved ?"}
    C4 -->|"true"| SEND["→ Sender"]
    C4 -->|"false + feedback"| C5{"revision_count\n< 3 ?"}
    C5 -->|Oui| REV["→ Copywriter\n(avec feedback)"]
    C5 -->|Non| ABORT["→ Reporter\n(abandon)"]
    C4 -->|"annulé"| ABORT2["→ Reporter\n(annulé par user)"]
```

---

## 12. Objet Cognitif — Contrat de fonctionnement

```yaml
oc_id: oc-agent-prospection-hanibal-v0.1
name: Agent de Prospection Hanibal
status: prototype
version: 0.1.0

identity:
  role: Assistant métier spécialisé dans l'acquisition commerciale B2B
  purpose: Transformer les offres et expertises Hanibal en actions concrètes de prospection

scope:
  allowed: [stratégie commerciale, prospection B2B, LinkedIn, pages offre, scripts RDV]
  excluded: [envoi autonome, engagement contractuel, promesses financières, décisions juridiques]

guardrails:
  human_validation_required:
    - publication externe
    - envoi de message
    - engagement tarifaire
    - promesse de résultat
    - mention référence client
  forbidden:
    - inventer des références
    - envoyer sans validation
    - promettre un ROI non démontré
    - présenter l'agent comme autonome

metrics:
  business: [messages produits, messages validés, taux de réponse, RDV générés]
  quality:  [clarté, cohérence Hanibal, taux de reformulation, respect garde-fous]
  cost:     [coût par message, temps supervision, coût par RDV préparé]
```

---

## 13. Roadmap de bootstrap (6 phases)

```mermaid
graph LR
    P1["Phase 1\n🏗️ Noyau\nFoundry + brief\n+ journal décisions"]
    P2["Phase 2\n🤖 Agent\nFiche + OC\n+ templates messages"]
    P3["Phase 3\n📊 Données\nRegistres offres\npersonas objections"]
    P4["Phase 4\n🕸️ Graphe\nRelier offres\npersonas messages"]
    P5["Phase 5\n📦 Package\nagent.md OC.yaml\nSKILL guardrails eval"]
    P6["Phase 6\n🧪 Terrain\n10 LinkedIn\n5 emails 3 scripts"]

    P1 --> P2 --> P3 --> P4 --> P5 --> P6
```

---

## 14. Structure de fichiers cible

```
agent-prospection-hanibal/
├── agent.md
├── OC.yaml
├── SKILL.md
├── examples.md
├── output_schema.json
├── guardrails.md
├── eval.md
├── prompts/
│   ├── persona.md
│   ├── message-linkedin.md
│   ├── email-prospection.md
│   ├── script-rdv.md
│   └── analyse-objections.md
├── data/
│   ├── offers.csv
│   ├── personas.csv
│   ├── objections.csv
│   ├── sources.csv
│   └── experiments.csv
└── changelog.md
```

---

## 15. Ce qu'il reste à implémenter

| Nœud | Statut | Notes |
|---|---|---|
| `orchestrator` | À faire | LLM + planification |
| `scraper` | À faire | Tavily déjà dispo dans le projet |
| `linkedin_writer` | À faire | Prompt Pydantic structured output |
| `email_writer` | À faire | Prompt Pydantic structured output |
| `human_review` | À faire | Interrupt LangGraph + lecture feedback |
| `sender` | À faire | API LinkedIn / SMTP |
| `reporter` | À faire | Résumé structuré |
| **State** | ✅ Défini | Voir section 6 |
| **Routing** | ✅ Défini | Voir section 11 |
| **OC.yaml** | ✅ Défini | Voir section 12 |
| **Registres data** | À créer | offers, personas, objections, sources |
