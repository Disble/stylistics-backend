import { MastraAuthBetterAuth } from "@mastra/auth-better-auth";

import { auth } from "./auth";

export const mastraAuth = new MastraAuthBetterAuth({
  auth,
  public: ["/auth/*", "/api/auth/*", "/health", "/swagger-ui/*", "/openapi/*"],
  mapUserToResourceId: ({ user }) => user.id,
});
