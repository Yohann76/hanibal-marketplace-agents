# Agent Prospection 

Tools: 
- Crunchbase / Product Hunt (via API wrappers ou serveurs dédiés) : Idéal pour repérer les startups qui viennent de lever des fonds ou de lancer un produit, ce qui constitue un excellent "trigger" (déclencheur) pour les contacter.
- Puppeteer / Playwright MCP : Pour le scraping de sites d'annonces ou d'annuaires professionnels spécifiques si aucune API n'est disponible.
- LinkedIn MCP : Permet d'automatiser la recherche de profils, de récupérer les intitulés de postes exacts des décideurs et, selon le niveau d'accès, d'initier des connexions.
- Clearbit / Apollo MCP (Wrappers) : Pour récupérer le stack technique d'une boîte, son effectif exact et les emails directs à partir d'un simple nom de domaine.

Instruction inspiration: 

Recherche 10 agences de marketing à Paris qui utilisent Stripe (via Brave/Tech-checker). Trouve le CTO sur LinkedIn (LinkedIn MCP), trouve son contact (email & telephone), puis ajoute-les dans notre pipeline HubSpot (HubSpot MCP). découvre leurs stack technique (Gmail MCP).
