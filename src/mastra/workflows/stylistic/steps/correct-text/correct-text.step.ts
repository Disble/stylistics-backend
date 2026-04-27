/**
 * Implements the structured stylistic-correction step that invokes the
 * registered correction agent and normalizes its result.
 */
import { createStep } from "@mastra/core/workflows";
import { logger } from "../../../../utils/logger";
import {
  buildGenerateOptions,
  getGoogleSafetyBlock,
  normalizeSuggestions,
} from "./correct-text.helpers";
import { buildPrompt } from "./correct-text.prompt";
import {
  correctTextInputSchema,
  correctTextOutputSchema,
} from "./correct-text.schemas";
import type { StylisticCorrectionResult } from "./correct-text.types";

// Step 2 produces the structured correction payload using the already-loaded
// profile context from the previous workflow step.
export const correctText = createStep({
  id: "correct-text",
  description:
    "Aplica corrección ortotipográfica y de estilo integrada sobre el texto del autor",
  inputSchema: correctTextInputSchema,
  outputSchema: correctTextOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        autorSlug: inputData.autorSlug,
        genero: inputData.genero,
        textLength: inputData.text.length,
      },
      "✏️ Iniciando corrección estilística",
    );

    const agent = mastra?.getAgent("stylisticAgent");

    if (!agent) {
      logger.error(
        {
          autorSlug: inputData.autorSlug,
        },
        "❌ Stylistic agent not found",
      );
      throw new Error("Stylistic agent not found");
    }

    logger.info(
      {
        autorSlug: inputData.autorSlug,
        genero: inputData.genero,
      },
      "🤖 Stylistic agent encontrado, iniciando corrección...",
    );

    // Strip the step-only profile fields before building the prompt payload.
    const workflowInput = {
      text: inputData.text,
      autorSlug: inputData.autorSlug,
      genero: inputData.genero,
    };
    const prompt = buildPrompt(workflowInput, inputData.authorProfile);
    const options = buildGenerateOptions(workflowInput.genero);

    logger.debug(
      {
        autorSlug: inputData.autorSlug,
        genero: inputData.genero,
        hasAuthorProfile: true,
        textLength: inputData.text.length,
        promptLength: prompt.length,
        fictionFrameActive: inputData.genero === "narrativa-literaria",
        safetySettings: options.providerOptions?.google?.safetySettings,
      },
      "stylistic-workflow prompt prepared",
    );

    let result: StylisticCorrectionResult;

    try {
      result = await agent.generate(prompt, options);
    } catch (error) {
      // Normalize Google safety blocks into workflow-friendly contextual errors.
      const safetyBlock = getGoogleSafetyBlock(error);

      if (safetyBlock) {
        logger.error(
          {
            autorSlug: inputData.autorSlug,
            genero: inputData.genero,
            textLength: inputData.text.length,
            promptLength: prompt.length,
            ...safetyBlock,
          },
          "Google/Gemini safety block detected in stylistic workflow",
        );

        throw new Error(
          `Google/Gemini blocked stylistic correction (blockReason=${safetyBlock.blockReason}, autorSlug=${inputData.autorSlug}, genero=${inputData.genero})`,
          { cause: error },
        );
      }

      throw error;
    }

    // The correction step requires a structured payload; free-form text is not enough.
    if (!result.object) {
      logger.error(
        {
          autorSlug: inputData.autorSlug,
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
        autorSlug: inputData.autorSlug,
        suggestions: result.object.suggestions.length,
        cleanPatterns: result.object.cleanPatterns.length,
      },
      "Correccion estilistica completada",
    );

    // Normalize no-op replacements before handing them to the document layer.
    return {
      suggestions: normalizeSuggestions(result.object.suggestions),
      cleanPatterns: result.object.cleanPatterns,
      autorSlug: inputData.autorSlug,
      authorProfile: inputData.authorProfile,
      authorProfileCorrectionPatternsWordCount:
        inputData.authorProfileCorrectionPatternsWordCount,
    };
  },
});
