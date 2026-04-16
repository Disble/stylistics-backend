/**
 * Centralizes the inferred input/output types used by the load-author-profile
 * workflow step and adjacent stylistic steps.
 */
import type { z } from "zod";

import type {
  stylisticProfileContextSchema,
  stylisticWorkflowInputSchema,
} from "./load-author-profile.schemas";

/** Represents the public input accepted by the stylistic workflow. */
export type StylisticWorkflowInput = z.infer<
  typeof stylisticWorkflowInputSchema
>;

/** Represents the workflow context after the author profile has been resolved. */
export type StylisticProfileContext = z.infer<
  typeof stylisticProfileContextSchema
>;

/** Minimal logger surface consumed by the load-author-profile step helpers. */
export type LoadAuthorProfileLogger = {
  info: (object: Record<string, unknown>, message: string) => void;
  error: (object: Record<string, unknown>, message: string) => void;
};
