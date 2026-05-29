# Cas d'utilisation

## Description
Cet agent génère un diagramme de cas d'utilisation UML à partir de la description d'un système. Il identifie automatiquement les acteurs, les cas d'utilisation et leurs relations (include, extend, héritage).

## Utilisation
1. Décrivez votre système, ses utilisateurs et ses fonctionnalités principales
2. Lancez l'agent
3. Le diagramme s'affiche et peut être agrandi en plein écran

## Éléments modélisés

| Élément | Description |
|---|---|
| **Acteur** | Personne ou système externe qui interagit avec le système |
| **Cas d'utilisation** | Fonctionnalité offerte par le système |
| **Association** | L'acteur utilise ce cas d'utilisation |
| **Include** | Un cas d'utilisation en inclut toujours un autre |
| **Extend** | Un cas d'utilisation étend optionnellement un autre |
| **Héritage** | Un acteur hérite des cas d'utilisation d'un autre |

## Conseils pour un bon résultat
- Mentionnez explicitement les différents rôles/types d'utilisateurs
- Listez les fonctionnalités principales du système
- Précisez les actions réservées à certains rôles
- Indiquez si certaines fonctionnalités en déclenchent d'autres automatiquement

## Exemples d'inputs
- `Application bancaire avec clients, conseillers et administrateurs`
- `Plateforme e-commerce : navigation, panier, commande, paiement, gestion admin`
- `Système de gestion des ressources humaines pour les RH, managers et employés`
