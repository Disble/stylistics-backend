import type { DocumentGenre } from "./document.types";

/** Input required to resolve or create a persisted document context. */
export type ResolveDocumentContextInput = {
  userId: string;
  externalDocumentKey: string;
  title?: string;
  defaultGenre?: DocumentGenre;
  processingConfig?: Record<string, unknown>;
};

/** Persisted document context returned after document resolution. */
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

/** Repository contract for resolving persisted document context. */
export type DocumentContextRepository = {
  resolveDocumentContext(
    input: ResolveDocumentContextInput,
  ): Promise<ResolvedDocumentContext>;
};
