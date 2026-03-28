import type { AgentConfig } from "@mastra/core/agent";
import type { z } from "zod";

import type {
  stylisticCommentOnlySuggestionSchema,
  stylisticCorrectionStepSchema,
  stylisticTrackChangeSuggestionSchema,
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

/** A suggestion that proposes a concrete text replacement (tracked change). */
export type TrackChangeSuggestion = z.infer<
  typeof stylisticTrackChangeSuggestionSchema
>;

/** A suggestion that leaves the original text unchanged and adds an editorial comment. */
export type CommentOnlySuggestion = z.infer<
  typeof stylisticCommentOnlySuggestionSchema
>;

/** Discriminated union over all suggestion variants. Narrow with `suggestion.type`. */
export type WorkflowSuggestion = TrackChangeSuggestion | CommentOnlySuggestion;

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
