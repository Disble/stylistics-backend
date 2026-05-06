/**
 * Assembles the Mastra runtime for this backend, wiring registered agents,
 * workflows, storage, vectors, logging, and observability.
 */
import { randomUUID } from "node:crypto";
import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { auth } from "../auth/auth";
import { getTrustedOrigins } from "../auth/auth-env";
import { mastraAuth } from "../auth/mastra-auth";
import { editorialAgent } from "./agents/editorial-agent";
import { feedbackAgent } from "./agents/feedback-agent";
import { profileAgent } from "./agents/profile-agent";
import { stylisticAgent } from "./agents/stylistic-agent";
import { stylisticConsultationAgent } from "./agents/stylistic-consultation-agent";
import { storageCompositeStore } from "./constants/storage";
import { pgVector, VECTOR_STORE } from "./constants/vector";
import { editorialWorkflow } from "./workflows/editorial-workflow";
import { feedbackWorkflow } from "./workflows/feedback/feedback-workflow";
import { stylisticWorkflow } from "./workflows/stylistic/stylistic-workflow";

/**
 * Auth session payload passed from the backend callback bridge to the add-in dialog.
 *
 * The add-in never receives Google provider tokens. It receives only the Better
 * Auth session token, which is the bearer credential accepted by Mastra auth.
 */
type AuthBridgeSession = Readonly<{
  token: string;
  expiresAt: string | null;
  user: Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  }>;
}>;

const AUTH_BRIDGE_SESSION_TTL_MS = 60_000;

// In-memory is intentional for the local/MVP runtime: the code only needs to
// survive the immediate redirect from `/auth-complete` back to the same dialog.
// If the backend runs multiple instances, move this map to Postgres/Redis so the
// callback instance and exchange instance share the same bridge-code store.
const authBridgeSessions = new Map<
  string,
  Readonly<{
    expiresAt: number;
    session: AuthBridgeSession;
    targetOrigin: string;
  }>
>();

/**
 * Creates the same-origin dialog page URL that will finish parent messaging.
 *
 * Office Dialog messaging is most reliable when `messageParent` runs from the
 * add-in origin. The backend therefore redirects the dialog back to the taskpane
 * dev origin with a one-time code instead of posting directly from backend HTML.
 */
function createAuthDialogBridgeUrl(
  targetOrigin: string,
  bridgeCode: string,
): string {
  const url = new URL("/auth-dialog.html", targetOrigin);
  url.searchParams.set("authBridgeCode", bridgeCode);
  return url.toString();
}

/**
 * Serves the backend-origin bridge that redirects back to the taskpane origin.
 *
 * Better Auth redirects here after Google finishes. At this point the backend can
 * read the session cookie, but the taskpane cannot. The page does no messaging;
 * it only navigates back to the add-in origin with a short-lived bridge code.
 */
function createAuthCompleteHtml(redirectUrl: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stylistic — Login completado</title>
  </head>
  <body>
    <main>Completando inicio de sesión...</main>
    <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
  </body>
</html>`;
}

/**
 * Resolves the Office taskpane origin that may exchange the one-time auth bridge code.
 *
 * The backend callback creates a short-lived code and redirects the dialog back
 * to the add-in origin. The requested origin must be constrained to trusted
 * origins because it will be allowed to exchange that code for a bearer session.
 */
function resolveDialogTargetOrigin(request: Request): string | undefined {
  const url = new URL(request.url);
  const requestedOrigin = url.searchParams.get("parentOrigin");
  const trustedOrigins = getTrustedOrigins();

  if (requestedOrigin && trustedOrigins.includes(requestedOrigin)) {
    return requestedOrigin;
  }

  console.warn("[Auth][CompleteBridge] rejected untrusted parent origin", {
    requestedOrigin,
  });

  return undefined;
}

/**
 * Persists a short-lived one-time bridge session for the taskpane dialog.
 *
 * The code is single-use and expires quickly, so browser history or a stale
 * dialog URL cannot replay a login result later.
 */
function createAuthBridgeSession(
  session: AuthBridgeSession,
  targetOrigin: string,
): string {
  const code = randomUUID();
  authBridgeSessions.set(code, {
    expiresAt: Date.now() + AUTH_BRIDGE_SESSION_TTL_MS,
    session,
    targetOrigin,
  });

  return code;
}

/** Takes and removes a one-time bridge session by code. */
function takeAuthBridgeSession(code: string):
  | Readonly<{
      session: AuthBridgeSession;
      targetOrigin: string;
    }>
  | undefined {
  const record = authBridgeSessions.get(code);
  authBridgeSessions.delete(code);

  if (!record || record.expiresAt < Date.now()) {
    return undefined;
  }

  return {
    session: record.session,
    targetOrigin: record.targetOrigin,
  };
}

/**
 * Converts Better Auth session payload into the add-in auth session contract.
 *
 * Keep this shape aligned with `AuthSession` in the add-in. It is the explicit
 * cross-project contract between backend auth and taskpane persistence.
 */
function toAuthBridgeSession(data: {
  session?: { token?: string; expiresAt?: Date | string | null } | null;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}): AuthBridgeSession | undefined {
  if (!data.session?.token || !data.user?.id) {
    return undefined;
  }

  return {
    token: data.session.token,
    expiresAt: data.session.expiresAt
      ? new Date(data.session.expiresAt).toISOString()
      : null,
    user: {
      id: data.user.id,
      name: data.user.name ?? null,
      email: data.user.email ?? null,
      image: data.user.image ?? null,
    },
  };
}

/** Builds JSON response headers for the one-time auth bridge exchange. */
function createBridgeHeaders(targetOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": targetOrigin,
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

/** Exposes the configured Mastra application instance consumed by the runtime. */
export const mastra = new Mastra({
  workflows: {
    editorialWorkflow,
    stylisticWorkflow,
    feedbackWorkflow,
  },
  agents: {
    editorialAgent,
    stylisticAgent,
    stylisticConsultationAgent,
    profileAgent,
    feedbackAgent,
  },
  storage: storageCompositeStore,
  vectors: {
    [VECTOR_STORE.VECTOR_NAME]: pgVector,
  },
  server: {
    auth: mastraAuth,
    apiRoutes: [
      registerApiRoute("/auth/*", {
        method: "ALL",
        requiresAuth: false,
        handler: (c) => auth.handler(c.req.raw),
      }),
      registerApiRoute("/auth-complete", {
        method: "GET",
        requiresAuth: false,
        handler: async (c) => {
          const targetOrigin = resolveDialogTargetOrigin(c.req.raw);

          if (!targetOrigin) {
            return new Response("Origen del taskpane no permitido.", {
              status: 400,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }

          const data = await auth.api.getSession({
            headers: c.req.raw.headers,
          });
          const session = toAuthBridgeSession(data ?? {});

          if (!session) {
            return new Response("Better Auth no devolvió una sesión válida.", {
              status: 401,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }

          const bridgeCode = createAuthBridgeSession(session, targetOrigin);
          const redirectUrl = createAuthDialogBridgeUrl(
            targetOrigin,
            bridgeCode,
          );

          return new Response(createAuthCompleteHtml(redirectUrl), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        },
      }),
      registerApiRoute("/auth-bridge-session", {
        method: "GET",
        requiresAuth: false,
        handler: (c) => {
          const url = new URL(c.req.raw.url);
          const code = url.searchParams.get("code");
          const record = code ? takeAuthBridgeSession(code) : undefined;

          if (!record) {
            return new Response(
              JSON.stringify({ error: "bridge_session_expired" }),
              {
                status: 404,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            );
          }

          return new Response(JSON.stringify({ session: record.session }), {
            headers: createBridgeHeaders(record.targetOrigin),
          });
        },
      }),
    ],
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
