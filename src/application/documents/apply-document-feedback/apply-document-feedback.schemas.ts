import { z } from "zod";

/** Validates one document-feedback application request. */
export const applyDocumentFeedbackInputSchema = z.object({
  documentStyleProfileId: z.uuid(),
  currentProfileMarkdown: z.string().min(1),
  category: z.string().min(1),
  context: z.string().min(1),
  anchor: z.string().min(1),
  suggestedText: z.string().optional(),
  justification: z.string().min(1),
  action: z.enum(["accept", "reject"]),
  severity: z.enum(["high", "medium", "low"]),
  suggestionType: z.enum(["track-change", "comment-only"]),
  comment: z.string().optional(),
});

/** Validates the structured result returned by the document-feedback agent. */
export const applyDocumentFeedbackResultSchema = z.object({
  status: z.enum(["updated", "ignored"]),
  decisionSummary: z.string().min(1),
  profileMarkdown: z.string().min(1).optional(),
});
