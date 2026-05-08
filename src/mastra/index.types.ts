/**
 * Auth session payload passed from the backend callback bridge to the add-in dialog.
 *
 * The add-in never receives Google provider tokens. It receives only the Better
 * Auth session token, which is the bearer credential accepted by Mastra auth.
 */
export type AuthBridgeSession = Readonly<{
  token: string;
  expiresAt: string | null;
  user: Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  }>;
}>;
