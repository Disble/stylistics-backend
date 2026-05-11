/**
 * Declares the schemas for the process-feedback step.
 */
import { z } from "zod";

export { loadAuthorProfileOutputSchema as processFeedbackInputSchema } from "../load-author-profile";

export const processFeedbackOutputSchema = z.object({
  received: z.boolean(),
  receivedAt: z.string(),
});

/** Validates the structured result returned by the document-feedback agent. */
export const processFeedbackResultSchema = z.object({
  status: z.enum(["updated", "ignored"]),
  decisionSummary: z.string().min(1),
  profileMarkdown: z.string().min(1).optional(),
});
