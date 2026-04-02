import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  runStylisticCorrection,
  stylisticCorrectionStepSchema,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
} from "../../application/stylistics/run-stylistic-correction";
import { modelPool } from "../constants/models";
import { logger } from "../utils/logger";

const STRUCTURED_OUTPUT_MODEL = modelPool["stylistic-agent-output"];

// Step 1 produces the structured correction payload. The stylistic agent can
// read the author's profile for context, but profile mutations stay out of this step.
const correctText = createStep({
  id: "correct-text",
  description:
    "Aplica corrección ortotipográfica y de estilo integrada sobre el texto del autor",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: stylisticCorrectionStepSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        autorSlug: inputData.autorSlug,
        genero: inputData.genero,
        textLength: inputData.text.length,
      },
      "✏️ Iniciando corrección estilística",
    );

    const agent = mastra?.getAgent("stylisticAgent");
    if (!agent) {
      logger.error("❌ Stylistic agent not found");
      throw new Error("Stylistic agent not found");
    }

    logger.info("🤖 Stylistic agent encontrado, iniciando corrección...");

    return runStylisticCorrection({
      agent,
      logger,
      model: STRUCTURED_OUTPUT_MODEL,
      input: inputData,
    });
  },
});

// Step 2 updates the persistent author profile from the latest session findings
// and returns the original correction payload unchanged for the workflow caller.
const updateProfile = createStep({
  id: "update-profile",
  description:
    "Actualiza el perfil del autor con los patrones detectados en la corrección",
  inputSchema: stylisticCorrectionStepSchema,
  outputSchema: stylisticWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        autorSlug: inputData.autorSlug,
        suggestionsCount: inputData.suggestions.length,
      },
      "📋 Iniciando actualización de perfil",
    );

    const agent = mastra?.getAgent("profileAgent");
    if (!agent) {
      logger.error("❌ Profile agent not found");
      throw new Error("Profile agent not found");
    }

    const autorProfilePath = `autores/${inputData.autorSlug}.md`;

    // The profile agent works against workspace-relative paths so it can write the
    // updated author profile without the workflow needing file-system logic here.
    const prompt =
      `Actualizá el perfil del autor "${inputData.autorSlug}".\n\n` +
      `Perfil del autor: ${autorProfilePath}\n` +
      `Skill de referencia: skills/perfil-autor/SKILL.md\n\n` +
      `Sugerencias de corrección de esta sesión:\n` +
      `${JSON.stringify(inputData.suggestions, null, 2)}\n\n` +
      `Patrones encontrados limpios (evidencia positiva):\n` +
      `${JSON.stringify(inputData.cleanPatterns, null, 2)}\n\n` +
      `Ejecutá las 4 fases: OBSERVAR → TRANSICIONAR → PODAR → REFLEJAR.\n` +
      `Escribí el perfil actualizado en ${autorProfilePath} usando la herramienta de escritura del workspace.`;

    logger.debug({ prompt }, "profile-update prompt");

    await agent.generate(prompt);

    logger.info({ autorSlug: inputData.autorSlug }, "✅ Perfil actualizado");

    return {
      suggestions: inputData.suggestions,
      cleanPatterns: inputData.cleanPatterns,
    };
  },
});

// Keep the workflow thin: application logic lives in src/application and the
// workflow only orchestrates correction first, then profile maintenance.
const workflowBuilder = createWorkflow({
  id: "stylistic-workflow",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: stylisticWorkflowOutputSchema,
});
const workflowWithCorrection = workflowBuilder["then"](correctText);
const stylisticWorkflow = workflowWithCorrection["then"](updateProfile);

stylisticWorkflow.commit();

export { stylisticWorkflowInputSchema } from "../../application/stylistics/run-stylistic-correction";
export { stylisticWorkflow };
