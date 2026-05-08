import { resolveDocumentContextInputSchema } from "./resolve-document-context.schemas";
import type {
  DocumentContextRepository,
  ResolveDocumentContextInput,
  ResolvedDocumentContext,
} from "./resolve-document-context.types";

/**
 * Validates and resolves the persisted document context for one authenticated
 * document request.
 */
export async function resolveDocumentContext(
  input: ResolveDocumentContextInput,
  repository: DocumentContextRepository,
): Promise<ResolvedDocumentContext> {
  const parsedInput = resolveDocumentContextInputSchema.parse(input);

  return repository.resolveDocumentContext(parsedInput);
}
