import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";

import { authDb } from "./auth-db";
import {
  getBetterAuthBaseUrl,
  getTrustedOrigins,
  requireEnv,
} from "./auth-env";
import { authSchema } from "./auth-schema";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

/**
 * Better Auth runtime configured for the Word add-in and Mastra API.
 *
 * Mastra's Better Auth adapter currently expects the non-generic `Auth` shape,
 * while `betterAuth()` returns a config-specialized type. The runtime contract is
 * the same instance; the annotation keeps the boundary compatible without leaking
 * Better Auth's internal generic options into Mastra wiring.
 */
export const auth = betterAuth({
  baseURL: getBetterAuthBaseUrl(),
  basePath: "/auth",
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(authDb, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: THIRTY_DAYS_IN_SECONDS,
    updateAge: SEVEN_DAYS_IN_SECONDS,
  },
  // Office Dialog runs OAuth across add-in/backend/provider runtimes. Better Auth
  // still stores and validates OAuth state in Postgres, but the temporary signed
  // state cookie is unreliable in that embedded cross-origin flow. Keep this
  // pairing together unless the Office Dialog flow is redesigned end-to-end.
  account: {
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  },
  socialProviders: {
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    },
  },
  plugins: [bearer()],
}) as unknown as Auth;
