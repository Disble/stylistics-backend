import type { z } from "zod";

import type { DocumentGenre } from "../../../domain/documents/document.types";
import type { resolveDocumentContextInputSchema } from "./resolve-document-context.schemas";

/** Validated input accepted by the document-context resolution use case. */
export type ResolveDocumentContextInput = z.infer<
  typeof resolveDocumentContextInputSchema
>;

/** Persisted document context returned after resolution/upsert. */
export type ResolvedDocumentContext = {
  document: {
    id: string;
    userId: string;
    externalDocumentKey: string;
    title: string | null;
    lastUsedAt: Date;
  };
  preferences: {
    id: string;
    documentId: string;
    defaultGenre: DocumentGenre;
    processingConfig: Record<string, unknown>;
  };
  styleProfile: {
    id: string;
    documentId: string;
    profileMarkdown: string;
  };
};

/** Repository contract required by the document-context resolution use case. */
export type DocumentContextRepository = {
  resolveDocumentContext(
    input: ResolveDocumentContextInput,
  ): Promise<ResolvedDocumentContext>;
};
