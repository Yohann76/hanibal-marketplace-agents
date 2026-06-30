# Système de rôles — OC Agents

## Vue d'ensemble

Le système d'accès repose sur **3 niveaux de rôles** :

```
admin  >  owner  >  member
```

---

## Rôles

### `admin` — Administrateur de l'application

- **Qui** : une seule personne, le gestionnaire de la plateforme (Yohann)
- **Compte initial** : `yohanndurand76@gmail.com` — créé automatiquement au démarrage
- **Accès** : dashboard Administration complet (`/admin`)

**Capacités :**
- Voir tous les utilisateurs, toutes les organisations
- Créer des organisations
- Créer des utilisateurs avec n'importe quel rôle (member, owner)
- Changer le rôle d'un utilisateur (member ↔ owner)
- Assigner un utilisateur à une organisation
- Gérer les droits d'accès aux agents pour n'importe quel utilisateur

**Restrictions :**
- Ne peut pas se rétrograder lui-même s'il est le seul admin

---

### `owner` — Propriétaire d'une organisation

- **Qui** : un responsable d'équipe, créé par l'admin
- **Accès** : dashboard "Mon équipe" (`/admin`, vue limitée à son organisation)

**Capacités :**
- Voir les membres de **son organisation uniquement**
- Créer des membres dans son organisation
- Gérer les droits d'accès aux agents de chaque membre de son organisation
- Activer/désactiver l'accès à chaque agent pour ses membres
- Activer/désactiver chaque outil d'un agent pour ses membres

**Restrictions :**
- Ne peut pas voir ni gérer les utilisateurs d'autres organisations
- Ne peut pas créer des owners ou des admins
- Ne peut pas modifier ses propres droits d'accès aux agents

---

### `member` — Membre d'une organisation

- **Qui** : utilisateur final, créé par un owner ou par inscription libre
- **Accès** : marketplace uniquement

**Capacités :**
- Utiliser les agents autorisés par son owner
- Consulter l'historique de ses conversations
- Modifier ses préférences (nom, provider LLM préféré)

**Restrictions :**
- Aucune interface de gestion
- Accès aux agents défini par l'owner de son organisation
- Si un agent est verrouillé → il apparaît avec un cadenas sur la carte, l'onglet "Utiliser" est bloqué

---

## Droits d'accès aux agents

Les droits sont configurés par l'owner **pour chaque membre** :

| Paramètre | Description |
|-----------|-------------|
| `can_access` | Accès général à l'agent (true/false) |
| `tool_permissions` | Activation individuelle de chaque outil (ex: `gmail_read`, `web_search`) |

**Comportement par défaut** : un membre sans règle explicite a accès à tous les agents avec tous leurs outils.

---

## Flux de création d'un utilisateur

```
Admin crée une organisation
        ↓
Admin crée un Owner → assigne à l'organisation
        ↓
Owner crée des Membres → ils rejoignent l'organisation
        ↓
Owner configure les droits agents de chaque Membre
```

---

## Inscription libre

Un utilisateur qui s'inscrit via `/register` reçoit automatiquement le rôle `member` et est assigné à l'organisation `Default`. Un owner ou admin peut ensuite le rattacher à une organisation spécifique.

---

## Sécurité

- Tokens JWT signés (HS256), expiry 30 jours, clé `SECRET_KEY` dans `.env`
- Mots de passe hashés avec bcrypt
- Les endpoints admin vérifient le rôle côté serveur à chaque requête
- Un owner ne peut jamais accéder aux données d'une autre organisation
