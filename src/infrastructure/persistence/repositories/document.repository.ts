import { and, eq } from "drizzle-orm";

import {
  DEFAULT_DOCUMENT_GENRE,
  DEFAULT_DOCUMENT_PROCESSING_CONFIG,
  INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE,
} from "../../../domain/documents/document.constants";
import type { DocumentGenre } from "../../../domain/documents/document.types";
import type {
  DocumentContextRepository,
  ResolveDocumentContextInput,
  ResolvedDocumentContext,
} from "../../../domain/documents/document-context.types";
import { persistenceDb } from "../db";
import {
  document,
  documentPreferences,
  documentStyleProfile,
} from "../schema/document.schemas";

/**
 * PostgreSQL/Drizzle implementation of the document-context repository used by
 * workflow and HTTP entrypoints.
 */
export class PgDocumentRepository implements DocumentContextRepository {
  constructor(private readonly db = persistenceDb) {}

  /**
   * Resolves or creates the persisted document context and returns the latest
   * document, preferences, and style-profile state.
   */
  async resolveDocumentContext(
    input: ResolveDocumentContextInput,
  ): Promise<ResolvedDocumentContext> {
    return this.db.transaction(async (tx) => {
      const now = new Date();

      const [resolvedDocument] = await tx
        .insert(document)
        .values({
          userId: input.userId,
          externalDocumentKey: input.externalDocumentKey,
          title: input.title,
          lastUsedAt: now,
        })
        .onConflictDoUpdate({
          target: [document.userId, document.externalDocumentKey],
          set: {
            ...(input.title ? { title: input.title } : {}),
            lastUsedAt: now,
            updatedAt: now,
          },
        })
        .returning();

      if (!resolvedDocument) {
        throw new Error(
          "Document context resolution did not return a document.",
        );
      }

      const [resolvedPreferences] = await tx
        .insert(documentPreferences)
        .values({
          documentId: resolvedDocument.id,
          defaultGenre: input.defaultGenre ?? DEFAULT_DOCUMENT_GENRE,
          processingConfig:
            input.processingConfig ?? DEFAULT_DOCUMENT_PROCESSING_CONFIG,
        })
        .onConflictDoUpdate({
          target: documentPreferences.documentId,
          set: {
            ...(input.defaultGenre ? { defaultGenre: input.defaultGenre } : {}),
            ...(input.processingConfig
              ? { processingConfig: input.processingConfig }
              : {}),
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!resolvedPreferences) {
        throw new Error(
          "Document context resolution did not return preferences.",
        );
      }

      const [resolvedStyleProfile] = await tx
        .insert(documentStyleProfile)
        .values({
          documentId: resolvedDocument.id,
          profileMarkdown: INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE,
        })
        .onConflictDoNothing({
          target: documentStyleProfile.documentId,
        })
        .returning();

      const styleProfile =
        resolvedStyleProfile ??
        (await tx.query.documentStyleProfile.findFirst({
          where: eq(documentStyleProfile.documentId, resolvedDocument.id),
        }));

      if (!styleProfile) {
        throw new Error(
          "Document context resolution did not return a style profile.",
        );
      }

      const documentWithLatestState = await tx.query.document.findFirst({
        where: and(
          eq(document.userId, input.userId),
          eq(document.externalDocumentKey, input.externalDocumentKey),
        ),
      });

      if (!documentWithLatestState) {
        throw new Error("Resolved document could not be reloaded.");
      }

      return {
        document: {
          id: documentWithLatestState.id,
          userId: documentWithLatestState.userId,
          externalDocumentKey: documentWithLatestState.externalDocumentKey,
          title: documentWithLatestState.title,
          lastUsedAt: documentWithLatestState.lastUsedAt,
        },
        preferences: {
          id: resolvedPreferences.id,
          documentId: resolvedPreferences.documentId,
          defaultGenre: resolvedPreferences.defaultGenre as DocumentGenre,
          processingConfig: resolvedPreferences.processingConfig,
        },
        styleProfile: {
          id: styleProfile.id,
          documentId: styleProfile.documentId,
          profileMarkdown: styleProfile.profileMarkdown,
        },
      };
    });
  }

  /** Persists the latest markdown for one DB-backed document style profile. */
  async updateDocumentStyleProfile(input: {
    documentStyleProfileId: string;
    profileMarkdown: string;
  }): Promise<void> {
    const [updatedProfile] = await this.db
      .update(documentStyleProfile)
      .set({
        profileMarkdown: input.profileMarkdown,
        updatedAt: new Date(),
      })
      .where(eq(documentStyleProfile.id, input.documentStyleProfileId))
      .returning({ id: documentStyleProfile.id });

    if (!updatedProfile) {
      throw new Error("Document style profile could not be updated.");
    }
  }
}
