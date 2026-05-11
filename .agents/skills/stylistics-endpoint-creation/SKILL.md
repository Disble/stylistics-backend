---
name: stylistics-endpoint-creation
description: >
  Project-specific guide for creating new authenticated or public API endpoints
  in the Stylistics backend, including route structure, runtime validation, and
  rich OpenAPI documentation. Trigger: load before creating or refactoring files
  under src/server/routes/ or registering new custom API routes in Mastra.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Stylistics Endpoint Creation

## When to Use

- Before adding a new route under `src/server/routes/`.
- Before exposing a new custom API route through `registerApiRoute(...)`.
- Before documenting a route in Swagger/OpenAPI.
- Before deciding how request/response/error contracts should be modeled.
- Before registering new route arrays in `src/mastra/index.ts`.

## Critical Patterns

1. **Load `mastra` first.** Route registration and OpenAPI behavior belong to Mastra runtime APIs. Do not trust stale memory.
2. **Route path is runtime-relative, not `/api`-prefixed.** Use `registerApiRoute("/foo/bar", ...)`; Mastra adds `/api` externally.
3. **Runtime validation and OpenAPI are different concerns.** Runtime behavior lives in the handler and Zod parsing. OpenAPI metadata documents the contract; it must not replace validation.
4. **Zod is the source of truth for payload shape.** In this repo, request/response/error schemas live in `*.routes.schemas.ts` and are reused for runtime validation plus OpenAPI generation.
5. **Use the proven OpenAPI generation path.** For this stack, the reliable pattern is `extendZodWithOpenApi(z)` + `OpenAPIRegistry.register(...)` + `OpenApiGeneratorV31(...)`. Do NOT rely on direct schema generation with `.meta({ id })` alone.
6. **Keep handlers boring.** Auth extraction, JSON parsing, `safeParse`, repository/service call, JSON response. If the route is doing more than that, the design is drifting.
7. **Document like a product contract, not like a TODO.** Every meaningful endpoint should have request schema, response schema, error schema, descriptions, and realistic examples.

## Canonical File Placement

| Concern | File |
| --- | --- |
| Route registration + handler | `src/server/routes/<feature>.routes.ts` |
| Zod contracts + OpenAPI generation | `src/server/routes/<feature>.routes.schemas.ts` |
| Repository/adapter implementation | `src/infrastructure/**` |
| Stable domain constants/types | `src/domain/**` |
| Route registration in Mastra | `src/mastra/index.ts` |
| Frontend-facing contract docs when needed | `docs/*.md` |

## Creation Protocol

### 1. Define the endpoint boundary

Decide all of this BEFORE writing code:

- route path
- HTTP method
- auth requirement (`requiresAuth: true | false`)
- request payload shape
- success response shape
- expected error payloads
- whether frontend needs a dedicated doc beyond Swagger/OpenAPI

If the route is business-facing, also decide whether frontend will consume:

- Swagger UI (`/swagger-ui`)
- OpenAPI JSON (`/api/openapi.json`)
- a dedicated doc in `docs/`

### 2. Start in `*.routes.schemas.ts`

Create the runtime Zod schemas first.

Use this pattern:

```ts
import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";

extendZodWithOpenApi(z);

export const createThingRouteRequestSchema = z
  .object({
    name: z.string().min(1).meta({
      description: "Human-readable thing name.",
    }),
  })
  .strict();

export const createThingRouteResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
  })
  .strict();

export const unauthenticatedRouteErrorSchema = z
  .object({ error: z.literal("unauthenticated") })
  .strict();

const registry = new OpenAPIRegistry();

registry.register("CreateThingRequest", createThingRouteRequestSchema);
registry.register("CreateThingResponse", createThingRouteResponseSchema);
registry.register("UnauthenticatedError", unauthenticatedRouteErrorSchema);

const generator = new OpenApiGeneratorV31(registry.definitions);
const generatedSchemas = generator.generateComponents().components?.schemas ?? {};

function getGeneratedOpenApiSchema(schemaId: string): OpenAPIV3_1.SchemaObject {
  const schema = generatedSchemas[schemaId];

  if (!schema || "$ref" in schema) {
    throw new Error(`OpenAPI schema generation failed for ${schemaId}.`);
  }

  return schema as OpenAPIV3_1.SchemaObject;
}

export const createThingRequestOpenApiSchema = getGeneratedOpenApiSchema(
  "CreateThingRequest",
);
export const createThingResponseOpenApiSchema = getGeneratedOpenApiSchema(
  "CreateThingResponse",
);
```

### 3. Then write the route handler in `*.routes.ts`

Follow the established repo shape:

- top-level repository instance
- `getAuthenticatedUserId(c)` helper when auth is required
- `readJsonBody(c)` helper to detect malformed JSON
- `safeParse(body)` for contract validation
- structured error payloads
- `registerApiRoute(...)` with rich `openapi`

Minimal authenticated pattern:

```ts
import type { BetterAuthUser } from "@mastra/auth-better-auth";
import type { ContextWithMastra } from "@mastra/core/server";
import { registerApiRoute } from "@mastra/core/server";

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

export const thingApiRoutes = [
  registerApiRoute("/things", {
    method: "POST",
    requiresAuth: true,
    openapi: {
      operationId: "createThing",
      summary: "Create authenticated thing",
      description: "Creates a new thing for the authenticated user.",
      tags: ["Things"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createThingRequestOpenApiSchema,
          },
        },
      },
      responses: {
        200: {
          description: "Thing created successfully.",
          content: {
            "application/json": {
              schema: createThingResponseOpenApiSchema,
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

      const parsed = createThingRouteRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            error: "invalid_thing_request",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      return c.json({ id: "...", name: parsed.data.name });
    },
  }),
];
```

### 4. Register the route in `src/mastra/index.ts`

If the route array is not imported and spread into `server.apiRoutes`, it does not exist. Period.

Pattern:

```ts
import { thingApiRoutes } from "../server/routes/thing.routes";

server: {
  auth: mastraAuth,
  apiRoutes: [
    ...thingApiRoutes,
  ],
}
```

## OpenAPI Quality Bar

Every non-trivial endpoint should document:

- `operationId`
- `summary`
- `description`
- `tags`
- request body description when there is a body
- success response schema
- error response schemas
- realistic request/response examples

### Error modeling pattern

Use explicit error payloads. In this repo, the common route-level errors are:

- `401 { error: "unauthenticated" }`
- `400 { error: "invalid_json_body" }`
- `400 { error: "invalid_<feature>_request", issues: [...] }`

When two `400` shapes are possible, document them with `oneOf` in OpenAPI.

## Runtime vs Documentation Rules

| Concern | Source of truth |
| --- | --- |
| malformed JSON detection | `readJsonBody()` |
| payload validation | `safeParse(...)` on runtime Zod schema |
| auth enforcement | `requiresAuth` + handler auth checks |
| Swagger/OpenAPI docs | `openapi` metadata in `registerApiRoute(...)` |
| request/response schema definitions | `*.routes.schemas.ts` |

Do NOT confuse these layers.

- OpenAPI metadata does not validate runtime input.
- Passing typecheck does not prove runtime OpenAPI generation works.
- Validate the real startup path after changing generated schemas.

## Proven Repo Pattern For OpenAPI Generation

In THIS repository, the stable pattern is:

1. `extendZodWithOpenApi(z)`
2. define runtime Zod schemas
3. `const registry = new OpenAPIRegistry()`
4. `registry.register("SchemaId", schema)` for request/response/error shapes
5. `new OpenApiGeneratorV31(registry.definitions)`
6. `generateComponents().components?.schemas`
7. export `...OpenApiSchema` constants for route files

### What NOT to do

- Do NOT pass `/api/foo` into `registerApiRoute`; use `/foo`.
- Do NOT rely on handwritten OpenAPI schema objects if Zod can own the contract.
- Do NOT assume `.meta({ id })` alone is enough for runtime component generation in this stack.
- Do NOT put business logic inside the route handler if it belongs in domain/infrastructure.
- Do NOT skip real runtime verification after touching `zod-to-openapi` generation.

## Endpoint Review Checklist

- [ ] Path registered without `/api` prefix
- [ ] Route array exported from `src/server/routes/**`
- [ ] Route array registered in `src/mastra/index.ts`
- [ ] Runtime Zod schemas live in `*.routes.schemas.ts`
- [ ] OpenAPI schemas are generated from Zod via registry
- [ ] Auth behavior matches `requiresAuth`
- [ ] Malformed JSON handled explicitly
- [ ] Validation errors return structured `issues`
- [ ] OpenAPI docs include examples and meaningful descriptions
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run format:check` passes
- [ ] `bun run dev` starts without OpenAPI schema generation crashes

## When To Write Frontend Docs Too

Add or update a frontend doc in `docs/` when:

- the endpoint is product-facing
- frontend needs usage guidance beyond Swagger
- the endpoint has non-obvious lifecycle or UI semantics
- the route introduces a new contract the team will consume repeatedly

Recommended pattern:

- keep Swagger/OpenAPI as machine-readable contract
- add a frontend-facing Markdown doc for intent, use cases, and integration flow

## Commands

```bash
bun run typecheck
bun run lint
bun run format:check
bun run dev
```

## Resources

- `src/server/routes/user-preferences.routes.ts` — reference route with rich OpenAPI metadata.
- `src/server/routes/user-preferences.routes.schemas.ts` — proven `zod-to-openapi` registry pattern.
- `src/server/routes/document.routes.ts` — richer document endpoint documentation example.
- `src/server/routes/document.routes.schemas.ts` — complex response/error modeling example.
- `docs/auth.md` — auth expectations and public tooling routes.
- `docs/linting-and-file-anatomy.md` — file-role conventions for `*.schemas.ts` and route organization.
- `.agents/skills/mastra/SKILL.md` — load first for current Mastra API behavior.
