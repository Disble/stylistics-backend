import type { z } from "zod";

import type {
  stylisticProfileContextSchema,
  stylisticWorkflowInputSchema,
} from "./load-author-profile.schemas";

export type StylisticWorkflowInput = z.infer<
  typeof stylisticWorkflowInputSchema
>;

export type StylisticProfileContext = z.infer<
  typeof stylisticProfileContextSchema
>;

export type LoadAuthorProfileLogger = {
  info: (object: Record<string, unknown>, message: string) => void;
  error: (object: Record<string, unknown>, message: string) => void;
};
