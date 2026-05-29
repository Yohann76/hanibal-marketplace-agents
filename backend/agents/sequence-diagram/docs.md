# Diagramme de séquence

## Description
Cet agent génère un diagramme de séquence UML montrant les interactions chronologiques entre acteurs et composants d'un système. Idéal pour documenter des flux, des APIs, des processus métier ou des scénarios d'authentification.

## Utilisation
1. Décrivez le processus ou les interactions à modéliser
2. Lancez l'agent
3. Le diagramme s'affiche et peut être agrandi en plein écran

## Éléments modélisés

| Élément | Description |
|---|---|
| **Actor** | Utilisateur humain |
| **Participant** | Système, service, composant |
| **Message synchrone** | Appel qui attend une réponse |
| **Message asynchrone** | Appel sans attente de réponse |
| **Alt / Else** | Branche conditionnelle |
| **Loop** | Répétition d'interactions |
| **Opt** | Interaction optionnelle |
| **Note** | Annotation explicative |

## Conseils pour un bon résultat
- Nommez clairement les participants (Frontend, API, Base de données, Service tiers…)
- Décrivez le scénario nominal ET les cas d'erreur
- Précisez les conditions qui déclenchent des branches différentes
- Mentionnez les systèmes externes impliqués (OAuth, SMTP, passerelle de paiement…)

## Exemples d'inputs
- `Processus de connexion avec authentification à deux facteurs`
- `Flux de paiement en ligne avec vérification bancaire et confirmation`
- `Appel API REST avec gestion du token JWT et refresh token`
- `Processus de commande e-commerce de l'ajout au panier à la confirmation`
