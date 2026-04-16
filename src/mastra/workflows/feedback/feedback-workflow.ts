/**
 * Defines the feedback workflow that classifies author feedback and delegates
 * actionable comments to the profile-feedback agent.
 */
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logger } from "../../utils/logger";
import { buildProcessFeedbackPrompt } from "./steps";

/** Validates the payload received from the frontend feedback form. */
const feedbackWorkflowInputSchema = z.object({
  category: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  justification: z
    .string()
    .describe(
      "Justificación original del corrector. Permite al agente distinguir entre errores normativos y decisiones estilísticas intencionales.",
    ),
  rating: z.enum(["positive", "negative"]),
  severity: z.enum(["high", "medium", "low"]),
  comment: z.string().optional(),
  autorSlug: z.string().default("disble"),
});

/** Describes the acknowledgement payload returned by the feedback workflow. */
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

    // Guard: no comment -> skip agent, return early.
    if (!inputData.comment) {
      logger.info(
        { category: inputData.category, rating: inputData.rating },
        "💬 Feedback sin comentario, ignorado",
      );
      return { received: true, receivedAt: new Date().toISOString() };
    }

    // Comment present -> invoke the feedback agent with the colocated prompt builder.
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

// Keep the workflow declarative: one validated handoff into the feedback step.
const feedbackWorkflow = createWorkflow({
  id: "feedback-workflow",
  inputSchema: feedbackWorkflowInputSchema,
  outputSchema: feedbackWorkflowOutputSchema,
}).then(processFeedback); // NOSONAR - Mastra DSL chaining, not Promise chaining

feedbackWorkflow.commit();

export { feedbackWorkflow, feedbackWorkflowInputSchema };
