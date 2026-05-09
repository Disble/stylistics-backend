import { createScorer } from "@mastra/core/evals";
import {
  getAssistantMessageFromRunOutput,
  getCombinedSystemPrompt,
  getUserMessageFromRunInput,
} from "@mastra/evals/scorers/utils";

import { evalModelPool } from "../../../../constants/models";
import { complianceScoreMap } from "./instruction-compliance-scorer.constants";
import {
  clampScore,
  extractTagContent,
  getAnalysis,
} from "./instruction-compliance-scorer.helpers";
import { instructionComplianceAnalysisSchema } from "./instruction-compliance-scorer.schemas";

/** Runtime scorer that checks compliance with explicit user intervention limits. */
export const instructionComplianceScorer = createScorer({
  id: "stylistic-instruction-compliance-scorer",
  name: "Stylistic Instruction Compliance",
  description:
    "Checks whether the stylistic agent respects explicit user intervention limits and audit focuses embedded in the execution prompt.",
  type: "agent",
  judge: {
    model: evalModelPool.standard,
    instructions:
      "You evaluate whether a stylistic correction agent respected the explicit user instructions embedded in the execution prompt. " +
      "Treat explicit user limits such as 'solo errores normativos', 'no tocar puntuación expresiva', 'preservar frases largas' or 'no suavizar registro' as real operational constraints. " +
      "Do not score against the agent's generic editing preferences alone. Focus on whether the output stayed within the user-defined intervention scope. " +
      "Return only structured JSON matching the provided schema.",
  },
})
  .preprocess(({ run }) => {
    const executionPrompt = getUserMessageFromRunInput(run.input) ?? "";
    const focusSection = extractTagContent(executionPrompt, "focos-usuario");
    const responseText =
      getAssistantMessageFromRunOutput(run.output) ??
      JSON.stringify(run.output, null, 2);

    return {
      focusSection,
      responseText,
      systemPrompt: getCombinedSystemPrompt(run.input),
    };
  })
  .analyze({
    description:
      "Determine whether the agent respected explicit user restrictions or audit focuses from the prompt.",
    outputSchema: instructionComplianceAnalysisSchema,
    createPrompt: ({ results }) => `
Evalúa el cumplimiento de instrucciones explícitas del usuario por parte de un agente de corrección estilística.

Sección <focos-usuario> del prompt de ejecución:
"""
${results.preprocessStepResult.focusSection}
"""

Salida del agente:
"""
${results.preprocessStepResult.responseText}
"""

Reglas:
1. Si la sección indica que no hay instrucciones globales, marca \`hasExplicitInstructions\` en false y no inventes incumplimientos.
2. Distingue entre:
   - \`restriction\`: límites explícitos de intervención (ej. solo errores normativos, no tocar puntuación expresiva, preservar frases largas, no suavizar registro).
   - \`focus\`: focos de auditoría que orientan revisión pero no obligan a encontrar hallazgos.
   - \`mixed\`: combina límites y focos.
3. Marca violaciones solo cuando la salida claramente se sale del alcance fijado por el usuario.
4. No penalices correcciones normativas inequívocas aunque haya restricciones estilísticas, salvo que contradigan de forma clara la instrucción explícita.
5. Resume si el cumplimiento fue \`strong\`, \`partial\` o \`weak\`.

Devuelve JSON con:
- hasExplicitInstructions: boolean
- instructionMode: "none" | "restriction" | "focus" | "mixed"
- complianceLevel: "strong" | "partial" | "weak"
- violations: array of { anchor, category, reason }
- confidence: number entre 0 y 1
- summary: string
`,
  })
  .generateScore(({ results }) => {
    const analysis = getAnalysis(results);

    if (!analysis?.hasExplicitInstructions) {
      return 1;
    }

    const violationPenalty = Math.min(0.6, analysis.violations.length * 0.15);
    const confidenceBonus = (analysis.confidence - 0.5) * 0.1;
    const baseScore = complianceScoreMap[analysis.complianceLevel];

    return clampScore(baseScore - violationPenalty + confidenceBonus);
  })
  .generateReason(({ results, score }) => {
    const analysis = getAnalysis(results);

    if (!analysis) {
      return `Instruction compliance score=${score}. No analysis result was produced.`;
    }

    if (!analysis.hasExplicitInstructions) {
      return `Instruction compliance score=${score}. No explicit user instructions were present in <focos-usuario>.`;
    }

    return `Instruction compliance score=${score}. mode=${analysis.instructionMode}, compliance=${analysis.complianceLevel}, violations=${analysis.violations.length}, confidence=${analysis.confidence}. ${analysis.summary}`;
  });
