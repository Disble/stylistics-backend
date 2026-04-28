/**
 * Implements the feedback-processing step that interprets one author comment
 * and delegates profile updates to the feedback agent.
 */
import { createStep } from "@mastra/core/workflows";
import { logger } from "../../../../utils/logger";
import { buildProcessFeedbackPrompt } from "./process-feedback.prompt";
import {
  processFeedbackInputSchema,
  processFeedbackOutputSchema,
} from "./process-feedback.schemas";

export const processFeedback = createStep({
  id: "process-feedback",
  description:
    "Procesa el feedback del autor sobre una corrección y actualiza su perfil si corresponde",
  inputSchema: processFeedbackInputSchema,
  outputSchema: processFeedbackOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        category: inputData.category,
        action: inputData.action,
        severity: inputData.severity,
        suggestionType: inputData.suggestionType,
        hasComment: !!inputData.comment,
      },
      "💬 Procesando feedback del autor",
    );

    // Guard: no comment -> skip agent, return early.
    if (!inputData.comment) {
      logger.info(
        { category: inputData.category, action: inputData.action },
        "💬 Feedback sin comentario, ignorado",
      );
      return { received: true, receivedAt: new Date().toISOString() };
    }

    const agent = mastra?.getAgent("feedbackAgent");
    if (!agent) {
      logger.error("❌ Feedback agent not found");
      throw new Error("Feedback agent not found");
    }

    logger.info("🤖 Feedback agent encontrado, procesando comentario...");

    const prompt = buildProcessFeedbackPrompt(inputData);

    // Await completion so failures still surface through the workflow contract.
    await agent.generate(prompt);

    logger.info("✅ Feedback procesado");

    return { received: true, receivedAt: new Date().toISOString() };
  },
});
