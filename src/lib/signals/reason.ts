import {
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  MATTER_LABEL,
  ORIGIN_LABEL,
  PROBLEM_LABEL,
  SHIFT_LABEL,
  type Audience,
  type CategoryId,
  type MatterBecause,
  type Origin,
  type ProblemId,
  type ShiftKind,
  type SignalScores,
} from "./types";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function compositeFrom(scores: SignalScores): number {
  const importance =
    0.22 * scores.stackShift +
    0.2 * scores.impactCoding +
    0.16 * scores.impactUsage +
    0.14 * scores.impactModels +
    0.12 * scores.typesafeLikeness +
    0.08 * scores.careerRelevance +
    0.08 * scores.novelty;

  const hiddenBoost = 0.88 + 0.12 * scores.isUnderdiscussed;
  const newBoost = 0.55 + 0.45 * scores.isNewInfo;
  const gate = 0.35 + 0.65 * Math.min(scores.isAiSignal, scores.isForEngineer);
  return clamp01(importance * hiddenBoost * newBoost * gate);
}

export function shouldKeep(scores: SignalScores): boolean {
  if (scores.isAiSignal < 0.5) return false;
  if (scores.isForEngineer < 0.42) return false;
  const peak = Math.max(
    scores.stackShift,
    scores.impactCoding,
    scores.impactModels,
    scores.impactUsage,
    scores.typesafeLikeness,
    scores.careerRelevance,
    scores.novelty,
  );
  const shipping = scores.isNewInfo >= 0.42 && peak >= 0.4;
  const quietImpact =
    scores.isUnderdiscussed >= 0.55 && peak >= 0.36 && (scores.stackShift >= 0.32 || scores.impactCoding >= 0.36 || scores.impactUsage >= 0.36);
  return shipping || quietImpact;
}

function bar(n: number) {
  return (n * 4).toFixed(1);
}

export function buildReason(input: {
  origin: Origin;
  audience: Audience;
  problem: ProblemId;
  category: CategoryId;
  scores: SignalScores;
}): string {
  const parts: string[] = [];
  parts.push(ORIGIN_LABEL[input.origin]);
  parts.push(CATEGORY_LABEL[input.category]);
  parts.push(`solves ${PROBLEM_LABEL[input.problem]}`);
  parts.push(AUDIENCE_LABEL[input.audience]);

  if (input.scores.isPrimitive >= 0.6) parts.push("new primitive");
  if (input.scores.isUnderdiscussed >= 0.6) parts.push("under-discussed");
  if (input.scores.softwareNative >= 0.6) parts.push("software-callable");

  parts.push(`coding ${bar(input.scores.impactCoding)}/4`);
  parts.push(`model ${bar(input.scores.impactModels)}/4`);
  parts.push(`usage ${bar(input.scores.impactUsage)}/4`);

  return parts.join(" · ");
}

export function buildSoWhat(input: {
  shiftKind: ShiftKind;
  matterBecause: MatterBecause;
  problem: ProblemId;
  audience: Audience;
  scores: SignalScores;
}): string {
  const verb = SHIFT_LABEL[input.shiftKind];
  const problem = PROBLEM_LABEL[input.problem];
  const who = AUDIENCE_LABEL[input.audience];
  const why = MATTER_LABEL[input.matterBecause];
  const hidden =
    input.scores.isUnderdiscussed >= 0.62 && input.matterBecause !== "hidden"
      ? " Still easy to miss."
      : "";
  return `${verb} ${problem} for a ${who} — important because ${why}.${hidden}`;
}
