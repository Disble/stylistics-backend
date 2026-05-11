/**
 * Implements the feedback-processing step that interprets one author comment
 * and delegates profile updates to the feedback agent.
 */
import { createStep } from "@mastra/core/workflows";
import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { logger } from "../../../../../shared/logger";
import { buildProcessFeedbackPrompt } from "./process-feedback.prompt";
import {
  processFeedbackInputSchema,
  processFeedbackOutputSchema,
  processFeedbackResultSchema,
} from "./process-feedback.schemas";

const documentContextRepository = new PgDocumentRepository();

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
        documentUuid: inputData.documentContext?.documentUuid,
      },
      "💬 Processing author feedback",
    );

    // Guard: no comment -> skip agent, return early.
    if (!inputData.comment) {
      logger.info(
        {
          category: inputData.category,
          action: inputData.action,
          documentUuid: inputData.documentContext.documentUuid,
        },
        "💬 Feedback without comment ignored",
      );
      return { received: true, receivedAt: new Date().toISOString() };
    }

    if (!inputData.documentContext?.documentStyleProfileId) {
      throw new Error(
        "Document feedback requires document style profile context.",
      );
    }

    const agent = mastra?.getAgent("documentFeedbackAgent");
    if (!agent) {
      logger.error(
        {
          documentUuid: inputData.documentContext.documentUuid,
          documentStyleProfileId:
            inputData.documentContext.documentStyleProfileId,
        },
        "❌ Document feedback agent not found",
      );
      throw new Error("Document feedback agent not found");
    }

    const prompt = buildProcessFeedbackPrompt({
      authorProfile: inputData.authorProfile,
      category: inputData.category,
      context: inputData.context,
      anchor: inputData.anchor,
      suggestedText: inputData.suggestedText,
      justification: inputData.justification,
      action: inputData.action,
      severity: inputData.severity,
      suggestionType: inputData.suggestionType,
      comment: inputData.comment,
      documentUuid: inputData.documentContext.documentUuid,
    });
    const generatedFeedback = await agent.generate(prompt, {
      structuredOutput: {
        schema: processFeedbackResultSchema,
      },
    });

    if (!generatedFeedback.object) {
      throw new Error(
        "Document feedback agent did not return structured output.",
      );
    }

    const result = processFeedbackResultSchema.parse(generatedFeedback.object);

    if (result.status === "updated") {
      if (!result.profileMarkdown) {
        throw new Error(
          "Document feedback agent returned an updated status without profile markdown.",
        );
      }

      await documentContextRepository.updateDocumentStyleProfile({
        documentStyleProfileId:
          inputData.documentContext.documentStyleProfileId,
        profileMarkdown: result.profileMarkdown,
      });
    }

    logger.info(
      {
        documentUuid: inputData.documentContext.documentUuid,
        documentStyleProfileId:
          inputData.documentContext.documentStyleProfileId,
        status: result.status,
        decisionSummary: result.decisionSummary,
      },
      "✅ Document feedback processed",
    );

    return { received: true, receivedAt: new Date().toISOString() };
  },
});
