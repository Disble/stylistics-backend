import type { BetterAuthUser } from "@mastra/auth-better-auth";
import type { ContextWithMastra } from "@mastra/core/server";
import { registerApiRoute } from "@mastra/core/server";

import { PgDocumentRepository } from "../../infrastructure/persistence/repositories/document.repository";
import {
  invalidDocumentContextRequestErrorOpenApiSchema,
  invalidJsonBodyErrorOpenApiSchema,
  resolveDocumentContextRequestOpenApiSchema,
  resolveDocumentContextRouteRequestSchema,
  resolvedDocumentContextResponseOpenApiSchema,
  unauthenticatedErrorOpenApiSchema,
} from "./document.routes.schemas";

const documentContextRepository = new PgDocumentRepository();

function getAuthenticatedUserId(c: ContextWithMastra): string | undefined {
  const requestContext = c.get("requestContext");
  const authUser = requestContext?.get<"user", BetterAuthUser | undefined>(
    "user",
  );

  return authUser?.user.id;
}

async function readJsonBody(
  c: ContextWithMastra,
): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export const documentApiRoutes = [
  registerApiRoute("/documents/resolve", {
    method: "POST",
    requiresAuth: true,
    openapi: {
      operationId: "resolveDocumentContext",
      summary: "Resolve authenticated document context",
      description:
        "Resolves or creates the persisted context for one authenticated document. The operation upserts the document record, its persisted preferences, and its initial style profile, then returns the latest stored state for all three resources.",
      tags: ["Documents"],
      requestBody: {
        required: true,
        description:
          "Stable document identity and optional persisted metadata supplied by the add-in for the current document.",
        content: {
          "application/json": {
            schema: resolveDocumentContextRequestOpenApiSchema,
            examples: {
              createOrRefreshDocumentContext: {
                summary: "Resolve document context with metadata",
                value: {
                  documentUuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                  title: "Crónica del margen",
                  genero: "narrativa-literaria",
                  processingConfig: {
                    chunking: {
                      mode: "default",
                    },
                    trackChanges: {
                      enabled: true,
                    },
                  },
                },
              },
              resolveWithMinimalPayload: {
                summary: "Resolve document context with only the stable UUID",
                value: {
                  documentUuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            "Document context resolved successfully. The response contains the persisted document record, the latest document preferences, and the active style profile markdown.",
          content: {
            "application/json": {
              schema: resolvedDocumentContextResponseOpenApiSchema,
              examples: {
                resolvedContext: {
                  summary: "Resolved document context",
                  value: {
                    document: {
                      id: "11111111-1111-4111-8111-111111111111",
                      userId: "user_123",
                      externalDocumentKey:
                        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      title: "Crónica del margen",
                      lastUsedAt: "2026-05-09T20:31:41.000Z",
                    },
                    preferences: {
                      id: "22222222-2222-4222-8222-222222222222",
                      documentId: "11111111-1111-4111-8111-111111111111",
                      defaultGenre: "narrativa-literaria",
                      processingConfig: {
                        chunking: {
                          mode: "default",
                        },
                        trackChanges: {
                          enabled: true,
                        },
                      },
                    },
                    styleProfile: {
                      id: "33333333-3333-4333-8333-333333333333",
                      documentId: "11111111-1111-4111-8111-111111111111",
                      profileMarkdown:
                        "# Perfil estilístico del documento\n\n## PATRONES VIVOS\n\n### Ortografía\n",
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description:
            "Invalid request body. This happens when the JSON payload is malformed or when the payload does not match the document-resolution contract.",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  invalidJsonBodyErrorOpenApiSchema,
                  invalidDocumentContextRequestErrorOpenApiSchema,
                ],
              },
              examples: {
                invalidJsonBody: {
                  summary: "Malformed JSON body",
                  value: {
                    error: "invalid_json_body",
                  },
                },
                invalidRequestSchema: {
                  summary: "Payload rejected by schema validation",
                  value: {
                    error: "invalid_document_context_request",
                    issues: [
                      {
                        code: "invalid_value",
                        values: [
                          "narrativa-literaria",
                          "ensayo-academico",
                          "periodismo-cultural",
                          "general",
                        ],
                        path: ["genero"],
                        message:
                          "Invalid option: expected one of the allowed genre values",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        401: {
          description:
            "Authentication is required. The request did not include a valid Better Auth session.",
          content: {
            "application/json": {
              schema: unauthenticatedErrorOpenApiSchema,
              example: {
                error: "unauthenticated",
              },
            },
          },
        },
      },
    },
    handler: async (c) => {
      const userId = getAuthenticatedUserId(c);

      if (!userId) {
        return c.json({ error: "unauthenticated" }, 401);
      }

      const body = await readJsonBody(c);

      if (!body) {
        return c.json({ error: "invalid_json_body" }, 400);
      }

      const parsed = resolveDocumentContextRouteRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            error: "invalid_document_context_request",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      const resolvedContext =
        await documentContextRepository.resolveDocumentContext({
          userId,
          externalDocumentKey: parsed.data.documentUuid,
          title: parsed.data.title,
          defaultGenre: parsed.data.genero,
          processingConfig: parsed.data.processingConfig,
        });

      return c.json(resolvedContext);
    },
  }),
];
