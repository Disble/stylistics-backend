import type { FalsePositiveSuppressionAnalysis } from "./false-positive-suppression-scorer.types";

/** Clamps a numeric scorer value into the inclusive 0..1 range. */
export function clampScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

/** Reads the structured analysis payload emitted by the scorer analyze step. */
export function getAnalysis(
  results: unknown,
): FalsePositiveSuppressionAnalysis | null {
  if (!results || typeof results !== "object") {
    return null;
  }

  const analyzeStepResult = Reflect.get(results, "analyzeStepResult");

  if (!analyzeStepResult || typeof analyzeStepResult !== "object") {
    return null;
  }

  return analyzeStepResult as FalsePositiveSuppressionAnalysis;
}

/** Serializes values for prompt embedding in scorer analysis requests. */
export function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
