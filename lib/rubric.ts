// ---------------------------------------------------------------------------
// Leadership rubric engine (secondary feature). Leadership defines a survey
// (fixtures/surveys.json); the agent grades every deal against it FROM THE FIELD,
// with evidence. AEs/SEs never fill a form. MEDDPICC stays the hero; this proves
// the pattern generalizes to any leadership-authored rubric.
//
// Here the grade is derived deterministically from the already-extracted signals
// (the same evidence-anchored output). In live mode a dedicated grade-rubric pass
// could re-answer each item from raw conversations; the shape is identical.
// ---------------------------------------------------------------------------
import surveysJson from "@/fixtures/surveys.json";
import type {
  MeddpiccField,
  ProcessDivergence,
  RubricAnswer,
  RubricResult,
  Signal,
  Survey,
} from "./types";
import { AS_OF, ageInDays } from "./format";

const surveys = surveysJson as Survey[];
export const activeSurvey = surveys[0];

// Items late-stage deals are expected to satisfy (drives process divergence).
const LATE_STAGE_REQUIRED = new Set(["metrics", "economic_buyer", "decision_process", "paper_process"]);
const LATE_STAGES = new Set(["Negotiation", "Commit", "Proposal"]);

/** Find the strongest signal that establishes a survey item (by field, or competitor). */
function evidenceFor(itemId: string, signals: Signal[]): Signal | null {
  const candidates = signals.filter((s) => {
    if (itemId === "competition") return s.signal_type === "competitor" || s.field === "competition";
    return s.signal_type === "meddpicc" && s.field === (itemId as MeddpiccField);
  });
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => b.confidence - a.confidence)[0];
}

export function computeRubric(_accountId: string, signals: Signal[]): RubricResult | null {
  const survey = activeSurvey;
  if (!survey) return null;

  const answers: RubricAnswer[] = survey.items.map((item) => {
    const ev = evidenceFor(item.item_id, signals);
    let status: RubricAnswer["status"] = "missing";
    if (ev) {
      const fresh = ageInDays(ev.timestamp, AS_OF) <= 45;
      status = ev.confidence >= 0.6 && fresh ? "met" : "partial";
    }
    return {
      survey_id: survey.survey_id,
      item_id: item.item_id,
      account_id: _accountId,
      status,
      answer: ev ? ev.value : "No evidence found in the field for this item.",
      evidence_quote: ev ? ev.evidence_quote : null,
      envelope_id: ev ? ev.envelope_id : null,
      confidence: ev ? ev.confidence : 0,
    };
  });

  const totalWeight = survey.items.reduce((a, i) => a + i.weight, 0);
  const metWeight = survey.items.reduce((a, i) => {
    const ans = answers.find((x) => x.item_id === i.item_id)!;
    return a + i.weight * (ans.status === "met" ? 1 : ans.status === "partial" ? 0.5 : 0);
  }, 0);
  const metCount = answers.filter((a) => a.status === "met").length;

  return {
    survey_id: survey.survey_id,
    account_id: _accountId,
    answers,
    completion: Math.round((metCount / survey.items.length) * 100),
    score: Math.round((metWeight / totalWeight) * 100),
  };
}

export function computeProcessDivergence(
  rubric: RubricResult | null,
  crmStage: string,
): ProcessDivergence | null {
  if (!rubric) return null;
  const survey = activeSurvey;
  const requiredItems = survey.items.filter((i) => LATE_STAGE_REQUIRED.has(i.item_id));
  const missing = requiredItems.filter((i) => {
    const ans = rubric.answers.find((a) => a.item_id === i.item_id)!;
    return ans.status === "missing";
  });
  const isLate = LATE_STAGES.has(crmStage);
  const flagged = isLate && missing.length > 0;
  return {
    flagged,
    surveyName: survey.name,
    missing: missing.map((i) => i.question),
    expected: requiredItems.length,
    met: requiredItems.length - missing.length,
    reason: flagged
      ? `${crmStage} deal is missing ${missing.length} of ${requiredItems.length} items leadership's rubric requires by this stage.`
      : "Meets the leadership rubric for this stage.",
  };
}
