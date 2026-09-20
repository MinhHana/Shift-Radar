import {
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  ORIGIN_LABEL,
  PROBLEM_LABEL,
  type Audience,
  type CategoryId,
  type Origin,
  type ProblemId,
  type SignalScores,
} from "./types";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function compositeFrom(scores: SignalScores): number {
  const importance =
    0.2 * scores.stackShift +
    0.18 * scores.impactCoding +
    0.14 * scores.impactModels +
    0.12 * scores.impactUsage +
    0.12 * scores.careerRelevance +
    0.12 * scores.novelty +
    0.12 * scores.typesafeLikeness;

  const hiddenBoost = 0.72 + 0.28 * scores.isUnderdiscussed;
  const newBoost = 0.55 + 0.45 * scores.isNewInfo;
  const gate = 0.35 + 0.65 * Math.min(scores.isAiSignal, scores.isForEngineer);
  return clamp01(importance * hiddenBoost * newBoost * gate);
}

export function shouldKeep(scores: SignalScores): boolean {
  if (scores.isAiSignal < 0.42) return false;
  if (scores.isForEngineer < 0.32) return false;
  const peak = Math.max(
    scores.stackShift,
    scores.impactCoding,
    scores.impactModels,
    scores.typesafeLikeness,
    scores.careerRelevance,
    scores.novelty,
  );
  return peak >= 0.28 || scores.isNewInfo >= 0.55;
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
