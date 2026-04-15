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
