import { z } from "zod";

import { stylisticSuggestionSchema } from "../../../mastra/workflows/stylistic/steps/correct-text/correct-text.schemas";

/** Input accepted by the document-style-profile update use case. */
export const updateDocumentStyleProfileInputSchema = z.object({
  documentStyleProfileId: z.uuid(),
  currentProfileMarkdown: z.string().min(1),
  correctionPatternsWordCount: z.number().int().nonnegative(),
  suggestions: z.array(stylisticSuggestionSchema),
  cleanPatterns: z.array(z.string()),
});

/** Structured result expected from the document-profile agent. */
export const updateDocumentStyleProfileResultSchema = z.object({
  profileMarkdown: z.string().min(1),
  changeSummary: z.string().min(1),
});
