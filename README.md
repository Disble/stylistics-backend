# Stylistics Backend

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js >=22.13.0](https://img.shields.io/badge/node-%3E%3D%2022.13.0-339933?logo=node.js&logoColor=white)](package.json)
[![Bun](https://img.shields.io/badge/runtime-Bun-black?logo=bun&logoColor=white)](https://bun.sh/)
[![Mastra](https://img.shields.io/badge/orchestration-Mastra-7C3AED)](https://mastra.ai/)

Backend for authenticated, document-aware stylistic correction. Built with **Mastra**, backed by **PostgreSQL + pgvector**, and designed to serve a **Word add-in** that needs editorial reasoning, persistent document context, and explicit architectural boundaries.

## At a glance

- **What it does:** runs editorial/stylistic workflows and returns structured suggestions.
- **Who it serves:** a Word add-in client that needs authenticated correction and document persistence.
- **What makes it different:** this is not “just prompts behind an API” — it combines auth, persistence, vector-backed runtime state, and thin orchestration around LLM agents.

## Quick path

If you only need the shortest route to a running local environment:

1. `bun install`
2. `cp .env.example .env`
3. `docker compose up -d postgres`
4. `bun run dev`
5. Open [http://localhost:4111](http://localhost:4111)

## Core features

- **Stylistic correction workflows** with structured output for downstream document tooling.
- **Document context resolution** for persisted document identity, preferences, and style profile state.
- **User-level correction preferences** exposed as authenticated custom API routes.
- **Better Auth + Google OAuth** integration adapted to the Office dialog/taskpane flow.
- **Mastra runtime composition** with agents, workflows, memory, observability, storage, and vector search.

## Quick start

### Prerequisites

- **Node.js** `>= 22.13.0`
- **Bun**
- **Docker** + **Docker Compose**
- Google OAuth credentials if you want to test the full login flow

### 1. Install dependencies

```bash
bun install
```

### 2. Configure your environment

Create `.env` from the example file:

```bash
cp .env.example .env
```

Minimum local configuration:

```env
POSTGRES_URL=postgresql://stylistics:stylistics_pass@localhost:5432/stylistics_db

BETTER_AUTH_URL=http://localhost:4111
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_TRUSTED_ORIGINS=https://localhost:3000

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

For the complete auth setup, callback URL rules, and Office bridge flow, read [docs/auth.md](docs/auth.md).

> If you only want to boot the backend and inspect the runtime, you can defer Google OAuth setup until you need to test the authenticated add-in flow.

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

The local database uses `pgvector/pgvector:pg17` and initializes from `docker/initdb/`.

### 4. Start the backend

```bash
bun run dev
```

### 5. Open the local tooling

- **Mastra Studio:** [http://localhost:4111](http://localhost:4111)
- **OpenAPI:** [http://localhost:4111/openapi](http://localhost:4111/openapi)
- **Swagger UI:** [http://localhost:4111/swagger-ui](http://localhost:4111/swagger-ui)

## How the system is organized

This codebase treats **Mastra as the orchestration layer**, not as the home for every business rule.

| Layer | Responsibility | Key paths |
| --- | --- | --- |
| Runtime bootstrap | Assemble Mastra, auth, storage, vectors, logging, observability | `src/mastra/index.ts` |
| Workflows | Thin sequencing and validated handoffs | `src/mastra/workflows/` |
| Agents | Reasoning-heavy editorial/profile tasks | `src/mastra/agents/` |
| Auth | Better Auth config and Mastra adapter | `src/auth/` |
| API routes | Authenticated custom endpoints with OpenAPI metadata | `src/server/routes/` |
| Persistence | Database-backed repositories and infra adapters | `src/infrastructure/` |
| Workspace knowledge | Author profiles, reference material, repo-local skills | `workspace/` |
| Project docs | Contracts, setup notes, and architecture guidance | `docs/` |

For the full architectural direction, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Request flow in one pass

At a high level, the production-shaped flow is:

1. The add-in authenticates through **Better Auth + Google OAuth**.
2. The backend issues a Better Auth session usable as a bearer token.
3. The client calls protected workflows and custom routes.
4. The backend resolves persisted document/user context.
5. Mastra workflows orchestrate agents and deterministic steps.
6. The response returns structured editorial output for the client to apply.

That separation matters. It keeps auth, persistence, orchestration, and editorial reasoning from collapsing into one hard-to-maintain blob.

## Authentication model

The current MVP uses **Better Auth** with **Google OAuth**.

Because the client is a Word add-in, authentication is split across backend and add-in origins:

1. The add-in opens an auth dialog.
2. Better Auth performs the Google sign-in flow.
3. The backend finishes the callback at `/auth-complete`.
4. A short-lived one-time code is exchanged at `/auth-bridge-session`.
5. The add-in receives a Better Auth session token and uses it as a bearer token for protected routes.

Public runtime/auth routes include:

- `/auth/*`
- `/auth-complete`
- `/auth-bridge-session`
- `/api/auth/*`
- `/health`
- `/swagger-ui/*`
- `/openapi/*`

If you touch auth, START with [docs/auth.md](docs/auth.md). That document already captures the real edge cases.

## API surface

Beyond Mastra's runtime endpoints, the project exposes custom authenticated routes such as:

| Route | Purpose |
| --- | --- |
| `POST /documents/resolve` | Resolve or create persisted context for one authenticated document |
| `GET /user/preferences` | Fetch the authenticated user's global correction preferences |
| `PUT /user/preferences` | Create or update the authenticated user's correction preferences |

For the stylistic correction input/output contract consumed by the frontend, see [docs/frontend-contract.md](docs/frontend-contract.md).

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime orchestration | Mastra |
| Language | TypeScript |
| Auth | Better Auth |
| Database | PostgreSQL |
| Vector store | pgvector |
| Validation | Zod |
| Persistence tooling | Drizzle ORM / Drizzle Kit |
| Logging | Pino |
| Formatting / linting | Prettier + ESLint |

## Development commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Mastra in development mode |
| `bun run build` | Build the production server |
| `bun run start` | Start the production build |
| `bun run lint` | Run ESLint |
| `bun run lint:write` | Auto-fix lint issues where possible |
| `bun run format` | Format the repository with Prettier |
| `bun run format:check` | Check formatting without writing |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run validate` | Run lint + format check + typecheck |
| `bun run db:baseline` | Apply the repository baseline database setup |
| `bun run db:generate` | Generate Drizzle artifacts |
| `bun run db:migrate` | Run Drizzle migrations |
| `bun run db:studio` | Open Drizzle Studio |

## Repository map

```text
src/
  auth/                  Better Auth configuration and adapter
  domain/                Domain constants and business-oriented boundaries
  infrastructure/        Persistence implementations and runtime infrastructure
  server/routes/         Custom authenticated API routes
  mastra/
    agents/              LLM-facing agents
    workflows/           Thin orchestration workflows
    constants/           Models, memory, vectors, storage, workspaces
    tools/               Reusable runtime tools
    scorers/             Evaluation/scoring utilities
workspace/
  autores/               Persistent author/document knowledge
  dpd/                   Language reference material
  skills/                Repo-local operational skills
docs/                    Architecture, auth, contracts, conventions
```

## Documentation guide

Read these in this order if you are onboarding:

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — understand the system boundaries first.
2. [docs/auth.md](docs/auth.md) — understand the auth model before touching protected routes.
3. [docs/frontend-contract.md](docs/frontend-contract.md) — understand the client/backend contract.
4. [docs/linting-and-file-anatomy.md](docs/linting-and-file-anatomy.md) — understand repository structure and file-role notation.

## Maintainer checklist

Use this as a quick quality bar before publishing changes:

- [ ] The change preserves the Mastra-orchestration boundary.
- [ ] Deterministic logic is not buried inside workflows or prompts.
- [ ] Auth-sensitive changes were checked against `docs/auth.md`.
- [ ] API contract changes were reflected in `docs/frontend-contract.md` when needed.
- [ ] `bun run validate` passes locally.

## Engineering principles

- **Mastra is orchestration, not business logic.**
- **Workflows stay thin.** If logic becomes deterministic, extract it.
- **Agents own cognitive work, not product invariants.**
- **Workspace files are part of the runtime design.**
- **Infrastructure stays centralized** so provider/runtime wiring does not leak everywhere.

If you are changing architecture-sensitive code, read `AGENTS.md` and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) BEFORE you start editing.

## Contributing

This repository is easier to extend when changes preserve its boundaries.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution workflow, validation expectations, and documentation responsibilities.

Recommended validation before opening a PR:

```bash
bun run validate
```

Before larger changes, review:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- the relevant feature docs under `docs/`

## Project status

The project is under active development. Current production-shaped concerns include:

- authenticated Word add-in integration,
- stylistic/editorial workflows,
- document context persistence,
- user-level correction preferences,
- continued extraction away from prompt-heavy runtime code.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
