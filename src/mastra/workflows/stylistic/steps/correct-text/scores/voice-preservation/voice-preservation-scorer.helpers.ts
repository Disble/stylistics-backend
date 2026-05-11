import type { VoicePreservationAnalysis } from "./voice-preservation-scorer.types";

/** Clamps a numeric scorer value into the inclusive 0..1 range. */
export function clampScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

/** Truncates long profile text before embedding it into scorer prompts. */
export function limitText(text: string, maxLength = 6000) {
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength)}\n...[truncated]`;
}

/** Reads the structured analysis payload emitted by the scorer analyze step. */
export function getAnalysis(
  results: unknown,
): VoicePreservationAnalysis | null {
  if (!results || typeof results !== "object") {
    return null;
  }

  const analyzeStepResult = Reflect.get(results, "analyzeStepResult");

  if (!analyzeStepResult || typeof analyzeStepResult !== "object") {
    return null;
  }

  return analyzeStepResult as VoicePreservationAnalysis;
}

/** Serializes values for prompt embedding in scorer analysis requests. */
export function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
