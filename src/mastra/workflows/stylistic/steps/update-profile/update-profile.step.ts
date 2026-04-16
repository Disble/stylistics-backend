/**
 * Implements the profile-update step that hands the latest correction session
 * to the dedicated profile agent.
 */
import { createStep } from "@mastra/core/workflows";
import { logger } from "../../../../utils/logger";
import { buildUpdateProfilePrompt } from "./update-profile.prompt";
import {
  updateProfileInputSchema,
  updateProfileOutputSchema,
} from "./update-profile.schemas";

// Step 2 updates the persistent author profile from the latest session findings
// and returns the original correction payload unchanged for the workflow caller.
export const updateProfile = createStep({
  id: "update-profile",
  description:
    "Actualiza el perfil del autor con los patrones detectados en la corrección",
  inputSchema: updateProfileInputSchema,
  outputSchema: updateProfileOutputSchema,
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
      logger.error(
        {
          autorSlug: inputData.autorSlug,
        },
        "❌ Profile agent not found",
      );
      throw new Error("Profile agent not found");
    }

    const prompt = buildUpdateProfilePrompt(inputData);

    logger.debug(
      {
        autorSlug: inputData.autorSlug,
        prompt,
      },
      "profile-update prompt",
    );

    // Intentionally fire-and-forget: profile persistence should not block the
    // response payload already produced for the caller.
    agent.generate(prompt);

    logger.info({ autorSlug: inputData.autorSlug }, "✅ Perfil actualizado");

    return {
      suggestions: inputData.suggestions,
      cleanPatterns: inputData.cleanPatterns,
    };
  },
});
