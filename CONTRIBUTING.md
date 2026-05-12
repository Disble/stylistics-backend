# Contributing to Stylistics Backend

Thanks for considering a contribution.

This project is easiest to evolve when changes respect the system boundaries already defined in the codebase. Read this guide before opening a PR.

## Before you start

Read these first:

1. [README.md](README.md)
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. [docs/auth.md](docs/auth.md) if your change touches authentication or protected routes
4. [docs/frontend-contract.md](docs/frontend-contract.md) if your change affects request/response contracts
5. [docs/linting-and-file-anatomy.md](docs/linting-and-file-anatomy.md) for file-role and structure conventions

## Core contribution rules

- **Keep Mastra as orchestration.** Do not turn workflows or prompt files into the home of deterministic business logic.
- **Keep workflows thin.** If logic is deterministic, extract it into plain TypeScript modules.
- **Do not hide invariants inside prompts.** Agents can reason; they should not be the only place where critical product behavior lives.
- **Respect existing layer boundaries.** Avoid convenience imports that collapse architecture.
- **Update docs when contracts change.** Especially `docs/auth.md` and `docs/frontend-contract.md`.

## Local setup

### Prerequisites

- Node.js `>= 22.13.0`
- Bun
- Docker + Docker Compose

### Install and run

```bash
bun install
cp .env.example .env
docker compose up -d postgres
bun run dev
```

Open local tooling at:

- `http://localhost:4111` — Mastra Studio
- `http://localhost:4111/openapi` — OpenAPI
- `http://localhost:4111/swagger-ui` — Swagger UI

## Validation

Run this before opening a PR:

```bash
bun run validate
```

If your change affects database behavior, also run the relevant migration/generation commands:

```bash
bun run db:generate
bun run db:migrate
```

## Pull request expectations

Please make PRs easy to review:

- Keep scope focused.
- Explain the problem and the architectural impact.
- Call out contract changes explicitly.
- Mention any follow-up work that is intentionally out of scope.

Recommended PR checklist:

- [ ] The change preserves architecture boundaries.
- [ ] Deterministic logic is not buried inside workflows/prompts.
- [ ] Auth changes were checked against `docs/auth.md`.
- [ ] API contract changes were reflected in docs where needed.
- [ ] `bun run validate` passes locally.

## Documentation expectations

If your change affects how the system is used or understood, update the docs in the same PR.

Common examples:

- auth flow changes -> `docs/auth.md`
- request/response changes -> `docs/frontend-contract.md`
- file structure or module-role changes -> `docs/linting-and-file-anatomy.md`
- system boundary changes -> `docs/ARCHITECTURE.md`

## Questions and large changes

If the change is large, architectural, or likely to affect multiple flows, open an issue or start a design discussion before implementation. That is not bureaucracy; that is how you avoid expensive rework.
