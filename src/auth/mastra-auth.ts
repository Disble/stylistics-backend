import {
  type BetterAuthUser,
  MastraAuthBetterAuth,
} from "@mastra/auth-better-auth";
import type { HonoRequest } from "hono";

import { auth } from "./auth";

/** Resolves the underlying Fetch request Mastra passes through Hono. */
function getRawRequest(request: HonoRequest | Request): Request {
  return "raw" in request ? request.raw : request;
}

/** Reads a request header without assuming Hono helper methods exist at runtime. */
function hasRequestHeader(
  request: HonoRequest | Request,
  headerName: string,
): boolean {
  return Boolean(getRawRequest(request).headers.get(headerName));
}

/** Builds the headers Better Auth should use to resolve the current session. */
function createBetterAuthSessionHeaders(
  request: HonoRequest | Request,
  token: string,
): Headers {
  const headers = new Headers(getRawRequest(request).headers);

  if (token && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

/** Adapts Mastra auth to the add-in bearer flow and Studio admin view. */
class StylisticMastraAuth extends MastraAuthBetterAuth {
  /** Tracks authenticated requests that came from the add-in bearer flow. */
  private readonly bearerAuthenticatedUsers = new WeakSet<BetterAuthUser>();

  /** Authenticates Mastra requests using Better Auth Authorization headers. */
  override async authenticateToken(
    token: string,
    request: HonoRequest,
  ): Promise<BetterAuthUser | null> {
    const hasAuthorization = hasRequestHeader(request, "authorization");

    const session = await this.auth.api.getSession({
      headers: createBetterAuthSessionHeaders(request, token),
    });
    const user = session?.session && session.user ? session : null;

    if (user && hasAuthorization) {
      this.bearerAuthenticatedUsers.add(user);
    }

    return user;
  }

  /**
   * Scopes add-in bearer requests by user, while keeping Studio cookie requests global.
   *
   * Mastra Studio is an internal dev/admin surface, not a user-facing product UI.
   * Returning `undefined` for cookie-authenticated Studio requests lets Mastra list
   * workflow runs globally, while add-in requests remain isolated per Better Auth user.
   */
  override mapUserToResourceId(user: BetterAuthUser): string | undefined {
    const isBearerRequest = this.bearerAuthenticatedUsers.has(user);
    return isBearerRequest ? user.user.id : undefined;
  }
}

export const mastraAuth = new StylisticMastraAuth({
  auth,
  public: ["/auth/*", "/api/auth/*", "/health", "/swagger-ui/*", "/openapi/*"],
});
