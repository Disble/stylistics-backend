import { createScorer } from "@mastra/core/evals";

import { evalModelPool } from "../../../../../../constants/models";
import type {
  CorrectTextStepInput,
  StylisticCorrectionStepOutput,
} from "../../correct-text.types";
import { precisionScoreMap } from "./false-positive-suppression-scorer.constants";
import {
  clampScore,
  getAnalysis,
  toPrettyJson,
} from "./false-positive-suppression-scorer.helpers";
import { falsePositiveSuppressionAnalysisSchema } from "./false-positive-suppression-scorer.schemas";

/** Runtime scorer that penalizes weakly supported false positives in correct-text. */
export const falsePositiveSuppressionScorer = createScorer<
  CorrectTextStepInput,
  StylisticCorrectionStepOutput
>({
  id: "correct-text-false-positive-suppression-scorer",
  name: "Correct Text False Positive Suppression",
  description:
    "Penalizes stylistic suggestions that invent weak problems, especially around lexical echo, repeated-resource abuse, and unnecessary wording variation.",
  judge: {
    model: evalModelPool.standard,
    instructions:
      "You evaluate the precision of a stylistic correction step. Penalize invented or weakly supported findings, especially false lexical echoes, normal local repetition treated as abuse, flattening literary imagery just to vary vocabulary, and ambiguity introduced only to avoid repetition. " +
      "Return only structured JSON matching the provided schema.",
  },
})
  .analyze({
    description:
      "Identify weakly supported or invented suggestions in the correct-text step output.",
    outputSchema: falsePositiveSuppressionAnalysisSchema,
    createPrompt: ({ run }) => `
Evalúa la precisión de estas sugerencias de corrección estilística.

Texto original:
"""
${run.input?.text ?? ""}
"""

Género: ${run.input?.genero ?? "general"}

Sugerencias emitidas:
${toPrettyJson(run.output.suggestions)}

Reglas de evaluación:
1. Marca como falso positivo una sugerencia que inventa un problema sin evidencia textual suficiente.
2. Penaliza especialmente:
   - eco léxico débil o normal repetición local tratada como abuso,
   - cambios léxicos que aplanan imágenes literarias solo para variar vocabulario,
   - reemplazos que introducen ambigüedad o pérdida de precisión para evitar repetición,
   - etiquetar como problema estructural algo que no afecta claridad, coherencia o naturalidad.
3. No penalices correcciones normativas inequívocas ni mejoras con evidencia fuerte.
4. Resume la precisión general como \`high\`, \`mixed\` o \`low\`.

Devuelve JSON con:
- applicableSuggestions: number
- falsePositiveFindings: array of { anchor, category, concern, strength }
- precisionLevel: "high" | "mixed" | "low"
- confidence: number entre 0 y 1
- summary: string
`,
  })
  .generateScore(({ run, results }) => {
    const analysis = getAnalysis(results);

    if (!analysis) {
      return 0;
    }

    if (run.output.suggestions.length === 0) {
      return 1;
    }

    const strongCount = analysis.falsePositiveFindings.filter(
      (finding) => finding.strength === "strong",
    ).length;
    const moderateCount = analysis.falsePositiveFindings.length - strongCount;
    const weightedPenalty = strongCount * 0.25 + moderateCount * 0.12;
    const baseScore = precisionScoreMap[analysis.precisionLevel];
    const confidenceBonus = (analysis.confidence - 0.5) * 0.08;

    return clampScore(baseScore - weightedPenalty + confidenceBonus);
  })
  .generateReason(({ results, score }) => {
    const analysis = getAnalysis(results);

    if (!analysis) {
      return `False-positive suppression score=${score}. No analysis result was produced.`;
    }

    return (
      `False-positive suppression score=${score}. ` +
      `applicableSuggestions=${analysis.applicableSuggestions}, ` +
      `falsePositives=${analysis.falsePositiveFindings.length}, ` +
      `precision=${analysis.precisionLevel}, ` +
      `confidence=${analysis.confidence}. ${analysis.summary}`
    );
  });
