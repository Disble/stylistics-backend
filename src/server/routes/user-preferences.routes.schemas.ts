import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";

import { CORRECTION_INSTRUCTIONS_MAX_LENGTH } from "../../domain/user-preferences/user-preferences.constants";

extendZodWithOpenApi(z);

const UPDATE_USER_PREFERENCES_REQUEST_SCHEMA_ID =
  "UpdateUserPreferencesRequest";
const USER_PREFERENCES_RESPONSE_SCHEMA_ID = "UserPreferencesResponse";
const UNAUTHENTICATED_ERROR_SCHEMA_ID = "UnauthenticatedError";
const INVALID_JSON_BODY_ERROR_SCHEMA_ID = "InvalidJsonBodyError";
const INVALID_USER_PREFERENCES_REQUEST_ERROR_SCHEMA_ID =
  "InvalidUserPreferencesRequestError";

export const updateUserPreferencesRouteRequestSchema = z
  .object({
    correctionInstructions: z
      .string()
      .max(CORRECTION_INSTRUCTIONS_MAX_LENGTH)
      .meta({
        description:
          "Global correction instructions declared explicitly by the user. Send null to clear the field.",
      })
      .nullable(),
  })
  .strict();

export const userPreferencesRouteResponseSchema = z
  .object({
    correctionInstructions: z.string().nullable().meta({
      description:
        "User-defined global correction instructions applied only during the active correction step.",
    }),
    correctionInstructionsMaxLength: z.literal(
      CORRECTION_INSTRUCTIONS_MAX_LENGTH,
    ),
  })
  .strict();

export const unauthenticatedRouteErrorSchema = z
  .object({
    error: z.literal("unauthenticated"),
  })
  .strict();

export const invalidJsonBodyRouteErrorSchema = z
  .object({
    error: z.literal("invalid_json_body"),
  })
  .strict();

export const invalidUserPreferencesRequestRouteErrorSchema = z
  .object({
    error: z.literal("invalid_user_preferences_request"),
    issues: z
      .array(
        z.object({}).catchall(z.unknown()).meta({
          description:
            "Zod validation issue describing why the payload was rejected.",
        }),
      )
      .meta({
        description:
          "Zod validation issues describing why the payload was rejected.",
      }),
  })
  .strict();

const userPreferencesRouteOpenApiRegistry = new OpenAPIRegistry();

userPreferencesRouteOpenApiRegistry.register(
  UPDATE_USER_PREFERENCES_REQUEST_SCHEMA_ID,
  updateUserPreferencesRouteRequestSchema,
);

userPreferencesRouteOpenApiRegistry.register(
  USER_PREFERENCES_RESPONSE_SCHEMA_ID,
  userPreferencesRouteResponseSchema,
);

userPreferencesRouteOpenApiRegistry.register(
  UNAUTHENTICATED_ERROR_SCHEMA_ID,
  unauthenticatedRouteErrorSchema,
);

userPreferencesRouteOpenApiRegistry.register(
  INVALID_JSON_BODY_ERROR_SCHEMA_ID,
  invalidJsonBodyRouteErrorSchema,
);

userPreferencesRouteOpenApiRegistry.register(
  INVALID_USER_PREFERENCES_REQUEST_ERROR_SCHEMA_ID,
  invalidUserPreferencesRequestRouteErrorSchema,
);

const userPreferencesRouteOpenApiGenerator = new OpenApiGeneratorV31(
  userPreferencesRouteOpenApiRegistry.definitions,
);

const userPreferencesRouteGeneratedSchemas =
  userPreferencesRouteOpenApiGenerator.generateComponents().components
    ?.schemas ?? {};

function getGeneratedOpenApiSchema(schemaId: string): OpenAPIV3_1.SchemaObject {
  const schema = userPreferencesRouteGeneratedSchemas[schemaId];

  if (!schema || "$ref" in schema) {
    throw new Error(`OpenAPI schema generation failed for ${schemaId}.`);
  }

  return schema as OpenAPIV3_1.SchemaObject;
}

export const updateUserPreferencesRequestOpenApiSchema =
  getGeneratedOpenApiSchema(UPDATE_USER_PREFERENCES_REQUEST_SCHEMA_ID);

export const userPreferencesResponseOpenApiSchema = getGeneratedOpenApiSchema(
  USER_PREFERENCES_RESPONSE_SCHEMA_ID,
);

export const unauthenticatedErrorOpenApiSchema = getGeneratedOpenApiSchema(
  UNAUTHENTICATED_ERROR_SCHEMA_ID,
);

export const invalidJsonBodyErrorOpenApiSchema = getGeneratedOpenApiSchema(
  INVALID_JSON_BODY_ERROR_SCHEMA_ID,
);

export const invalidUserPreferencesRequestErrorOpenApiSchema =
  getGeneratedOpenApiSchema(INVALID_USER_PREFERENCES_REQUEST_ERROR_SCHEMA_ID);
