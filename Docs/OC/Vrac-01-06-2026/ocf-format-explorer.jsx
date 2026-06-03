import { useState } from "react";

const COLORS = {
  nano: { bg: "#7C3AED", accent: "#A78BFA", dim: "#4C1D95", label: "NANO" },
  oc:   { bg: "#059669", accent: "#34D399", dim: "#064E3B", label: "OC"   },
  macro:{ bg: "#B45309", accent: "#FCD34D", dim: "#451A03", label: "MACRO" },
};

const LAYERS = [
  {
    id: "c1", num: "01", name: "Identité & Cadrage",
    question: "Qui suis-je ? À qui appartiens-je ? Quel est mon contrat ?",
    nano:  { depth: "full",    fields: ["name","namespace","title","version","status","owner","review_due","mandate"] },
    oc:    { depth: "full",    fields: ["name","namespace","title","description","version","status","risk_level","ownership","scope","mandate (allowed/forbidden/human_validation)"] },
    macro: { depth: "partial", fields: ["name","namespace","title","description","version","status","ownership"] },
  },
  {
    id: "c2", num: "02", name: "Perception & Contexte",
    question: "De quoi ai-je besoin pour fonctionner ? Quelles données puis-je toucher ?",
    nano:  { depth: "partial", fields: ["input (unique)","context (domain, language)"] },
    oc:    { depth: "full",    fields: ["inputs[]","context","data_governance","input_validation"] },
    macro: { depth: "minimal", fields: ["trigger (type, description)","context (domain, use_case)"] },
  },
  {
    id: "c3", num: "03", name: "Raisonnement",
    question: "Comment est-ce que je pense ? Que fais-je si j'échoue ?",
    nano:  { depth: "partial", fields: ["pattern","strategy (1–3 phrases)","on_failure"] },
    oc:    { depth: "full",    fields: ["pattern","cognitive_pattern","strategy","decision_logic[]","success_criteria","failure_conditions","explainability","audit","llm"] },
    macro: { depth: "minimal", fields: ["delegation_policy","on_failure"] },
    macroNote: "La Macro décide QUI pense pour elle, pas COMMENT.",
  },
  {
    id: "c4", num: "04", name: "Garde-fous",
    question: "Qu'est-ce que je ne ferai JAMAIS ? Qui peut m'arrêter ?",
    nano:  { depth: "full",    fields: ["autonomy.tier","non_negotiable[] (min. 1)"] },
    oc:    { depth: "full",    fields: ["autonomy","non_negotiable[]","human_in_the_loop","data_protection","security","alerts","audit"] },
    macro: { depth: "full",    fields: ["autonomy.tier","transverse_non_negotiable[] (héritées par tous les membres)","inheritance_policy","human_in_the_loop.final_checkpoint"] },
    macroNote: "Les garde-fous transversaux DOMINENT les garde-fous individuels.",
  },
  {
    id: "c5", num: "05", name: "Sorties & Livrables",
    question: "Que produis-je exactement ? Comment mes sorties sont-elles tracées ?",
    nano:  { depth: "minimal", fields: ["output.type","output.traceability (timestamped, hash)"] },
    oc:    { depth: "full",    fields: ["outputs[] (principal + machine + log_execution)","traceability par livrable","retention par livrable"] },
    macro: { depth: "partial", fields: ["outputs[] (sortie finale de constellation)","produced_by (OC validateur)","end_to_end_trace: true"] },
  },
  {
    id: "c6", num: "06", name: "Composition & Intégration",
    question: "Avec qui est-ce que je travaille ?",
    nano:  { depth: "absent",  fields: [] },
    oc:    { depth: "full",    fields: ["role","praxemes[] (Nano mobilisés)","dependencies[]","feeds_into[]","topology","resilience","third_parties[]"] },
    macro: { depth: "full",    fields: ["orchestration.pattern","orchestration.members[]","orchestration.conflict_resolution","orchestration.inheritance","orchestration.resilience"] },
    nanoNote: "ABSENT PAR DÉFINITION — un Nano ne compose pas.",
    macroNote: "C6 est le CŒUR du calibre Macro.",
  },
  {
    id: "c7", num: "07", name: "Gouvernance & Cycle de vie",
    question: "Comment est-ce que j'évolue ? Comment suis-je évalué ?",
    nano:  { depth: "partial", fields: ["status","maintainer","dates (deployed, review_due, interval)","changelog[]"] },
    oc:    { depth: "full",    fields: ["status","maturity","maintainer","dates","kpis[] (min. 2)","anomaly_detection","changelog[]","monitoring","output_retention","provenance","compliance.eu_ai_act","catalog"] },
    macro: { depth: "full",    fields: ["status","maturity","maintainer","dates","kpis_aggregated[]","changelog[]","compliance","catalog.member_oc_refs[]"] },
  },
];

const DEPTHS = {
  full:    { label: "Profonde",    bar: 3, color: "#34D399" },
  partial: { label: "Allégée",    bar: 2, color: "#FCD34D" },
  minimal: { label: "Minimale",   bar: 1, color: "#94A3B8" },
  absent:  { label: "Absente",    bar: 0, color: "#374151" },
};

function DepthBar({ depth }) {
  const d = DEPTHS[depth];
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: 2,
          background: i <= d.bar ? d.color : "#1F2937",
        }} />
      ))}
    </div>
  );
}

function CalibrationPill({ calibre }) {
  const c = COLORS[calibre];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4,
      background: c.dim, color: c.accent,
      fontSize: 10, fontFamily: "monospace",
      fontWeight: 700, letterSpacing: "0.1em",
    }}>{c.label}</span>
  );
}

export default function OCFExplorer() {
  const [selectedCalibre, setSelectedCalibre] = useState("oc");
  const [selectedLayer, setSelectedLayer] = useState("c1");

  const layer = LAYERS.find(l => l.id === selectedLayer);
  const layerData = layer[selectedCalibre];
  const c = COLORS[selectedCalibre];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050508",
      color: "#E2E8F0",
      fontFamily: "'IBM Plex Mono', monospace",
      display: "flex", flexDirection: "column",
    }}>
      {/* HEADER */}
      <div style={{
        padding: "24px 32px 16px",
        borderBottom: "1px solid #111827",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#4B5563", letterSpacing: "0.2em", marginBottom: 4 }}>
            OPEN COGNITIVE FRAMEWORK
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>
            Format Objet Cognitif <span style={{ color: "#4B5563" }}>v1.0.0</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["nano", "oc", "macro"].map(cal => {
            const cc = COLORS[cal];
            const isActive = cal === selectedCalibre;
            return (
              <button key={cal} onClick={() => { setSelectedCalibre(cal); setSelectedLayer("c1"); }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: `1px solid ${isActive ? cc.accent : "#1F2937"}`,
                  background: isActive ? cc.dim : "transparent",
                  color: isActive ? cc.accent : "#6B7280",
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                  fontWeight: isActive ? 700 : 400, letterSpacing: "0.1em",
                  transition: "all 0.2s",
                }}>
                {cc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CALIBRE META */}
      <div style={{
        padding: "12px 32px",
        borderBottom: "1px solid #0F172A",
        background: "#07090D",
        display: "flex", gap: 32, alignItems: "center",
      }}>
        {[
          { label: "Calibre", value: c.label },
          { label: "Couches", value: selectedCalibre === "nano" ? "6 / 7" : "7 / 7" },
          { label: "Champs OBL.", value: selectedCalibre === "nano" ? "~20" : selectedCalibre === "oc" ? "~132" : "~60" },
          { label: "YAML estimé", value: selectedCalibre === "nano" ? "~60 lignes" : selectedCalibre === "oc" ? "~200 lignes" : "~120 lignes" },
          { label: "Compose ?", value: selectedCalibre === "nano" ? "Non — terminal" : selectedCalibre === "macro" ? "Oui — orchestre" : "Oui — appelle" },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 9, color: "#4B5563", letterSpacing: "0.15em", marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: c.accent, fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1 }}>

        {/* LAYER NAV */}
        <div style={{
          width: 240, borderRight: "1px solid #111827",
          padding: "16px 0", flexShrink: 0,
        }}>
          {LAYERS.map(l => {
            const isActive = l.id === selectedLayer;
            const ld = l[selectedCalibre];
            return (
              <button key={l.id} onClick={() => setSelectedLayer(l.id)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "12px 24px",
                  background: isActive ? "#0F172A" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? c.accent : "transparent"}`,
                  cursor: "pointer", color: isActive ? "#F1F5F9" : "#4B5563",
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{
                      fontSize: 10, fontFamily: "monospace",
                      color: isActive ? c.accent : "#374151",
                      marginRight: 8, fontWeight: 700,
                    }}>C{l.num}</span>
                    <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{l.name}</span>
                  </div>
                  <DepthBar depth={ld.depth} />
                </div>
              </button>
            );
          })}
        </div>

        {/* LAYER DETAIL */}
        <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
          {layer && (
            <>
              {/* Layer header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 11, color: c.accent, letterSpacing: "0.2em",
                  marginBottom: 6, fontWeight: 700,
                }}>
                  COUCHE {layer.num} · {c.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", marginBottom: 10 }}>
                  {layer.name}
                </div>
                <div style={{
                  fontSize: 14, color: "#94A3B8", fontStyle: "italic",
                  paddingLeft: 12, borderLeft: `2px solid ${c.dim}`,
                  fontFamily: "'IBM Plex Serif', serif",
                }}>
                  "{layer.question}"
                </div>
              </div>

              {/* Depth badge */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
                <div style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: DEPTHS[layerData.depth].bar === 0 ? "#111827" : c.dim,
                  color: DEPTHS[layerData.depth].bar === 0 ? "#4B5563" : c.accent,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                }}>
                  {DEPTHS[layerData.depth].label.toUpperCase()}
                </div>
                <DepthBar depth={layerData.depth} />
              </div>

              {/* Special notes */}
              {layerData.depth === "absent" && (
                <div style={{
                  padding: "16px 20px", borderRadius: 8,
                  background: "#1F2937", border: "1px solid #374151",
                  marginBottom: 24, fontSize: 13, color: "#9CA3AF",
                }}>
                  {layer.id === "c6"
                    ? "⊘ Cette couche est absente par définition au calibre Nano. Un praxème ne compose pas d'autres entités. S'il doit composer, il doit être promu en calibre OC."
                    : "Couche absente à ce calibre."}
                </div>
              )}

              {selectedCalibre === "macro" && layer.macroNote && (
                <div style={{
                  padding: "14px 18px", borderRadius: 8,
                  background: "#1C1408", border: `1px solid ${COLORS.macro.dim}`,
                  marginBottom: 20, fontSize: 12, color: COLORS.macro.accent,
                }}>
                  ◈ {layer.macroNote}
                </div>
              )}

              {selectedCalibre === "nano" && layer.nanoNote && (
                <div style={{
                  padding: "14px 18px", borderRadius: 8,
                  background: "#1A0F36", border: `1px solid ${COLORS.nano.dim}`,
                  marginBottom: 20, fontSize: 12, color: COLORS.nano.accent,
                }}>
                  ◈ {layer.nanoNote}
                </div>
              )}

              {/* Fields */}
              {layerData.fields.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, color: "#4B5563", letterSpacing: "0.15em",
                    marginBottom: 12,
                  }}>CHAMPS DE CETTE COUCHE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {layerData.fields.map((f, i) => (
                      <div key={i} style={{
                        padding: "6px 12px", borderRadius: 6,
                        background: "#0F172A", border: "1px solid #1E293B",
                        fontSize: 12, color: "#CBD5E1",
                        fontFamily: "monospace",
                      }}>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* YAML snippet */}
              {layerData.depth !== "absent" && (
                <div style={{ marginTop: 32 }}>
                  <div style={{
                    fontSize: 10, color: "#4B5563", letterSpacing: "0.15em", marginBottom: 12,
                  }}>EXTRAIT YAML</div>
                  <div style={{
                    background: "#0A0A0F",
                    border: "1px solid #1E293B",
                    borderRadius: 8, padding: "20px 24px",
                    fontSize: 12, lineHeight: 1.8,
                    color: "#94A3B8",
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    overflowX: "auto",
                  }}>
                    {getYamlSnippet(layer.id, selectedCalibre, c.accent)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* LAYERS OVERVIEW (right panel) */}
        <div style={{
          width: 200, borderLeft: "1px solid #111827",
          padding: "24px 16px", flexShrink: 0,
        }}>
          <div style={{
            fontSize: 9, color: "#374151", letterSpacing: "0.15em", marginBottom: 16,
          }}>VUE GLOBALE</div>
          {LAYERS.map(l => {
            const ld = l[selectedCalibre];
            const d = DEPTHS[ld.depth];
            return (
              <div key={l.id} style={{
                marginBottom: 10, padding: "8px 10px",
                borderRadius: 6,
                background: l.id === selectedLayer ? "#0F172A" : "transparent",
                cursor: "pointer",
              }} onClick={() => setSelectedLayer(l.id)}>
                <div style={{
                  fontSize: 9, color: c.accent, marginBottom: 3,
                  fontWeight: 700,
                }}>C{l.num}</div>
                <div style={{
                  fontSize: 10, color: l.id === selectedLayer ? "#E2E8F0" : "#4B5563",
                  marginBottom: 6, lineHeight: 1.4,
                }}>{l.name}</div>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: "#1F2937",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(d.bar / 3) * 100}%`,
                    background: ld.depth === "absent" ? "#111827" : c.accent,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        padding: "12px 32px",
        borderTop: "1px solid #0F172A",
        background: "#07090D",
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: "#1F2937",
      }}>
        <span>OCF v1.0.0-draft · schema.ocf.org</span>
        <span>CC-BY-SA 4.0 · Micky — Créateur d'Objets Cognitifs</span>
      </div>
    </div>
  );
}

function getYamlSnippet(layerId, calibre, accent) {
  const snippets = {
    c1: {
      nano: `_ocf:\n  version: "1.0.0"\n  calibre: nano\n\nname: "discriminer_fait_opinion"\nnamespace: "fr.hanibal.admin"\ntitle: "Discriminer fait / opinion / décision"\nversion: "1.0.0"\nstatus: experimental\nowner: "micky@hanibal.fr"\nreview_due: "2026-11-23"\n\nmandate:\n  allowed:\n    - "analyser les interventions d'un transcript"\n    - "classifier chaque phrase en : fait | opinion | décision | action"\n  forbidden:\n    - "inventer une classification incertaine"\n    - "attribuer sans preuve"`,
      oc: `_ocf:\n  version: "1.0.0"\n  calibre: oc\n\nname: "compte_rendu_reunion"\nnamespace: "fr.hanibal.admin"\ntitle: "Compte-rendu de réunion décisionnel"\ndescription: |\n  Analyse un transcript de réunion et produit\n  un CR structuré avec décisions, actions, tensions.\nversion: "3.0.0"\nstatus: active\nrisk_level: limited\n\nownership:\n  owner: "micky@hanibal.fr"\n  accountable: "dg@client.fr"\n  domain: "administration"\n\nmandate:\n  allowed:\n    - "analyser des transcripts"\n    - "extraire décisions, actions, tensions"\n  forbidden:\n    - "lisser les tensions pour faire diplomatique"\n    - "inventer une information absente"\n  human_validation:\n    required: true\n    by: "owner"\n    max_delay: "PT48H"`,
      macro: `_ocf:\n  version: "1.0.0"\n  calibre: macro\n\nname: "pipeline_admin_reunion"\nnamespace: "fr.hanibal.admin"\ntitle: "Pipeline administration de réunion"\ndescription: |\n  Orchestre : OC-Compte-rendu →\n  OC-Suivi-actions → OC-Alerte-conformité\nversion: "1.0.0"\nstatus: experimental\n\nownership:\n  owner: "architect@hanibal.fr"\n  accountable: "sponsor@client.fr"\n  domain: "administration"`,
    },
    c2: {
      nano: `input:\n  type: text\n  required: true\n  pii: false\n  description: "Transcript brut d'une réunion"\n\ncontext:\n  domain: "administration"\n  language: "fr-FR"`,
      oc: `inputs:\n  - id: "transcript"\n    label: "Transcript de la réunion"\n    type: text\n    required: true\n    format: "markdown ou texte brut"\n    source: "user_input"\n    pii: true\n    description: "Texte brut, markdown ou SRT/VTT"\n\n  - id: "participants"\n    label: "Liste des participants"\n    type: structured\n    required: true\n    pii: true\n\ndata_governance:\n  data_classification: confidential\n  retention_policy: "P2Y"\n  anonymization_required: false`,
      macro: `trigger:\n  type: human_request\n  description: "L'IORA soumet un transcript + participants"\n\ncontext:\n  domain: "administration"\n  use_case: "pipeline_post_reunion_comite"\n  language: "fr-FR"`,
    },
    c3: {
      nano: `reasoning:\n  pattern: chain_of_thought\n  strategy: |\n    Lire chaque phrase du transcript.\n    Classifier : fait | opinion | décision | action | question.\n    Si incertain, marquer "ambigu".\n  on_failure: escalate_to_human`,
      oc: `reasoning:\n  pattern: chain_of_thought\n  cognitive_pattern: problem_decomposition\n  strategy: |\n    T1 : Analyser le transcript\n    T2 : Discriminer (fait/opinion/décision/action)\n    T3 : Extraire en parallèle (décisions, actions, tensions)\n    T4 : Détecter propos sensibles\n    T5 : Croiser avec CR précédents\n    T6 : Structurer le CR final\n    T7 : Soumettre à validation\n\n  on_failure: escalate_to_human\n\n  explainability:\n    method: natural_language\n    level: detailed\n    included_in_output: true`,
      macro: `reasoning:\n  delegation_policy: |\n    OC-Compte-rendu analyse le transcript (ordre 1).\n    OC-Suivi-actions reçoit les actions extraites (ordre 2).\n    OC-Alerte-conformité vérifie les deux sorties (ordre 3).\n  on_failure: escalate_to_human`,
    },
    c4: {
      nano: `safeguards:\n  autonomy: supervised\n  non_negotiable:\n    - id: "GF-01"\n      rule: "INTERDIT de classifier sans source claire"\n      consequence: block`,
      oc: `safeguards:\n  autonomy:\n    tier: supervised\n\n  non_negotiable:\n    - id: "GF-01"\n      rule: "INTERDIT de lisser les tensions"\n      examples:\n        bad: "'des réserves ont été formulées'"\n        good: "'Thomas : c'est inacceptable de reporter'"\n      consequence: block\n    - id: "GF-02"\n      rule: "INTERDIT de diffuser sans validation humaine"\n      consequence: block\n    - id: "GF-03"\n      rule: "INTERDIT d'inventer une information absente"\n      consequence: block\n\n  human_in_the_loop:\n    required: true\n    checkpoints:\n      - "Avant toute diffusion du CR"\n    escalation:\n      max_delay: "PT48H"\n      contact: "owner@hanibal.fr"`,
      macro: `safeguards:\n  autonomy:\n    tier: supervised\n\n  transverse_non_negotiable:\n    - id: "GFT-01"\n      rule: "Aucune sortie diffusée sans validation humaine finale"\n      priority: absolute\n      consequence: block\n    - id: "GFT-02"\n      rule: "PII masquées avant transit inter-OC"\n      priority: absolute\n      consequence: block\n\n  inheritance_policy:\n    guard_rails_inherited: true\n    override_allowed: false`,
    },
    c5: {
      nano: `output:\n  type: json\n  traceability:\n    timestamped: true\n    hash_output: true`,
      oc: `outputs:\n  - id: "cr_markdown"\n    label: "Compte-rendu décisionnel"\n    type: markdown\n    audience: ["organisateur", "participants", "absents"]\n    quality_criteria: "Scannable en 2 min, ≤ 800 mots"\n    traceability:\n      timestamped: true\n      hash_input: true\n      hash_output: true\n      source_cited: true\n    retention: "P2Y"\n\n  - id: "actions_yaml"\n    label: "Liste d'actions pour OC-Suivi"\n    type: yaml\n    audience: ["oc_suivant"]\n    traceability:\n      timestamped: true\n      hash_output: true`,
      macro: `outputs:\n  - id: "pack_reunion_complet"\n    label: "Pack post-réunion complet"\n    type: structured\n    produced_by: "fr.hanibal.admin.alerte_conformite"\n    audience: ["sponsor", "dg"]\n    traceability:\n      end_to_end_trace: true\n      member_hashes_included: true`,
    },
    c6: {
      nano: `# C6 — ABSENT PAR DÉFINITION\n# Ce praxème ne compose pas d'autres entités.\n# Il est appelé par un OC ou une Macro.`,
      oc: `composition:\n  role: worker\n  integration_owner: "arch@hanibal.fr"\n\n  praxemes:\n    - id: "fr.hanibal.admin.discriminer_fait_opinion"\n      version: ">=1.0.0"\n    - id: "fr.hanibal.admin.extraire_tensions"\n      version: ">=1.0.0"\n\n  feeds_into:\n    - id: "fr.hanibal.admin.suivi_actions"\n      version: ">=1.0.0"\n      on_event: "actions_extracted"\n\n  resilience:\n    circuit_breaker: true\n    timeout: "PT120S"\n    fallback_behavior: "Livrer un CR partiel avec avertissements"`,
      macro: `orchestration:\n  pattern: linear\n  execution_mode: sequential\n\n  conflict_resolution:\n    strategy: escalate_to_human\n    timeout_before_escalation: "PT30M"\n\n  members:\n    - id: "fr.hanibal.admin.compte_rendu_reunion"\n      version: ">=3.0.0"\n      role: worker\n      order: 1\n      input_from: []\n    - id: "fr.hanibal.admin.suivi_actions"\n      version: ">=1.0.0"\n      role: worker\n      order: 2\n      input_from: ["fr.hanibal.admin.compte_rendu_reunion"]\n    - id: "fr.hanibal.admin.alerte_conformite"\n      version: ">=1.0.0"\n      role: validator\n      order: 3\n      input_from: [\n        "fr.hanibal.admin.compte_rendu_reunion",\n        "fr.hanibal.admin.suivi_actions"\n      ]\n\n  inheritance:\n    safeguards: true\n    kpis_aggregated: true\n    unified_trace: true`,
    },
    c7: {
      nano: `lifecycle:\n  status: experimental\n  maintainer:\n    name: "Micky"\n    email: "micky@hanibal.fr"\n  dates:\n    deployed_at: "2026-05-23"\n    review_due: "2026-11-23"\n    review_interval: "P6M"\n  changelog:\n    - version: "1.0.0"\n      date: "2026-05-23"\n      type: major\n      summary: "Version initiale"`,
      oc: `lifecycle:\n  status: active\n  maturity: validated\n\n  kpis:\n    - id: "kpi_completude"\n      name: "Complétude des sorties"\n      target: 0.85\n      measurement_frequency: per_execution\n    - id: "kpi_approbation"\n      name: "Validation premier passage"\n      target: 0.65\n      measurement_frequency: weekly\n    - id: "kpi_temps_production"\n      name: "Temps de production"\n      target: 120\n      measurement_frequency: per_execution\n\n  compliance:\n    eu_ai_act:\n      risk_category: limited\n      art12_logging: true\n      art13_transparency: true\n      art14_human_oversight: true`,
      macro: `lifecycle:\n  status: experimental\n  maturity: draft\n\n  kpis_aggregated:\n    - id: "kpi_completion_e2e"\n      name: "Complétion bout-en-bout"\n      target: 0.90\n      measurement_frequency: weekly\n    - id: "kpi_cycle_time"\n      name: "Temps de cycle moyen"\n      target: 300\n      measurement_frequency: per_execution\n\n  catalog:\n    keywords: ["admin", "reunion", "pipeline"]\n    member_oc_refs:\n      - "fr.hanibal.admin.compte_rendu_reunion"\n      - "fr.hanibal.admin.suivi_actions"\n      - "fr.hanibal.admin.alerte_conformite"`,
    },
  };

  return snippets[layerId]?.[calibre] ?? "# Pas d'extrait pour cette combinaison.";
}
