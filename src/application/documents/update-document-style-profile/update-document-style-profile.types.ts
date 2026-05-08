import type { z } from "zod";

import type {
  updateDocumentStyleProfileInputSchema,
  updateDocumentStyleProfileResultSchema,
} from "./update-document-style-profile.schemas";

/** Validated input accepted by the document-style-profile update use case. */
export type UpdateDocumentStyleProfileInput = z.infer<
  typeof updateDocumentStyleProfileInputSchema
>;

/** Structured result returned by the document-profile agent. */
export type UpdateDocumentStyleProfileResult = z.infer<
  typeof updateDocumentStyleProfileResultSchema
>;

/** Minimal agent contract required to generate the next document profile state. */
export type DocumentStyleProfileAgent = {
  generate: (
    prompt: string,
    options: {
      structuredOutput: {
        schema: typeof updateDocumentStyleProfileResultSchema;
      };
    },
  ) => Promise<{
    object?: UpdateDocumentStyleProfileResult;
    text: string;
  }>;
};

/** Repository contract required to persist updated document style profiles. */
export type DocumentStyleProfileRepository = {
  updateDocumentStyleProfile: (input: {
    documentStyleProfileId: string;
    profileMarkdown: string;
  }) => Promise<void>;
};
