/**
 * Implements the author-profile loading step for the feedback workflow.
 */
import type { BetterAuthUser } from "@mastra/auth-better-auth";
import { createStep } from "@mastra/core/workflows";
import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { logger } from "../../../../../shared/logger";
import {
  loadAuthorProfileInputSchema,
  loadAuthorProfileOutputSchema,
} from "./load-author-profile.schemas";

const documentContextRepository = new PgDocumentRepository();

function getAuthenticatedUserId(requestContext: {
  get: <TKey extends string, TValue>(key: TKey) => TValue | undefined;
}) {
  return requestContext.get<"user", BetterAuthUser | undefined>("user")?.user
    .id;
}

// Step 1 resolves the author profile as explicit workflow state so profile IO
// remains visible in Mastra traces before any model call happens.
export const loadAuthorProfile = createStep({
  id: "load-author-profile",
  description:
    "Loads the author profile and attaches it to the context before processing feedback",
  inputSchema: loadAuthorProfileInputSchema,
  outputSchema: loadAuthorProfileOutputSchema,
  execute: async ({ inputData, requestContext }) => {
    const userId = getAuthenticatedUserId(requestContext);

    if (!userId) {
      throw new Error(
        "Authenticated user is required to resolve document profile context.",
      );
    }

    logger.info(
      {
        documentUuid: inputData.documentUuid,
        category: inputData.category,
        action: inputData.action,
      },
      "📚 Resolving document profile for feedback",
    );

    const resolvedContext =
      await documentContextRepository.resolveDocumentContext({
        userId,
        externalDocumentKey: inputData.documentUuid,
      });

    logger.info(
      {
        documentUuid: inputData.documentUuid,
        documentId: resolvedContext.document.id,
        documentStyleProfileId: resolvedContext.styleProfile.id,
      },
      "✅ Document profile resolved for feedback",
    );

    return {
      ...inputData,
      authorProfile: resolvedContext.styleProfile.profileMarkdown,
      documentContext: {
        documentId: resolvedContext.document.id,
        documentStyleProfileId: resolvedContext.styleProfile.id,
        documentPreferencesId: resolvedContext.preferences.id,
        documentUuid: resolvedContext.document.externalDocumentKey,
        defaultGenre: resolvedContext.preferences.defaultGenre,
        processingConfig: resolvedContext.preferences.processingConfig,
      },
    };
  },
});
