// ---------------------------------------------------------------------------
// Field Intelligence System — shared type contract
// Defined ONCE here and imported everywhere. The signal envelope is the schema
// every source is reduced to before extraction; the Signal is the extraction
// agent's typed, evidence-anchored output. Everything downstream is derived.
// ---------------------------------------------------------------------------

// ---- Sources & envelopes ---------------------------------------------------

export type Source = "gong_call" | "gong_email" | "slack" | "salesforce";

/** The one normalized shape every adapter emits before extraction. */
export interface SignalEnvelope {
  envelope_id: string;
  source: Source;
  account_id: string;
  account_name: string;
  opp_id: string | null;
  timestamp: string; // ISO
  raw_text: string; // transcript / email body / thread text
  participants: string[];
  metadata: Record<string, unknown>;
}

// ---- Signals (extraction output) ------------------------------------------

export type SignalType =
  | "meddpicc"
  | "competitor"
  | "objection"
  | "win_play"
  | "engagement";

/** The 8 MEDDPICC elements. `field` on a meddpicc signal is one of these. */
export type MeddpiccField =
  | "metrics"
  | "economic_buyer"
  | "decision_criteria"
  | "decision_process"
  | "paper_process"
  | "identify_pain"
  | "champion"
  | "competition";

export const MEDDPICC_FIELDS: MeddpiccField[] = [
  "metrics",
  "economic_buyer",
  "decision_criteria",
  "decision_process",
  "paper_process",
  "identify_pain",
  "champion",
  "competition",
];

export interface Signal {
  signal_id: string;
  envelope_id: string; // provenance: which envelope produced this
  account_id: string;
  opp_id: string | null;
  source: Source; // carried through for provenance
  signal_type: SignalType;
  field: MeddpiccField | null; // for meddpicc only
  entity: string | null; // for competitor: "Zendesk"; else null
  value: string; // the extracted claim, in the model's words
  evidence_quote: string; // VERBATIM span from raw_text — anti-hallucination anchor
  confidence: number; // 0..1
  timestamp: string; // inherited from envelope (recency/decay)
}

/** The raw shape the LLM is asked to return (pre-validation). */
export interface RawSignal {
  signal_type: string;
  field?: string | null;
  entity?: string | null;
  value?: string;
  evidence_quote?: string;
  confidence?: number;
}

// ---- Scoring & divergence --------------------------------------------------

export type Band = "healthy" | "watch" | "at_risk";

export interface Driver {
  label: string;
  contribution: number; // signed, off a 50 baseline; total = 50 + Σ contributions
  reason: string; // one-line, human-readable — the legibility guarantee
}

/** The four 0..1 driver components, kept raw so rollups can dollar-weight them. */
export interface ScoreComponents {
  meddpicc01: number;
  competitive01: number;
  engagement01: number;
  momentum01: number;
}

export interface Scored {
  total: number; // 0..100, rounded for the UI
  score01: number; // unrounded 0..1 (rollup input)
  band: Band;
  drivers: Driver[];
  components: ScoreComponents;
}

export type DivergenceSeverity = "none" | "elevated" | "high" | "critical";

export interface Divergence {
  flagged: boolean;
  code: "signal_soft_vs_crm" | "signal_hot_vs_crm" | null;
  crmStage: string;
  crmImpliedScore: number;
  signalTotal: number;
  gap: number; // crmImpliedScore - signalTotal (positive = field softer than CRM)
  severity: DivergenceSeverity;
  reasonChips: string[];
}

// ---- Org / enrichment ------------------------------------------------------

export interface Enrichment {
  account_name: string;
  deal_amount: number;
  territory: string;
  district: string;
}

// ---- Router ----------------------------------------------------------------

export type Destination =
  | "log_only"
  | "slack_deal_owner"
  | "outreach_task"
  | "marketo_campaign"
  | "salesforce_task"
  | "product_insight"
  | "add_to_play_library"
  | "escalate_leadership";

export interface RoutingContext {
  cluster_size: number; // similar signals across deals in the window
  deal_value_norm: number; // 0..1
  stage_leverage: number; // 0..1 from crm_stage
  recipient_load: number; // alerts the recipient already got this week
  crm_stage: string;
}

export interface RoutingDecision {
  signal_id: string;
  account_id: string;
  account_name: string;
  signal_type: SignalType;
  entity: string | null;
  destination: Destination;
  secondary: Destination[];
  requires_approval: boolean;
  reason_code: string;
  urgency: number; // 0..1, rounded for display
  evidence_quote: string;
}

// ---- Win plays / golden routes --------------------------------------------

export interface WinPlay {
  play_id: string;
  competitor: string;
  summary: string; // the rep's own words (verbatim), not an LLM rewrite
  source_account_ids: string[];
  evidence_quotes: string[];
  win_count: number; // how many wins cite this play
  status: "emerging" | "golden"; // golden once win_count >= threshold
  propagate_to: { account_id: string; account_name: string }[]; // open deals vs same competitor
  requires_approval: boolean;
}

// ---- Leadership rubric (auto-filled surveys) -------------------------------

export type RubricAnswerStatus = "met" | "partial" | "missing";

export interface SurveyItem {
  item_id: string;
  question: string;
  answer_type: "boolean" | "scale" | "enum" | "text";
  weight: number;
  guidance?: string;
}

export interface Survey {
  survey_id: string;
  name: string;
  author: string; // leadership persona
  description: string;
  items: SurveyItem[];
}

export interface RubricAnswer {
  survey_id: string;
  item_id: string;
  account_id: string;
  status: RubricAnswerStatus;
  answer: string; // model restatement
  evidence_quote: string | null; // verbatim, or null when missing
  envelope_id: string | null;
  confidence: number;
}

export interface RubricResult {
  survey_id: string;
  account_id: string;
  answers: RubricAnswer[];
  completion: number; // 0..100, share of items met (weighted)
  score: number; // 0..100 weighted (met=1, partial=0.5)
}

// ---- Composed models (the "shadow DB" shape the UI consumes) --------------

export interface AccountModel {
  account_id: string;
  account_name: string;
  opp_id: string | null;
  crm_stage: string;
  deal_amount: number;
  territory: string;
  district: string;
  signals: Signal[];
  score: Scored;
  scorePrior: Scored; // asOf - 7d, for WoW delta
  divergence: Divergence;
  rubric: RubricResult | null;
  processDivergence: ProcessDivergence | null;
}

export interface ProcessDivergence {
  flagged: boolean;
  surveyName: string;
  missing: string[]; // item questions not met
  expected: number; // items expected
  met: number;
  reason: string;
}

export interface GroupRollup {
  id: string;
  name: string;
  level: "territory" | "district";
  score: Scored;
  dealValue: number;
  divergingPipeline: number; // Σ deal_amount of flagged accounts
  flaggedAccounts: { account_id: string; account_name: string; gap: number }[];
  childIds: string[];
}
