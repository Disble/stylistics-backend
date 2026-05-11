import type { BetterAuthUser } from "@mastra/auth-better-auth";
import type { ContextWithMastra } from "@mastra/core/server";
import { registerApiRoute } from "@mastra/core/server";

import { CORRECTION_INSTRUCTIONS_MAX_LENGTH } from "../../domain/user-preferences/user-preferences.constants";
import { PgUserPreferencesRepository } from "../../infrastructure/persistence/repositories/user-preferences.repository";
import { logger } from "../../shared/logger";
import {
  invalidJsonBodyErrorOpenApiSchema,
  invalidUserPreferencesRequestErrorOpenApiSchema,
  unauthenticatedErrorOpenApiSchema,
  updateUserPreferencesRequestOpenApiSchema,
  updateUserPreferencesRouteRequestSchema,
  userPreferencesResponseOpenApiSchema,
  userPreferencesUpdateFailedErrorOpenApiSchema,
} from "./user-preferences.routes.schemas";

const userPreferencesRepository = new PgUserPreferencesRepository();

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

export const userPreferencesApiRoutes = [
  registerApiRoute("/user/preferences", {
    method: "GET",
    requiresAuth: true,
    openapi: {
      operationId: "getUserPreferences",
      summary: "Get authenticated user correction preferences",
      description:
        "Returns the authenticated user's global correction preferences, including the current custom correction instructions and the configured maximum length accepted by the backend.",
      tags: ["User Preferences"],
      responses: {
        200: {
          description:
            "User preferences retrieved successfully. If the user has not saved custom instructions yet, `correctionInstructions` is `null`.",
          content: {
            "application/json": {
              schema: userPreferencesResponseOpenApiSchema,
              examples: {
                withInstructions: {
                  summary: "Preferences with saved correction instructions",
                  value: {
                    correctionInstructions:
                      "Prestá especial atención a subordinadas demasiado largas y al abuso de adverbios terminados en -mente.",
                    correctionInstructionsMaxLength: 4000,
                  },
                },
                withoutInstructions: {
                  summary: "Preferences without saved correction instructions",
                  value: {
                    correctionInstructions: null,
                    correctionInstructionsMaxLength: 4000,
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
        500: {
          description:
            "The backend failed while persisting the authenticated user's preferences.",
          content: {
            "application/json": {
              schema: userPreferencesUpdateFailedErrorOpenApiSchema,
              example: {
                error: "user_preferences_update_failed",
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

      const preferences =
        await userPreferencesRepository.getUserPreferences(userId);

      return c.json({
        correctionInstructions: preferences.correctionInstructions,
        correctionInstructionsMaxLength: CORRECTION_INSTRUCTIONS_MAX_LENGTH,
      });
    },
  }),
  registerApiRoute("/user/preferences", {
    method: "PUT",
    requiresAuth: true,
    openapi: {
      operationId: "updateUserPreferences",
      summary: "Update authenticated user correction preferences",
      description:
        "Creates or updates the authenticated user's global correction instructions. The backend trims surrounding whitespace, accepts `null` to clear the field, and returns the normalized persisted value.",
      tags: ["User Preferences"],
      requestBody: {
        required: true,
        description:
          "Global correction instructions declared explicitly by the user. Send `null` to remove the custom instructions.",
        content: {
          "application/json": {
            schema: updateUserPreferencesRequestOpenApiSchema,
            examples: {
              saveInstructions: {
                summary: "Store custom global correction instructions",
                value: {
                  correctionInstructions:
                    "Vigilá repeticiones léxicas cercanas, subordinadas demasiado extensas y muletillas como 'realmente' o 'básicamente'.",
                },
              },
              clearInstructions: {
                summary: "Clear saved correction instructions",
                value: {
                  correctionInstructions: null,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            "User preferences updated successfully. The response contains the normalized persisted value after trimming.",
          content: {
            "application/json": {
              schema: userPreferencesResponseOpenApiSchema,
              examples: {
                updatedPreferences: {
                  summary: "Updated preferences",
                  value: {
                    correctionInstructions:
                      "Vigilá repeticiones léxicas cercanas, subordinadas demasiado extensas y muletillas como 'realmente' o 'básicamente'.",
                    correctionInstructionsMaxLength: 4000,
                  },
                },
                clearedPreferences: {
                  summary: "Preferences after clearing instructions",
                  value: {
                    correctionInstructions: null,
                    correctionInstructionsMaxLength: 4000,
                  },
                },
              },
            },
          },
        },
        400: {
          description:
            "Invalid request body. This happens when the JSON payload is malformed or when `correctionInstructions` does not match the route contract.",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  invalidJsonBodyErrorOpenApiSchema,
                  invalidUserPreferencesRequestErrorOpenApiSchema,
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
                    error: "invalid_user_preferences_request",
                    issues: [
                      {
                        code: "too_big",
                        maximum: CORRECTION_INSTRUCTIONS_MAX_LENGTH,
                        inclusive: true,
                        path: ["correctionInstructions"],
                        message:
                          "Too big: expected string to have <= 4000 characters",
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

      const parsed = updateUserPreferencesRouteRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            error: "invalid_user_preferences_request",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      try {
        const preferences =
          await userPreferencesRepository.updateUserPreferences({
            userId,
            correctionInstructions: parsed.data.correctionInstructions,
          });

        return c.json({
          correctionInstructions: preferences.correctionInstructions,
          correctionInstructionsMaxLength: CORRECTION_INSTRUCTIONS_MAX_LENGTH,
        });
      } catch (error) {
        logger.error(
          {
            err: error,
            userId,
            hasCorrectionInstructions:
              parsed.data.correctionInstructions !== null,
            correctionInstructionsLength:
              parsed.data.correctionInstructions?.length ?? 0,
          },
          "Failed to update authenticated user preferences",
        );

        return c.json({ error: "user_preferences_update_failed" }, 500);
      }
    },
  }),
];
