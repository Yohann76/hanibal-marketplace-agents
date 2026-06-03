# Instructions Claude Code — Refonte Hanibal.fr

## Contexte

Tu dois reconstruire le site **hanibal.fr** en respectant deux sources distinctes :

- **La structure et les contenus** → fichier `hanibal-site.html` (prototype fourni)
- **Le design visuel** → site actuel `https://www.hanibal.fr` (couleurs, typographie, composants, style Elementor)

L'objectif : remplacer la structure et les textes du site actuel par ceux du prototype, sans toucher à l'identité visuelle existante.

---

## Étape 1 — Lire et analyser les deux sources

### 1a. Récupérer le design actuel

Fetche les pages suivantes et analyse leur design système :

```
https://www.hanibal.fr
https://www.hanibal.fr/manifeste/
```

Pour chaque page, extrais et documente :
- La palette de couleurs exacte (codes hex)
- Les polices utilisées (familles, graisses, tailles)
- Les espacements et marges caractéristiques
- Les composants récurrents (cards, boutons, tags, sections hero)
- Le style des séparateurs, bordures et ombres
- Le comportement du header (sticky, couleur, logo)
- La structure du footer

### 1b. Lire le prototype de contenu

Lis le fichier `hanibal-site.html` et extrais pour chaque page :
- La structure des sections (ordre, hiérarchie)
- Tous les textes (headlines, body, labels, CTAs)
- La logique de navigation entre pages
- Les données chiffrées (95%, 3-9 mois, etc.)
- Les livrables et détails des 3 formules coaching
- Le contenu de la page audit-agents
- Le contenu de la page méthode (3 piliers)

---

## Étape 2 — Règles de fusion

### Ce que tu GARDES du site actuel (hanibal.fr)
- Toutes les variables CSS et couleurs
- Les polices (Google Fonts actuellement chargées)
- Le style du header et du logo (logo PNG existant : `/wp-content/themes/hanibal/assets/img/hanibal-logo.png`)
- L'apparence des boutons, cards, sections
- Les breakpoints et comportements responsive
- L'animation et les micro-interactions existants
- Le style Elementor/WordPress si le rendu est en PHP

### Ce que tu REMPLACES par le prototype (hanibal-site.html)
- La structure des pages (nouvelles pages, nouvelles sections)
- Tous les textes et contenus
- L'architecture de navigation :
  ```
  Coaching | Méthode | Ressources | Contact
  ```
  (supprime "Approche" et "Manifeste" de la nav principale)
- L'ordre et le contenu des blocs sur chaque page

### Ce que tu AJOUTES (absent du site actuel)
- Page `/coaching` (contenu des 3 formules détaillées + OPCO)
- Page `/methode` (3 piliers + lien audit discret)
- Page `/audit-agents` (hors navigation principale)
- Page `/ressources` (guide + articles)
- Le Manifeste reste accessible uniquement via le footer

---

## Étape 3 — Structure des fichiers à produire

Produis les fichiers suivants selon le stack détecté sur le site actuel :

### Si le site est en HTML/CSS pur
```
index.html          → Page Accueil
coaching.html       → Page Coaching
methode.html        → Page Méthode
audit-agents.html   → Page Audit (hors nav)
ressources.html     → Page Ressources
contact.html        → Page Contact
```

### Si le site est WordPress + Elementor
Produis :
```
templates/
  home.json         → Template Elementor page Accueil
  coaching.json     → Template Elementor page Coaching
  methode.json      → Template Elementor page Méthode
  audit-agents.json → Template Elementor page Audit
  ressources.json   → Template Elementor page Ressources
  contact.json      → Template Elementor page Contact
content.md          → Tous les textes organisés par page et par bloc
```

Si Elementor JSON est trop complexe à générer, produis à la place des **fichiers HTML statiques** qui respectent exactement le design actuel — un développeur pourra les intégrer dans Elementor widget par widget.

---

## Étape 4 — Points d'attention spécifiques

**Navigation**
- Le lien "Manifeste" disparaît de la nav principale
- Il reste dans le footer (colonne Ressources)
- Ajouter `/audit-agents` dans le footer (colonne Offre) uniquement

**Page Coaching**
- Les 3 formules (3/6/9 mois) doivent être présentées individuellement avec leurs livrables détaillés
- Le bloc OPCO doit être visuellement mis en avant (encadré, couleur distincte)
- Aucun tarif affiché — tout mène vers le diagnostic

**Page Méthode**
- Le lien vers `/audit-agents` apparaît en bas de page dans un bloc sobre
- Formulé comme : *"Vous avez déjà des agents IA en production ? →"*
- Pas de lien dans la navigation principale

**Page Audit**
- URL : `/audit-agents`
- Ton consultatif, pas commercial
- CTA = email direct (contact@hanibal.fr), pas de formulaire
- Page indexée par Google mais hors nav principale

**Footer**
```
Colonne Offre :       Coaching dirigeants · Atelier IA Canvas · 
                      Gouvernance & sécurité · Location d'agents IA · 
                      Audit agents IA

Colonne Ressources :  Guide transition IA · Articles & analyses · 
                      Manifeste — Objets Cognitifs

Colonne Légal :       Mentions légales · Politique de confidentialité · 
                      Datadock

Colonne Contact :     contact@hanibal.fr · RDV en ligne
```

---

## Étape 5 — Validation avant livraison

Avant de livrer, vérifie que :
- [ ] Le logo PNG existant est correctement référencé (pas remplacé)
- [ ] Les couleurs sont identiques au site actuel (aucune couleur inventée)
- [ ] Les polices sont les mêmes (aucune nouvelle fonte ajoutée)
- [ ] Chaque page contient tout le texte du prototype correspondant
- [ ] Le manifeste n'est plus dans la navigation principale
- [ ] La page audit-agents existe et est accessible
- [ ] Le footer correspond à la structure décrite ci-dessus
- [ ] Les formulaires de contact pointent vers contact@hanibal.fr

---

## Résumé en une phrase

> Prends le contenu et la structure de `hanibal-site.html`, habille-les avec exactement le design de `https://www.hanibal.fr`, et livre des fichiers prêts à intégrer dans WordPress/Elementor.
