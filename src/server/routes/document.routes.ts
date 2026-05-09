import type { BetterAuthUser } from "@mastra/auth-better-auth";
import type { ContextWithMastra } from "@mastra/core/server";
import { registerApiRoute } from "@mastra/core/server";

import { PgDocumentRepository } from "../../infrastructure/persistence/repositories/document.repository";
import { resolveDocumentContextRouteRequestSchema } from "./document.routes.schemas";

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
      summary: "Resolve document context",
      description:
        "Resuelve o crea el contexto persistente de un documento autenticado: document, preferencias y perfil estilístico inicial.",
      tags: ["Documents"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["documentUuid"],
              properties: {
                documentUuid: {
                  type: "string",
                  format: "uuid",
                  description:
                    "UUID estable del documento generado por el add-in.",
                },
                title: {
                  type: "string",
                  description: "Título opcional del documento.",
                },
                genero: {
                  type: "string",
                  enum: [
                    "narrativa-literaria",
                    "ensayo-academico",
                    "periodismo-cultural",
                    "general",
                  ],
                  description: "Género por defecto del documento.",
                },
                processingConfig: {
                  type: "object",
                  additionalProperties: true,
                  description:
                    "Configuración flexible de procesamiento del documento.",
                },
              },
              additionalProperties: false,
            },
          },
        },
      },
      responses: {
        200: { description: "Contexto de documento resuelto." },
        400: { description: "Solicitud inválida." },
        401: { description: "Usuario no autenticado." },
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
