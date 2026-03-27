import type { AgentConfig } from "@mastra/core/agent";
import type { z } from "zod";

import type {
  stylisticCorrectionStepSchema,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
} from "./run-stylistic-correction.schemas";

/** Matches the `model` parameter of Mastra's Agent constructor. */
export type StylisticModelConfig = AgentConfig["model"];

export type StylisticWorkflowInput = z.infer<
  typeof stylisticWorkflowInputSchema
>;

export type StylisticWorkflowOutput = z.infer<
  typeof stylisticWorkflowOutputSchema
>;

export type StylisticCorrectionStepOutput = z.infer<
  typeof stylisticCorrectionStepSchema
>;

export type StylisticGenerateOptions = {
  structuredOutput: { schema: typeof stylisticWorkflowOutputSchema };
  modelSettings: { temperature: number };
  providerOptions?: {
    google?: {
      safetySettings: readonly {
        category: string;
        threshold: string;
      }[];
    };
  };
};

export type StylisticAgent = {
  generate: (
    prompt: string,
    options: StylisticGenerateOptions,
  ) => Promise<{
    object?: StylisticWorkflowOutput;
    text: string;
    finishReason?: unknown;
    warnings?: unknown;
    response?: {
      modelId?: unknown;
    };
  }>;
};

export type StylisticCorrectionLogger = {
  debug: (object: Record<string, unknown>, message: string) => void;
  info: (object: Record<string, unknown>, message: string) => void;
  error: (object: Record<string, unknown>, message: string) => void;
};

export type GoogleSafetyBlock = {
  blockReason: string;
  statusCode?: number;
  errorName?: string;
  errorMessage?: string;
  promptTokenCount?: number;
  totalTokenCount?: number;
  safetyRatings?: unknown[];
};
