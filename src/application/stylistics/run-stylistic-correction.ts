import {
  buildGenerateOptions,
  buildPrompt,
  getGoogleSafetyBlock,
  getModelIds,
  hasGoogleModel,
} from "./run-stylistic-correction.helpers";
import {
  stylisticCorrectionStepSchema,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
} from "./run-stylistic-correction.schemas";
import type {
  StylisticAgent,
  StylisticCorrectionLogger,
  StylisticCorrectionStepOutput,
  StylisticModelConfig,
  StylisticWorkflowInput,
} from "./run-stylistic-correction.types";

export type { StylisticWorkflowInput };
export {
  stylisticCorrectionStepSchema,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
};

type StylisticCorrectionResult = Awaited<
  ReturnType<StylisticAgent["generate"]>
>;

/**
 * Runs the structured stylistic correction pass and normalizes provider-specific
 * failures into workflow-level errors that are easier to trace in logs.
 */
export async function runStylisticCorrection({
  agent,
  logger,
  model,
  input,
}: {
  agent: StylisticAgent;
  logger: StylisticCorrectionLogger;
  model: StylisticModelConfig;
  input: StylisticWorkflowInput;
}): Promise<StylisticCorrectionStepOutput> {
  const prompt = buildPrompt(input);
  const options = buildGenerateOptions(model, input.genero);

  logger.debug(
    {
      autorSlug: input.autorSlug,
      genero: input.genero,
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
    suggestions: result.object.suggestions,
    cleanPatterns: result.object.cleanPatterns,
    autorSlug: input.autorSlug,
  };
}
