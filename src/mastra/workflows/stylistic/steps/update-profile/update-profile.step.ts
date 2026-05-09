/**
 * Implements the profile-update step that hands the latest correction session
 * to the dedicated profile agent.
 */
import { createStep } from "@mastra/core/workflows";
import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { logger } from "../../../../../shared/logger";
import { buildUpdateProfilePrompt } from "./update-profile.helpers";
import {
  updateDocumentStyleProfileResultSchema,
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

    const prompt = buildUpdateProfilePrompt({
      documentStyleProfileId: inputData.documentContext.documentStyleProfileId,
      currentProfileMarkdown: inputData.authorProfile,
      correctionPatternsWordCount:
        inputData.authorProfileCorrectionPatternsWordCount,
      suggestions: inputData.suggestions,
      cleanPatterns: inputData.cleanPatterns,
    });
    const generatedProfile = await agent.generate(prompt, {
      structuredOutput: {
        schema: updateDocumentStyleProfileResultSchema,
      },
    });

    if (!generatedProfile.object) {
      throw new Error(
        "Document profile agent did not return structured output.",
      );
    }

    const result = updateDocumentStyleProfileResultSchema.parse(
      generatedProfile.object,
    );

    await documentContextRepository.updateDocumentStyleProfile({
      documentStyleProfileId: inputData.documentContext.documentStyleProfileId,
      profileMarkdown: result.profileMarkdown,
    });

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
