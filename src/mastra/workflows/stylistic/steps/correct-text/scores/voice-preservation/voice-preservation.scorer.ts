import { createScorer } from "@mastra/core/evals";

import { evalModelPool } from "../../../../../../constants/models";
import type {
  CorrectTextStepInput,
  StylisticCorrectionStepOutput,
} from "../../correct-text.types";
import { preservationScoreMap } from "./voice-preservation-scorer.constants";
import {
  clampScore,
  getAnalysis,
  limitText,
  toPrettyJson,
} from "./voice-preservation-scorer.helpers";
import { voicePreservationAnalysisSchema } from "./voice-preservation-scorer.schemas";

/** Runtime scorer that checks preservation of author voice and genre license. */
export const voicePreservationScorer = createScorer<
  CorrectTextStepInput,
  StylisticCorrectionStepOutput
>({
  id: "correct-text-voice-preservation-scorer",
  name: "Correct Text Voice Preservation",
  description:
    "Checks whether stylistic corrections preserve author voice, register, and plausible genre licenses while still fixing real problems.",
  judge: {
    model: evalModelPool.standard,
    instructions:
      "You evaluate whether a stylistic correction step preserves the author's voice. Penalize suggestions that erase register, flatten tone, remove plausible literary license, or over-normalize a text beyond what the evidence justifies. " +
      "Return only structured JSON matching the provided schema.",
  },
})
  .analyze({
    description:
      "Detect suggestions that drift away from the author's voice, register, or genre conventions.",
    outputSchema: voicePreservationAnalysisSchema,
    createPrompt: ({ run }) => `
Evalúa si estas sugerencias preservan la voz autoral y las licencias plausibles del género.

Texto original:
"""
${run.input?.text ?? ""}
"""

Género: ${run.input?.genero ?? "general"}

Perfil autoral disponible:
"""
${limitText(run.input?.authorProfile ?? "")}
"""

Sugerencias emitidas:
${toPrettyJson(run.output.suggestions)}

Reglas:
1. Penaliza sugerencias que suavizan innecesariamente el registro, borran tono o ritmo propios, o reemplazan recursos plausibles del género sin necesidad real.
2. Penaliza cambios que aplanan imágenes, personajes, oralidad o tensión narrativa solo para sonar más neutros o más variados.
3. No penalices correcciones normativas inequívocas ni mejoras de claridad con evidencia fuerte.
4. Evalúa si el registro se preserva y si se respetan licencias plausibles del género.
5. Resume el resultado como \`strong\`, \`mixed\` o \`weak\`.

Devuelve JSON con:
- voiceDriftFindings: array of { anchor, category, concern, severity }
- preservesRegister: boolean
- preservesGenreLicense: boolean
- preservationLevel: "strong" | "mixed" | "weak"
- confidence: number entre 0 y 1
- summary: string
`,
  })
  .generateScore(({ results }) => {
    const analysis = getAnalysis(results);

    if (!analysis) {
      return 0;
    }

    const strongCount = analysis.voiceDriftFindings.filter(
      (finding) => finding.severity === "strong",
    ).length;
    const moderateCount = analysis.voiceDriftFindings.length - strongCount;
    const weightedPenalty = strongCount * 0.22 + moderateCount * 0.1;
    const baseScore = preservationScoreMap[analysis.preservationLevel];
    const registerAdjustment = analysis.preservesRegister ? 0.04 : -0.08;
    const genreAdjustment = analysis.preservesGenreLicense ? 0.04 : -0.08;
    const confidenceBonus = (analysis.confidence - 0.5) * 0.08;

    return clampScore(
      baseScore -
        weightedPenalty +
        registerAdjustment +
        genreAdjustment +
        confidenceBonus,
    );
  })
  .generateReason(({ results, score }) => {
    const analysis = getAnalysis(results);

    if (!analysis) {
      return `Voice preservation score=${score}. No analysis result was produced.`;
    }

    return (
      `Voice preservation score=${score}. ` +
      `driftFindings=${analysis.voiceDriftFindings.length}, ` +
      `preservesRegister=${analysis.preservesRegister}, ` +
      `preservesGenreLicense=${analysis.preservesGenreLicense}, ` +
      `preservation=${analysis.preservationLevel}, ` +
      `confidence=${analysis.confidence}. ${analysis.summary}`
    );
  });
