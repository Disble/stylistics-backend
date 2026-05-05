# Authentication

The backend uses [Better Auth](https://www.better-auth.com/) to authenticate the Word add-in before it calls protected Mastra API routes.

Current MVP provider: **Google OAuth**.

## Runtime shape

Authentication is wired in two layers:

- `src/auth/auth.ts` configures Better Auth, Google OAuth, bearer sessions, session lifetime, and the Drizzle/Postgres adapter.
- `src/auth/mastra-auth.ts` adapts Better Auth into Mastra through `@mastra/auth-better-auth`.

Better Auth is mounted at:

```text
/auth/*
```

Mastra built-in auth routes under `/api/auth/*` remain public so Mastra Studio/auth capability discovery does not get blocked accidentally.

## Required environment variables

Copy `.env.example` to `.env` and configure at least:

```env
POSTGRES_URL="postgresql://stylistics:stylistics_pass@localhost:5432/stylistics_db"

BETTER_AUTH_URL="http://localhost:4111"
BETTER_AUTH_SECRET="replace-with-a-real-secret"
BETTER_AUTH_TRUSTED_ORIGINS="https://localhost:3000"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

`BETTER_AUTH_URL` must match the backend URL that Google will use to build OAuth callbacks. In local development this is normally `http://localhost:4111`.

The Google OAuth callback is derived from the Better Auth base path:

```text
http://localhost:4111/auth/callback/google
```

Register that callback URL in the Google OAuth client configuration.

## Database schema

Better Auth requires four Postgres tables:

- `"user"` — internal authenticated user identity.
- `"session"` — Better Auth sessions and bearer tokens.
- `"account"` — linked OAuth provider accounts, including Google account identifiers.
- `"verification"` — short-lived OAuth state such as `oauthState`, `codeVerifier`, callback URL, and expiration.

The schema lives in:

```text
docker/initdb/02-better-auth.sql
```

That file is mounted into Postgres Docker initialization and is useful for **fresh databases**.

## Applying the schema to an existing database

Docker init scripts under `docker/initdb/` only run when the Postgres volume is created for the first time. If the local database already exists, adding a new init SQL file does **not** apply it automatically.

For an existing database, run:

```bash
bun run db:auth:apply
```

This script reads `POSTGRES_URL` and applies `docker/initdb/02-better-auth.sql` to the current database.

## Common migration error

If Google sign-in fails before returning a provider URL and the backend logs this error:

```text
relation "verification" does not exist
code: 42P01
```

the Better Auth schema has not been applied to the database.

Run:

```bash
bun run db:auth:apply
```

Then retry the login flow from the Word add-in.

## Local setup order

For a clean local environment:

1. Start Postgres with Docker Compose.
2. Configure `.env` from `.env.example`.
3. Apply the Better Auth schema:

   ```bash
   bun run db:auth:apply
   ```

4. Start Mastra:

   ```bash
   bun run dev
   ```

5. Start the Word add-in and test `Continuar con Google`.

## Provider policy

Microsoft OAuth is intentionally not part of the active MVP runtime because Azure/Entra access and licensing blocked validation. Keep the auth boundary provider-agnostic, but do not reintroduce Microsoft as an active provider until it can be configured and tested end-to-end.
