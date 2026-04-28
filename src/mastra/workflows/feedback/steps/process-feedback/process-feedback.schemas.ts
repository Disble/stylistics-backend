/**
 * Declares the schemas for the process-feedback step.
 */
import { z } from "zod";
import { loadAuthorProfileOutputSchema } from "../load-author-profile";

export const processFeedbackInputSchema = loadAuthorProfileOutputSchema;

export const processFeedbackOutputSchema = z.object({
  received: z.boolean(),
  receivedAt: z.string(),
});
