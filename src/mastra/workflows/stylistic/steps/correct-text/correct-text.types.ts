/**
 * Groups the inferred and helper types used by the stylistic correction step.
 */
import type { z } from "zod";

import type { StylisticProfileContext } from "../load-author-profile/load-author-profile.types";
import type {
  stylisticCommentOnlySuggestionSchema,
  stylisticCorrectionStepSchema,
  stylisticTrackChangeSuggestionSchema,
  stylisticWorkflowOutputSchema,
} from "./correct-text.schemas";

/** Represents the raw result returned by the correction agent invocation. */
export type StylisticCorrectionResult = Awaited<
  ReturnType<StylisticAgent["generate"]>
>;

/** Represents the public workflow payload emitted after profile update. */
export type StylisticWorkflowOutput = z.infer<
  typeof stylisticWorkflowOutputSchema
>;

/** Represents the correction-step payload before the profile-update handoff. */
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

/** Describes the generate options used by the stylistic correction step. */
export type StylisticGenerateOptions = {
  structuredOutput: {
    schema: typeof stylisticWorkflowOutputSchema;
  };
  modelSettings: { temperature: number };
  providerOptions?: {
    google?: {
      safetySettings: {
        category: string;
        threshold: string;
      }[];
    };
  };
};

/** Minimal agent surface required by the correction step and its tests. */
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
/** Minimal logger surface shared across stylistic workflow steps. */

export type StylisticCorrectionLogger = {
  debug: (object: Record<string, unknown>, message: string) => void;
  info: (object: Record<string, unknown>, message: string) => void;
  error: (object: Record<string, unknown>, message: string) => void;
};
/** Normalized provider safety metadata extracted from nested thrown errors. */

export type GoogleSafetyBlock = {
  blockReason: string;
  statusCode?: number;
  errorName?: string;
  errorMessage?: string;
  promptTokenCount?: number;
  totalTokenCount?: number;
  safetyRatings?: unknown[];
};

/** Aliases the correction-step input to the already-loaded profile context. */
export type CorrectTextStepInput = StylisticProfileContext;
