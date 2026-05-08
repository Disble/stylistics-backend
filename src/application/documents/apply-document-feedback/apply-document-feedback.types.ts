import type { z } from "zod";

import type {
  applyDocumentFeedbackInputSchema,
  applyDocumentFeedbackResultSchema,
} from "./apply-document-feedback.schemas";

/** Validated input accepted by the document-feedback use case. */
export type ApplyDocumentFeedbackInput = z.infer<
  typeof applyDocumentFeedbackInputSchema
>;

/** Structured result produced after one feedback comment is processed. */
export type ApplyDocumentFeedbackResult = z.infer<
  typeof applyDocumentFeedbackResultSchema
>;

/** Minimal agent contract required to interpret one document feedback event. */
export type DocumentFeedbackAgent = {
  generate: (
    prompt: string,
    options: {
      structuredOutput: {
        schema: typeof applyDocumentFeedbackResultSchema;
      };
    },
  ) => Promise<{
    object?: unknown;
  }>;
};

/** Persistence boundary needed by the document-feedback use case. */
export type DocumentFeedbackRepository = {
  updateDocumentStyleProfile: (input: {
    documentStyleProfileId: string;
    profileMarkdown: string;
  }) => Promise<void>;
};
