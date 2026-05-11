import {
  DEFAULT_ADDON_ORIGIN,
  DEFAULT_BACKEND_URL,
} from "./auth-env.constants";

/**
 * Reads a required environment variable and fails fast during server startup.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to configure Better Auth.`);
  }

  return value;
}

/**
 * Returns the public backend URL used by Better Auth to build callbacks.
 */
export function getBetterAuthBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? DEFAULT_BACKEND_URL;
}

/**
 * Builds the explicit trusted-origin list for Office add-in and local backend auth flows.
 */
export function getTrustedOrigins(): string[] {
  const configuredOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [];
  const trimmedOrigins = configuredOrigins
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set([getBetterAuthBaseUrl(), DEFAULT_ADDON_ORIGIN, ...trimmedOrigins]),
  );
}
