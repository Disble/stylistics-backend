/**
 * Defines the minimal input contract needed to build the feedback-processing
 * prompt for the feedback workflow.
 */
export interface ProcessFeedbackPromptInput {
  autorSlug: string;
  authorProfile: string;
  category: string;
  context: string;
  anchor: string;
  suggestedText?: string;
  justification: string;
  action: "accept" | "reject";
  severity: "high" | "medium" | "low";
  suggestionType: "track-change" | "comment-only";
  comment?: string;
}
