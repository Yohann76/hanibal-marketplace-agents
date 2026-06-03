# OCF v1.0.0 — Spécification du Format Objet Cognitif

> **Open Cognitive Framework · Format de référence**
> Statut : Draft · Calibres : Nano · OC · Macro
> Schéma JSON : https://schema.ocf.org/v1.0.0
> Licence : CC-BY-SA 4.0

---

## Résumé exécutif

Un **Objet Cognitif (OC)** est un artefact cognitif normatif et composable — une cristallisation formelle d'un raisonnement expert, lisible par un humain et exécutable par un agent IA. Il n'est pas un prompt. Il n'est pas un pipeline. Il est la grammaire opérationnelle qui gouverne la collaboration humain-IA.

Le format OCF définit la structure que doit respecter tout fichier `.oc.yaml` pour être considéré comme un Objet Cognitif conforme.

---

## Principe 1 — Une seule grammaire, trois calibres

Le même format `.oc.yaml` s'applique aux trois calibres. Le calibre est déclaré dans le prologue obligatoire `_ocf:`.

| Calibre | Nom courant | Usage | YAML estimé |
|---|---|---|---|
| `nano` | Praxème | Compétence atomique terminale | ~60 lignes |
| `oc` | Objet Cognitif | Raisonnement complet gouverné | ~200 lignes |
| `macro` | Constellation | Orchestration de plusieurs OC | ~120 lignes |

**Règle de promotion** : si un Nano commence à composer d'autres entités, il doit être promu en calibre `oc`. Si un OC devient majoritairement un orchestrateur délégant à d'autres OC, il doit être promu en calibre `macro`.

---

## Principe 2 — Sept couches constantes

À chaque calibre, les sept couches sont présentes dans le même ordre. Leur profondeur varie, pas leur séquence.

| # | Couche | Question directrice | Nano | OC | Macro |
|---|---|---|---|---|---|
| C1 | Identité & Cadrage | Qui suis-je ? | ██ | ███ | ██ |
| C2 | Perception & Contexte | De quoi ai-je besoin ? | ██ | ███ | ██ |
| C3 | Raisonnement | Comment est-ce que je pense ? | ██ | ███ | █ |
| C4 | Garde-fous | Qu'est-ce que je ne ferai JAMAIS ? | ███ | ███ | ███ |
| C5 | Sorties & Livrables | Que produis-je ? | █ | ███ | ██ |
| C6 | Composition | Avec qui est-ce que je travaille ? | ∅ | ███ | ███ |
| C7 | Gouvernance & Cycle de vie | Comment est-ce que j'évolue ? | ██ | ███ | ███ |

**Légende** : ███ Profonde · ██ Allégée · █ Minimale · ∅ Absente par définition

**Règle de la couche C6 au calibre Nano** : C6 est structurellement absente. Un Nano ne compose pas — il est appelé. Cette contrainte est la définition opérationnelle du calibre Nano.

**Règle de la couche C6 au calibre Macro** : C6 est le cœur. La Macro décide QUI pense pour elle, pas COMMENT. Le raisonnement détaillé vit dans chaque OC membre.

---

## Principe 3 — Le mandat vit en C1

Le contrat agentique (`mandate.allowed` / `mandate.forbidden`) fait partie de l'identité, pas de la configuration. Un OC sans mandat explicite n'est pas conforme au format OCF.

```yaml
mandate:
  allowed:
    - "analyser [objet] depuis [source]"
  forbidden:
    - "diffuser sans validation humaine"
    - "inventer une information absente"
  human_validation:
    required: true
    by: "owner"
    max_delay: "PT48H"
```

---

## Principe 4 — Les KPIs vivent en C7

L'évaluation est une responsabilité de gouvernance. Les KPIs sont déclarés en C7 (`lifecycle.kpis`), aux côtés du cycle de vie et de la provenance. Ils résolvent l'angle mort identifié dans les architectures précédentes.

```yaml
lifecycle:
  kpis:
    - id: "kpi_completeness"
      name: "Complétude des sorties"
      target: 0.85
      method: "sections_remplies / total"
      measurement_frequency: per_execution
```

---

## Principe 5 — Les garde-fous transversaux dominent

Dans une Constellation (calibre Macro), les garde-fous transversaux (`safeguards.transverse_non_negotiable`) s'appliquent à tous les OC membres et ne peuvent pas être affaiblis par les membres.

**Ordre de priorité en cas de conflit** :
1. Garde-fous transversaux de la Constellation
2. Garde-fous non négociables de l'OC
3. Règles de raisonnement de l'OC

---

## Réconciliation des trois ontologies

Ce format résout explicitement la dualité identifiée entre le cycle cognitif et l'architecture en couches :

| Couche (C) | Propriété épistémique (P) | Phase du cycle cognitif (φ) |
|---|---|---|
| C1 Identité | P2 Médiation axiologique | — (contexte stable) |
| C2 Perception | P5 Interface input | φ1 Percevoir |
| C3 Raisonnement | P1 Structuration active | φ2 Comprendre · φ3 Décider |
| C4 Garde-fous | P2 Médiation axiologique | φ3 Décider (contraintes) |
| C5 Sorties | P5 Interface output, P7 Traçabilité | φ4 Agir · φ5 Produire |
| C6 Composition | P3 Modularité systémique | — (méta-coordination) |
| C7 Gouvernance | P4 Évolutivité, P7 Traçabilité | φ6 Évaluer · φ7 Mémoriser |

**Lecture** : les couches (C) décrivent ce que l'OC **est** au repos (anatomie). Les phases (φ) décrivent ce que l'OC **fait** lors de l'exécution (physiologie). Les propriétés (P) décrivent ce que l'OC **doit incarner** pour être valide.

---

## Règles de validation

### Règles universelles (tous calibres)

| ID | Règle |
|---|---|
| RV-001 | Le prologue `_ocf:` est présent et contient `version`, `calibre`, `schema` |
| RV-002 | `calibre` ∈ {nano, oc, macro} |
| RV-003 | `name` est en snake_case, unique dans son namespace |
| RV-004 | `version` respecte SemVer |
| RV-005 | `owner` est un email valide |
| RV-006 | `mandate.allowed` contient au moins 1 entrée |
| RV-007 | `mandate.forbidden` contient au moins 1 entrée |
| RV-008 | `safeguards.non_negotiable` (ou `transverse_non_negotiable`) contient au moins 1 entrée |
| RV-009 | `lifecycle.review_due` est une date ISO 8601 future |
| RV-010 | `lifecycle.changelog` contient au moins 1 entrée |

### Règles spécifiques au calibre OC

| ID | Règle |
|---|---|
| RV-OC-001 | La couche C6 est présente |
| RV-OC-002 | `reasoning.pattern` ∈ valeurs définies |
| RV-OC-003 | `lifecycle.kpis` contient au moins 2 KPIs |
| RV-OC-004 | Chaque sortie dans `outputs` contient `traceability.timestamped: true` |
| RV-OC-005 | `safeguards.human_in_the_loop.required: true` |
| RV-OC-006 | `safeguards.audit.every_decision: true` |

### Règles spécifiques au calibre Nano

| ID | Règle |
|---|---|
| RV-N-001 | La couche C6 est ABSENTE (ou vide avec commentaire) |
| RV-N-002 | Un seul `input` déclaré |
| RV-N-003 | `reasoning.strategy` contient entre 1 et 3 phrases |

### Règles spécifiques au calibre Macro

| ID | Règle |
|---|---|
| RV-M-001 | `orchestration.members` contient au moins 2 OC membres |
| RV-M-002 | Au moins un membre a `role: validator` |
| RV-M-003 | `orchestration.conflict_resolution.strategy` est défini |
| RV-M-004 | `safeguards.transverse_non_negotiable` contient au moins 1 entrée |
| RV-M-005 | `safeguards.inheritance_policy.guard_rails_inherited: true` |
| RV-M-006 | `safeguards.inheritance_policy.override_allowed: false` |

---

## Conventions de nommage

```
namespace : org.domaine                   → "fr.helvetia.sinistres"
name      : oc_nom                        → "analyse_risque_fournisseur"
id (FQN)  : namespace.name                → "fr.helvetia.sinistres.analyse_risque_fournisseur"
version   : SemVer                        → "2.1.0"
fichier   : name.oc.yaml                  → "analyse_risque_fournisseur.oc.yaml"
```

---

## Correspondance EU AI Act

| Article | Obligation | Couche OCF | Champ |
|---|---|---|---|
| Art. 9 | Gestion du risque | C4 | `safeguards.non_negotiable` |
| Art. 9 | Documentation des KPI | C7 | `lifecycle.kpis` |
| Art. 12 | Journalisation | C4, C5 | `safeguards.audit`, `outputs[*].traceability` |
| Art. 13 | Transparence utilisateur | C3, C5 | `reasoning.explainability`, `outputs[*].audience` |
| Art. 14 | Supervision humaine | C1, C4 | `mandate.human_validation`, `safeguards.human_in_the_loop` |

---

## Outils

| Outil | Commande | Description |
|---|---|---|
| Validateur | `oc validate fichier.oc.yaml` | Vérifie la conformité au schéma |
| Linter | `oc lint fichier.oc.yaml` | Suggestions de qualité |
| Diff | `oc diff v1.yaml v2.yaml` | Compare deux versions d'un OC |
| Promote | `oc promote nano.oc.yaml` | Migre un Nano vers calibre OC |
| Catalog | `oc catalog list` | Liste les OC d'un namespace |

---

## Registre sémantique

### Valeurs de `reasoning.pattern`
`chain_of_thought` · `react` · `plan_execute` · `reflection` · `tree_of_thought`

### Valeurs de `safeguards.autonomy.tier`
`full_auto` · `monitored` · `supervised` · `approval_required`

### Valeurs de `lifecycle.status`
`experimental` · `active` · `deprecated` · `archived`

### Valeurs de `lifecycle.maturity`
`draft` · `validated` · `certified` · `standard`

### Valeurs de `risk_level`
`minimal` · `limited` · `high` · `critical`

---

## Historique du format

| Version | Date | Nature |
|---|---|---|
| 1.0.0-draft | 2026-05-23 | Création — 3 calibres, 7 couches, prologue _ocf |

---

*Format conçu par Micky — Créateur d'Objets Cognitifs*
*Licence CC-BY-SA 4.0 — contributions bienvenues sur github.com/ocf-org/spec*
