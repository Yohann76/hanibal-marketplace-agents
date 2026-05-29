# Compte-rendu de réunion

## Description
Cet agent analyse la transcription d'une réunion et génère automatiquement un compte-rendu structuré et professionnel.

## Utilisation
1. Collez la transcription complète de votre réunion dans le champ de saisie
2. Lancez l'agent
3. Récupérez le compte-rendu formaté

## Format d'entrée
Texte brut contenant la transcription de la réunion. Peut inclure :
- Les noms des participants suivis de leurs prises de parole
- Un texte continu retranscrit manuellement
- Une exportation d'outil de transcription automatique (Otter, Teams, Zoom, etc.)

## Format de sortie
Un compte-rendu structuré avec les sections suivantes :
- **Résumé** — synthèse en 2-3 phrases
- **Participants** — liste des personnes identifiées
- **Points abordés** — sujets principaux discutés
- **Décisions prises** — actions actées
- **Actions à mener** — tâches avec responsable et échéance
- **Prochaines étapes** — suite à donner

## Conseils
- Plus la transcription est fidèle, plus le compte-rendu sera précis
- Mentionnez les noms des participants au début de chaque prise de parole pour qu'ils soient identifiés
- Si la réunion comporte des décisions importantes, assurez-vous qu'elles sont clairement exprimées dans la transcription

## Limitations
- L'agent ne peut pas deviner les informations absentes de la transcription
- Pour les longues réunions (+2h), préférez découper en plusieurs passages
