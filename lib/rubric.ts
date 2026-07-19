// Leadership rubric engine — stub. Filled in step 6 (secondary feature):
// leadership defines a survey; the agent grades each deal against it from the
// field with evidence; AEs/SEs never fill a form. For now these return null so
// the data layer composes cleanly.
import type { ProcessDivergence, RubricResult, Signal } from "./types";

export function computeRubric(_accountId: string, _signals: Signal[]): RubricResult | null {
  return null;
}

export function computeProcessDivergence(
  _rubric: RubricResult | null,
  _crmStage: string,
): ProcessDivergence | null {
  return null;
}
