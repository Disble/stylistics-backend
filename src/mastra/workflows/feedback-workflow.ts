import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logger } from "../utils/logger";

const feedbackWorkflowInputSchema = z.object({
  category: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  justification: z.string().describe(
    "Justificación original del corrector. Permite al agente distinguir entre errores normativos y decisiones estilísticas intencionales.",
  ),
  rating: z.enum(["positive", "negative"]),
  severity: z.enum(["high", "medium", "low"]),
  comment: z.string().optional(),
});

const feedbackWorkflowOutputSchema = z.object({
  received: z.boolean(),
  receivedAt: z.string(),
});

// Single step: process the author's feedback
const processFeedback = createStep({
  id: "process-feedback",
  description:
    "Procesa el feedback del autor sobre una corrección y actualiza su perfil si corresponde",
  inputSchema: feedbackWorkflowInputSchema,
  outputSchema: feedbackWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        category: inputData.category,
        rating: inputData.rating,
        severity: inputData.severity,
        hasComment: !!inputData.comment,
      },
      "💬 Procesando feedback del autor",
    );

    // Guard: no comment → skip agent, return early
    if (!inputData.comment) {
      logger.info(
        { category: inputData.category, rating: inputData.rating },
        "💬 Feedback sin comentario, ignorado",
      );
      return { received: true, receivedAt: new Date().toISOString() };
    }

    // Comment present → invoke feedback agent
    const agent = mastra?.getAgent("feedbackAgent");
    if (!agent) {
      logger.error("❌ Feedback agent not found");
      throw new Error("Feedback agent not found");
    }

    logger.info("🤖 Feedback agent encontrado, procesando comentario...");

    const autorProfilePath = `autores/disble.md`; // hardcoded for alpha
    const skillPath = `skills/feedback-autor/SKILL.md`;

    const prompt =
      `Procesá el siguiente feedback del autor sobre una corrección.\n\n` +
      `Perfil del autor: ${autorProfilePath}\n` +
      `Skill de referencia: ${skillPath}\n\n` +
      `Payload de feedback:\n` +
      `${JSON.stringify(inputData, null, 2)}\n\n` +
      `Ejecutá el protocolo completo: LEER → RAZONAR → DECIDIR → ACTUAR.\n` +
      `Confirmá al final si actualizaste el perfil o descartaste el feedback, con la razón.`;

    // Fire-and-forget: no need to await structured output
    await agent.generate(prompt);

    logger.info("✅ Feedback procesado");

    return { received: true, receivedAt: new Date().toISOString() };
  },
});

// Workflow: single step
const feedbackWorkflow = createWorkflow({
  id: "feedback-workflow",
  inputSchema: feedbackWorkflowInputSchema,
  outputSchema: feedbackWorkflowOutputSchema,
}).then(processFeedback);

feedbackWorkflow.commit();

export { feedbackWorkflow, feedbackWorkflowInputSchema };
