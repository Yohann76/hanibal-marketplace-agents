# Résumé des mails

## Description
Cet agent se connecte à votre boîte Gmail, récupère les emails reçus dans la journée et génère un résumé priorisé pour vous permettre de traiter l'essentiel en un coup d'œil.

## Utilisation
1. Cliquez sur **Se connecter avec Google**
2. Approuvez l'accès à votre Gmail dans la fenêtre qui s'ouvre
3. Lancez l'agent
4. Obtenez un résumé classé par priorité

## Permissions requises
L'agent demande uniquement un accès **lecture seule** à votre Gmail (`gmail.readonly`). Il ne peut pas envoyer, supprimer ou modifier vos emails.

## Format de sortie
- **Vue d'ensemble** — nombre d'emails et ambiance générale de la journée
- **Emails prioritaires** — emails urgents ou importants
- **Emails informatifs** — newsletters, notifications, mises à jour
- **Actions suggérées** — emails nécessitant une réponse
- **À ignorer** — publicités et emails non pertinents

## Conseils
- Relancez l'agent en fin de journée pour un résumé complet
- L'agent récupère les 30 derniers emails du jour maximum
- La connexion Google est valide pour la session en cours

## Sécurité
La connexion OAuth2 utilise les standards Google. Vos identifiants ne transitent jamais par nos serveurs — seul le token d'accès temporaire est utilisé.
