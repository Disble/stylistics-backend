import type { StylisticWorkflowOutput } from "../correct-text/correct-text.types";
import { buildUpdateProfilePrompt } from "./update-profile.prompt";
import type {
  UpdateProfileAgent,
  UpdateProfileLogger,
  UpdateProfileStepInput,
} from "./update-profile.types";

/**
 * Updates the persistent author profile and returns the original correction payload.
 */
export async function executeUpdateProfileStep({
  agent,
  logger,
  input,
}: {
  agent?: UpdateProfileAgent;
  logger: UpdateProfileLogger;
  input: UpdateProfileStepInput;
}): Promise<StylisticWorkflowOutput> {
  logger.info(
    {
      autorSlug: input.autorSlug,
      suggestionsCount: input.suggestions.length,
    },
    "📋 Iniciando actualización de perfil",
  );

  if (!agent) {
    logger.error(
      {
        autorSlug: input.autorSlug,
      },
      "❌ Profile agent not found",
    );
    throw new Error("Profile agent not found");
  }

  const prompt = buildUpdateProfilePrompt(input);

  logger.debug(
    {
      autorSlug: input.autorSlug,
      prompt,
    },
    "profile-update prompt",
  );

  await agent.generate(prompt);

  logger.info({ autorSlug: input.autorSlug }, "✅ Perfil actualizado");

  return {
    suggestions: input.suggestions,
    cleanPatterns: input.cleanPatterns,
  };
}
