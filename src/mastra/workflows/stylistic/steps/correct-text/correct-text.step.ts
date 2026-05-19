/**
 * Implements the structured stylistic-correction step that invokes the
 * registered correction agent and normalizes its result.
 */
import { createStep } from "@mastra/core/workflows";
import { logger } from "../../../../../shared/logger";
import {
  buildGenerateOptions,
  getGoogleSafetyBlock,
  normalizeWorkflowOutput,
} from "./correct-text.helpers";
import { buildPrompt } from "./correct-text.prompt";
import { correctTextScorers } from "./correct-text.scorers";
import {
  correctTextInputSchema,
  correctTextOutputSchema,
} from "./correct-text.schemas";
import type { StylisticCorrectionResult } from "./correct-text.types";

// Step 2 produces the structured correction payload using the already-loaded
// profile context from the previous workflow step.
export const correctText = createStep<
  "correct-text",
  undefined,
  typeof correctTextInputSchema,
  typeof correctTextOutputSchema
>({
  id: "correct-text",
  description:
    "Aplica corrección ortotipográfica y de estilo integrada sobre el texto del autor",
  inputSchema: correctTextInputSchema,
  outputSchema: correctTextOutputSchema,
  scorers: {
    falsePositiveSuppression: {
      scorer: correctTextScorers.falsePositiveSuppressionScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    voicePreservation: {
      scorer: correctTextScorers.voicePreservationScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        documentUuid: inputData.documentUuid,
        genero: inputData.genero,
        textLength: inputData.text.length,
      },
      "✏️ Starting stylistic correction",
    );

    const agent = mastra?.getAgent("stylisticAgent");

    if (!agent) {
      logger.error(
        {
          documentUuid: inputData.documentUuid,
        },
        "❌ Stylistic agent not found",
      );
      throw new Error("Stylistic agent not found");
    }

    logger.info(
      {
        documentUuid: inputData.documentUuid,
        genero: inputData.genero,
      },
      "🤖 Stylistic agent found, starting correction...",
    );

    const workflowInput = {
      text: inputData.text,
      genero: inputData.genero,
      documentUuid: inputData.documentUuid,
      title: inputData.title,
      processingConfig: inputData.processingConfig,
    };
    const prompt = buildPrompt(
      workflowInput,
      inputData.authorProfile,
      inputData.previousCorrection,
    );
    const options = buildGenerateOptions(workflowInput.genero);

    logger.debug(
      {
        documentUuid: inputData.documentUuid,
        genero: inputData.genero,
        hasAuthorProfile: true,
        textLength: inputData.text.length,
        promptLength: prompt.length,
        fictionFrameActive: inputData.genero === "narrativa-literaria",
        hasPreviousCorrection: Boolean(inputData.previousCorrection),
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
            documentUuid: inputData.documentUuid,
            genero: inputData.genero,
            textLength: inputData.text.length,
            promptLength: prompt.length,
            ...safetyBlock,
          },
          "Google/Gemini safety block detected in stylistic workflow",
        );

        throw new Error(
          `Google/Gemini blocked stylistic correction (blockReason=${safetyBlock.blockReason}, documentUuid=${inputData.documentUuid}, genero=${inputData.genero})`,
          { cause: error },
        );
      }

      throw error;
    }

    // The correction step requires a structured payload; free-form text is not enough.
    if (!result.object) {
      logger.error(
        {
          documentUuid: inputData.documentUuid,
          finishReason: result.finishReason,
          responseModel: result.response?.modelId,
          warnings: result.warnings,
          textPreview: result.text.slice(0, 1200),
        },
        "The agent did not return structured output",
      );

      throw new Error("No output structured received from stylistic agent");
    }

    logger.info(
      {
        documentUuid: inputData.documentUuid,
        suggestions: result.object.suggestions.length,
        cleanPatterns: result.object.cleanPatterns.length,
      },
      "Stylistic correction completed",
    );

    const normalizedOutput = normalizeWorkflowOutput(result.object);

    // Normalize transport-level portability tradeoffs before handing them to the document layer.
    return {
      suggestions: normalizedOutput.suggestions,
      cleanPatterns: normalizedOutput.cleanPatterns,
      documentContext: inputData.documentContext,
      authorProfile: inputData.authorProfile,
      authorProfileCorrectionPatternsWordCount:
        inputData.authorProfileCorrectionPatternsWordCount,
    };
  },
});
