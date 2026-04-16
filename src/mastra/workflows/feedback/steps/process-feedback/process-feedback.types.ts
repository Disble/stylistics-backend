/**
 * Defines the minimal input contract needed to build the feedback-processing
 * prompt for the feedback workflow.
 */
export interface ProcessFeedbackPromptInput {
  autorSlug: string;
  category: string;
  originalText: string;
  suggestedText: string;
  justification: string;
  rating: "positive" | "negative";
  severity: "high" | "medium" | "low";
  comment?: string;
}
