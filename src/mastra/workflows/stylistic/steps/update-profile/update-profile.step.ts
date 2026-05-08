/**
 * Implements the profile-update step that hands the latest correction session
 * to the dedicated profile agent.
 */
import { createStep } from "@mastra/core/workflows";
import { updateDocumentStyleProfile } from "../../../../../application/documents/update-document-style-profile";
import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { logger } from "../../../../utils/logger";
import {
  updateProfileInputSchema,
  updateProfileOutputSchema,
} from "./update-profile.schemas";

const documentContextRepository = new PgDocumentRepository();

// Step 2 updates the persistent author profile from the latest session findings
// and returns the original correction payload unchanged for the workflow caller.
export const updateProfile = createStep({
  id: "update-profile",
  description:
    "Actualiza el perfil del autor con los patrones detectados en la corrección",
  inputSchema: updateProfileInputSchema,
  outputSchema: updateProfileOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("documentProfileAgent");

    if (!agent) {
      logger.error(
        {
          documentUuid: inputData.documentContext.documentUuid,
          documentStyleProfileId:
            inputData.documentContext.documentStyleProfileId,
        },
        "❌ Document profile agent not found",
      );
      throw new Error("Document profile agent not found");
    }

    const result = await updateDocumentStyleProfile(
      {
        documentStyleProfileId:
          inputData.documentContext.documentStyleProfileId,
        currentProfileMarkdown: inputData.authorProfile,
        correctionPatternsWordCount:
          inputData.authorProfileCorrectionPatternsWordCount,
        suggestions: inputData.suggestions,
        cleanPatterns: inputData.cleanPatterns,
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
        suggestionsCount: inputData.suggestions.length,
        cleanPatternsCount: inputData.cleanPatterns.length,
        changeSummary: result.changeSummary,
      },
      "📋 Document profile updated in DB",
    );

    return {
      suggestions: inputData.suggestions,
      cleanPatterns: inputData.cleanPatterns,
    };
  },
});
