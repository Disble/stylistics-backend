/**
 * Implements the feedback-processing step that interprets one author comment
 * and delegates profile updates to the feedback agent.
 */
import { createStep } from "@mastra/core/workflows";
import { applyDocumentFeedback } from "../../../../../application/documents/apply-document-feedback";
import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { logger } from "../../../../utils/logger";
import {
  processFeedbackInputSchema,
  processFeedbackOutputSchema,
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

    const result = await applyDocumentFeedback(
      {
        documentStyleProfileId:
          inputData.documentContext.documentStyleProfileId,
        currentProfileMarkdown: inputData.authorProfile,
        category: inputData.category,
        context: inputData.context,
        anchor: inputData.anchor,
        suggestedText: inputData.suggestedText,
        justification: inputData.justification,
        action: inputData.action,
        severity: inputData.severity,
        suggestionType: inputData.suggestionType,
        comment: inputData.comment,
      },
      {
        agent,
        repository: documentContextRepository,
      },
    );

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
