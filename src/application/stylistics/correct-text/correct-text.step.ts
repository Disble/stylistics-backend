import type {
  StylisticProfileContext,
  StylisticWorkflowInput,
} from "../load-author-profile/load-author-profile.types";
import {
  buildGenerateOptions,
  getGoogleSafetyBlock,
  getModelIds,
  hasGoogleModel,
  normalizeSuggestions,
} from "./correct-text.helpers";
import { buildPrompt } from "./correct-text.prompt";
import type {
  StylisticAgent,
  StylisticCorrectionLogger,
  StylisticCorrectionStepOutput,
  StylisticModelConfig,
} from "./correct-text.types";

type StylisticCorrectionResult = Awaited<
  ReturnType<StylisticAgent["generate"]>
>;

function toWorkflowInput(
  context: StylisticProfileContext,
): StylisticWorkflowInput {
  return {
    text: context.text,
    autorSlug: context.autorSlug,
    genero: context.genero,
  };
}

/**
 * Runs the structured stylistic correction pass and normalizes provider-specific
 * failures into workflow-level errors that are easier to trace in logs.
 */
export async function executeCorrectTextStep({
  agent,
  logger,
  model,
  input,
}: {
  agent?: StylisticAgent;
  logger: StylisticCorrectionLogger;
  model: StylisticModelConfig;
  input: StylisticProfileContext;
}): Promise<StylisticCorrectionStepOutput> {
  logger.info(
    {
      autorSlug: input.autorSlug,
      genero: input.genero,
      textLength: input.text.length,
    },
    "✏️ Iniciando corrección estilística",
  );

  if (!agent) {
    logger.error(
      {
        autorSlug: input.autorSlug,
      },
      "❌ Stylistic agent not found",
    );
    throw new Error("Stylistic agent not found");
  }

  logger.info(
    {
      autorSlug: input.autorSlug,
      genero: input.genero,
    },
    "🤖 Stylistic agent encontrado, iniciando corrección...",
  );

  const workflowInput = toWorkflowInput(input);
  const prompt = buildPrompt(workflowInput, input.authorProfile);
  const options = buildGenerateOptions(model, workflowInput.genero);

  logger.debug(
    {
      autorSlug: input.autorSlug,
      genero: input.genero,
      hasAuthorProfile: true,
      textLength: input.text.length,
      promptLength: prompt.length,
      fictionFrameActive: input.genero === "narrativa-literaria",
      safetySettings: options.providerOptions?.google?.safetySettings,
    },
    "stylistic-workflow prompt prepared",
  );

  let result: StylisticCorrectionResult;

  try {
    result = await agent.generate(prompt, options);
  } catch (error) {
    const modelIds = getModelIds(model);
    const safetyBlock = hasGoogleModel(model)
      ? getGoogleSafetyBlock(error)
      : undefined;

    if (safetyBlock) {
      logger.error(
        {
          autorSlug: input.autorSlug,
          genero: input.genero,
          models: modelIds,
          textLength: input.text.length,
          promptLength: prompt.length,
          ...safetyBlock,
        },
        "Google/Gemini safety block detected in stylistic workflow",
      );

      throw new Error(
        `Google/Gemini blocked stylistic correction (blockReason=${safetyBlock.blockReason}, models=${modelIds.join(",")}, autorSlug=${input.autorSlug}, genero=${input.genero})`,
        { cause: error },
      );
    }

    throw error;
  }

  if (!result.object) {
    logger.error(
      {
        autorSlug: input.autorSlug,
        finishReason: result.finishReason,
        responseModel: result.response?.modelId,
        warnings: result.warnings,
        textPreview: result.text.slice(0, 1200),
      },
      "El agente no devolvio output estructurado",
    );

    throw new Error("No output structured received from stylistic agent");
  }

  logger.info(
    {
      autorSlug: input.autorSlug,
      suggestions: result.object.suggestions.length,
      cleanPatterns: result.object.cleanPatterns.length,
    },
    "Correccion estilistica completada",
  );

  return {
    suggestions: normalizeSuggestions(result.object.suggestions),
    cleanPatterns: result.object.cleanPatterns,
    autorSlug: input.autorSlug,
  };
}
