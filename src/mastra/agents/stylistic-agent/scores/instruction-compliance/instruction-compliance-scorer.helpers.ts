import type { InstructionComplianceAnalysis } from "./instruction-compliance-scorer.types";

/** Safely extracts the content of a tagged section from a prompt. */
export function extractTagContent(prompt: string, tagName: string) {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    String.raw`<${escapedTagName}>([\\s\\S]*?)</${escapedTagName}>`,
    "i",
  );
  const match = pattern.exec(prompt);

  return match?.[1]?.trim() ?? "";
}

/** Clamps a numeric scorer value into the inclusive 0..1 range. */
export function clampScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

/** Reads the structured analysis payload emitted by the scorer analyze step. */
export function getAnalysis(
  results: unknown,
): InstructionComplianceAnalysis | null {
  if (!results || typeof results !== "object") {
    return null;
  }

  const analyzeStepResult = Reflect.get(results, "analyzeStepResult");

  if (!analyzeStepResult || typeof analyzeStepResult !== "object") {
    return null;
  }

  return analyzeStepResult as InstructionComplianceAnalysis;
}
