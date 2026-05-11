/** Prompt input accepted by the document-backed feedback prompt builder. */
export type ProcessFeedbackPromptInput = {
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
  documentUuid: string;
};

/** Structured result produced after one feedback comment is processed. */
export type ProcessFeedbackResult = {
  status: "updated" | "ignored";
  decisionSummary: string;
  profileMarkdown?: string;
};
