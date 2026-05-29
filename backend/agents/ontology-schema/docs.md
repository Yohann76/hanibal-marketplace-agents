# Ontologie

## Description
Cet agent analyse un sujet ou un texte et génère automatiquement un diagramme Mermaid adapté : mind map, flowchart, diagramme de séquence, diagramme de classes, etc.

## Utilisation
1. Décrivez un sujet, un processus, ou collez un texte à analyser
2. Lancez l'agent
3. Le schéma s'affiche directement dans l'interface, interprété visuellement

## Types de diagrammes générés

| Type | Cas d'usage |
|---|---|
| **Flowchart** | Processus, algorithmes, flux de décision |
| **Mind map** | Exploration d'un concept et ses ramifications |
| **Diagramme de classes** | Architecture, modèles de données, relations |
| **Diagramme de séquence** | Interactions entre systèmes ou acteurs |
| **Timeline** | Événements chronologiques |
| **Graph** | Relations libres entre entités |

## Exemples d'inputs

- `Le cycle de vie d'un projet agile`
- `Les étapes du processus de recrutement dans une entreprise`
- `Architecture d'une application web moderne`
- `[coller un texte long]` → l'agent extrait et schématise les concepts clés

## Conseils
- Plus l'input est précis, plus le schéma est pertinent
- Pour les textes longs, l'agent se concentre sur les concepts les plus importants
- Si le schéma généré ne vous convient pas, précisez le type souhaité dans votre demande ("génère un flowchart de...")

## Format de sortie
Le résultat contient :
1. Une explication du schéma choisi
2. Le diagramme Mermaid rendu visuellement
3. Une légende si nécessaire
