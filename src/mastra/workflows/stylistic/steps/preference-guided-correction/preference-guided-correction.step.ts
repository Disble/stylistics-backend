/**
 * Runs a preference-scoped correction pass before the integrated correction
 * step, or passes the context through untouched when no user preferences exist.
 */
import type { BetterAuthUser } from "@mastra/auth-better-auth";
import { createStep } from "@mastra/core/workflows";

import { PgUserPreferencesRepository } from "../../../../../infrastructure/persistence/repositories/user-preferences.repository";
import { logger } from "../../../../../shared/logger";
import {
  buildGenerateOptions,
  getGoogleSafetyBlock,
  normalizeSuggestions,
} from "../correct-text/correct-text.helpers";
import type { StylisticCorrectionResult } from "../correct-text/correct-text.types";
import { buildPreferenceGuidedCorrectionPrompt } from "./preference-guided-correction.prompt";
import {
  preferenceGuidedCorrectionInputSchema,
  preferenceGuidedCorrectionOutputSchema,
} from "./preference-guided-correction.schemas";

const userPreferencesRepository = new PgUserPreferencesRepository();

function getAuthenticatedUserId(requestContext: {
  get?: <TKey extends string, TValue>(key: TKey) => TValue | undefined;
}) {
  return requestContext.get?.<"user", BetterAuthUser | undefined>("user")?.user
    .id;
}

// Step 2 runs an optional preference-scoped pass and enriches the handoff to the
// integrated correction step with one previous structured correction payload.
export const preferenceGuidedCorrection = createStep({
  id: "preference-guided-correction",
  description:
    "Ejecuta una corrección previa guiada por preferencias explícitas del usuario",
  inputSchema: preferenceGuidedCorrectionInputSchema,
  outputSchema: preferenceGuidedCorrectionOutputSchema,
  execute: async ({ inputData, mastra, requestContext }) => {
    const userId = getAuthenticatedUserId(requestContext ?? {});
    const correctionInstructions = userId
      ? (await userPreferencesRepository.getUserPreferences(userId))
          .correctionInstructions
      : null;

    if (!correctionInstructions) {
      logger.info(
        {
          documentUuid: inputData.documentUuid,
          genero: inputData.genero,
        },
        "↪️ Skipping preference-guided correction: no user preferences",
      );

      return {
        ...inputData,
        previousCorrection: null,
      };
    }

    const agent = mastra?.getAgent("stylisticAgent");

    if (!agent) {
      logger.error(
        {
          documentUuid: inputData.documentUuid,
        },
        "❌ Stylistic agent not found for preference-guided correction",
      );
      throw new Error("Stylistic agent not found");
    }

    const workflowInput = {
      text: inputData.text,
      genero: inputData.genero,
      documentUuid: inputData.documentUuid,
      title: inputData.title,
      processingConfig: inputData.processingConfig,
    };
    const prompt = buildPreferenceGuidedCorrectionPrompt(
      workflowInput,
      inputData.authorProfile,
      correctionInstructions,
    );
    const options = buildGenerateOptions(workflowInput.genero);

    logger.debug(
      {
        documentUuid: inputData.documentUuid,
        genero: inputData.genero,
        textLength: inputData.text.length,
        promptLength: prompt.length,
        hasCorrectionInstructions: true,
      },
      "preference-guided-correction prompt prepared",
    );

    let result: StylisticCorrectionResult;

    try {
      result = await agent.generate(prompt, options);
    } catch (error) {
      const safetyBlock = getGoogleSafetyBlock(error);

      if (safetyBlock) {
        logger.error(
          {
            documentUuid: inputData.documentUuid,
            genero: inputData.genero,
            textLength: inputData.text.length,
            promptLength: prompt.length,
            ...safetyBlock,
          },
          "Google/Gemini safety block detected in preference-guided correction",
        );

        throw new Error(
          `Google/Gemini blocked preference-guided correction (blockReason=${safetyBlock.blockReason}, documentUuid=${inputData.documentUuid}, genero=${inputData.genero})`,
          { cause: error },
        );
      }

      throw error;
    }

    if (!result.object) {
      logger.error(
        {
          documentUuid: inputData.documentUuid,
          finishReason: result.finishReason,
          responseModel: result.response?.modelId,
          warnings: result.warnings,
          textPreview: result.text.slice(0, 1200),
        },
        "Preference-guided correction did not return structured output",
      );

      throw new Error(
        "No output structured received from preference-guided correction",
      );
    }

    logger.info(
      {
        documentUuid: inputData.documentUuid,
        suggestions: result.object.suggestions.length,
        cleanPatterns: result.object.cleanPatterns.length,
      },
      "Preference-guided correction completed",
    );

    return {
      ...inputData,
      previousCorrection: {
        suggestions: normalizeSuggestions(result.object.suggestions),
        cleanPatterns: result.object.cleanPatterns,
      },
    };
  },
});
