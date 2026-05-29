# Marketplace OC Agents

> Une interface marketplace de ressources agentiques — des agents IA prêts à l'emploi pour automatiser vos tâches du quotidien.

---

## Concept

Là où une marketplace classique propose des ressources humaines, **OC Agents** propose des **ressources agentiques** : des agents propulsés par l'IA capables d'exécuter des tâches à votre place.

Chaque agent est autonome, configurable, et facturé à la consommation selon les tokens IA utilisés.

---

## Interface

Les agents sont présentés sous forme de **cartes** disposées au centre de la page. Chaque carte expose :

- Le **nom** et la **description** de l'agent
- Son **type** (chatbot ou analyse)
- Ses **entrées** et **sorties**
- Un bouton d'accès rapide

### Types d'agents

| Type | Icône | Description |
|---|---|---|
| Chatbot | 🧑 Personnage | Interaction conversationnelle avec l'utilisateur |
| Analyse | 🤖 Robot | Traitement automatique de données ou de documents |

---

## Agents disponibles

| Agent | Description | Entrée | Sortie |
|---|---|---|---|
| **Analyse SEO** | Audite une page web et génère un rapport SEO | URL de la page | Rapport structuré |
| **Compte-rendu de réunion** | Transcrit et résume une réunion | Fichier audio / texte | Compte-rendu formaté |
| **Résumé des mails** | Lit et synthétise les emails du jour | Connexion messagerie | Résumé quotidien |

---

## Gestion des entrées

Chaque agent définit le **type d'entrée** qu'il accepte :

- **Texte libre** — saisie directe dans l'interface
- **Fichier(s)** — un clic sur l'icône de l'agent ouvre une **fenêtre modale** permettant de déposer les fichiers à traiter
- **Service tiers** — certains agents (ex. : agent mail) permettent de connecter un compte externe (messagerie, agenda…) via un formulaire dédié dans les paramètres de l'agent

---

## Comptes utilisateurs

Chaque utilisateur peut :

- Parcourir la marketplace et **activer les agents** de son choix
- **Configurer ses propres agents** (paramètres, identifiants de services, prompts personnalisés)
- Consulter son **tableau de bord de consommation** (tokens utilisés, coût estimé)

---

## Structure d'un agent (code)

Chaque agent est représenté par un **dossier autonome** dans le projet :

```
agents/
└── email-summary/
    ├── config.json          # Type d'entrée, métadonnées, type d'agent
    ├── system_prompt.txt    # Prompt système envoyé au modèle IA
    ├── schema.json          # Structure des entrées/sorties attendues
    └── integrations/
        └── gmail.json       # Paramètres de connexion au service (messagerie, etc.)
```

### Exemple `config.json`

```json
{
  "id": "email-summary",
  "name": "Résumé des mails",
  "type": "analyse",
  "input": {
    "type": "service",
    "service": "gmail",
    "fields": ["email", "password"]
  },
  "output": {
    "type": "text"
  }
}
```

---

## Facturation

L'exécution de chaque agent consomme des **tokens IA**. Ces tokens sont :

1. **Comptabilisés** à chaque appel au modèle
2. **Agrégés** par utilisateur et par agent
3. **Convertis en coût** selon la grille tarifaire du modèle utilisé

Le coût final est affiché dans le tableau de bord et peut servir de base à une facturation client.

---

## Stack technique (prévisionnel)

- **Frontend** — Interface web (cartes agents, modales, dashboard)
- **Backend** — API de gestion des agents, utilisateurs et consommation
- **IA** — Appels aux modèles via API (Claude, OpenAI, etc.)
- **Stockage** — Configuration des agents et historique de consommation

---

## Lancer le projet

```bash
# Installation des dépendances
npm install

# Démarrage en développement
npm run dev
```

---

## Licence

Projet privé — tous droits réservés.


# Technologies

- Docker & docker-compose (with make dev-run, make dev-kill, make dev-logs, make dev-build)
- NextJS 
- PostregreSQL
- Backend : Go 

- Interface : http://162.19.241.44:42000
- API : http://162.19.241.44:42001


IP Serveur: 162.19.241.44

