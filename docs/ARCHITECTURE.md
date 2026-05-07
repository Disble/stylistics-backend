# stylistics-backend Architecture

## Overview

`stylistics-backend` is a Mastra-based orchestration service for literary and stylistic text correction. It exposes workflows that:

- load author context from the project workspace,
- generate structured correction suggestions,
- update long-lived author profiles, and
- process explicit author feedback.

The repository uses Mastra as the runtime shell for agents, workflows, memory, observability, and workspace access. The intended architectural direction is to keep Mastra focused on orchestration while deterministic business rules move into plain TypeScript modules.

## Architectural Principles

### 1. Mastra is the orchestration layer

Code under `src/mastra/` should wire runtime concerns such as agent registration, workflow composition, storage, vectors, observability, and workspace access.

### 2. Workflows stay thin

Workflows should sequence validated steps and handoffs. If a workflow starts carrying business policy, provider quirks, or complex data shaping, that logic should be extracted.

### 3. Agents own cognitive work

Agents are used for interpretation, judgment, extraction, and author-profile reasoning. They should not be the only place where product-critical invariants live.

### 4. Workspace files are part of the system design

The `workspace/` directory is not incidental content. It stores author profiles, reference material, and repo-local skills that shape runtime behavior.

### 5. Infrastructure is centralized

Model selection, storage, vector configuration, and observability are defined centrally so provider or runtime changes do not spread across workflows.

## High-Level Architecture

| Layer | Responsibility | Key paths |
| --- | --- | --- |
| Runtime bootstrap | Build the Mastra app, register agents and workflows, configure storage and observability | `src/mastra/index.ts` |
| Workflows | Deterministic sequencing and validated handoffs | `src/mastra/workflows/` |
| Agents | Reasoning-heavy tasks and structured generation | `src/mastra/agents/` |
| Runtime constants | Models, memory, vectors, database, workspace mounting | `src/mastra/constants/` |
| Authentication | Better Auth configuration, Google provider, bearer sessions, Mastra auth adapter | `src/auth/` |
| Supporting runtime code | Logging, tools, scorers | `src/mastra/utils/`, `src/mastra/tools/`, `src/mastra/scorers/` |
| Workspace knowledge | Author profiles, DPD references, repo-local skills | `workspace/` |
| Project documentation | Contracts and architecture notes | `docs/` |

## Runtime Composition

The main runtime is assembled in `src/mastra/index.ts`.

It registers:

- workflows: `stylisticWorkflow`, `feedbackWorkflow`, plus example/demo workflows,
- agents: `stylisticAgent`, `profileAgent`, `feedbackAgent`, `stylisticConsultationAgent`, and supporting/demo agents,
- storage: PostgreSQL via `PostgresStore`,
- auth: Better Auth through `@mastra/auth-better-auth`,
- custom public auth routes: `/auth/*`, `/auth-complete`, and `/auth-bridge-session`,
- vector search: `PgVector`,
- observability: `DefaultExporter`, `CloudExporter`, and `SensitiveDataFilter`,
- logging: `PinoLogger`.

This gives the backend one central place for runtime wiring instead of scattering infrastructure concerns across feature code.

### Authentication boundary

Authentication is an infrastructure boundary, not workflow logic. Better Auth
configuration lives under `src/auth/`; Mastra only receives the adapted provider
through `server.auth` in `src/mastra/index.ts`.

The Word add-in logs in with Google through Better Auth and then calls protected
Mastra routes with the Better Auth session token as a bearer token. Workflows and
agents should consume the authenticated user only through explicit runtime
context/contracts; they must not call provider-specific Google APIs directly.

The Office add-in OAuth bridge is also assembled in `src/mastra/index.ts` because
it is runtime HTTP wiring:

- `/auth/*` delegates to Better Auth.
- `/auth-complete` converts the backend callback session into a one-time bridge
  code.
- `/auth-bridge-session` lets the add-in origin exchange that code for the
  session payload.

Keep the bridge code store short-lived and single-use. If the backend becomes
multi-instance, move the store out of process memory.

## Core Flows

### Stylistic correction flow

The main production workflow is `src/mastra/workflows/stylistic/stylistic-workflow.ts`.

It is intentionally thin and delegates the feature into three ordered steps:

1. `loadAuthorProfile`
2. `correctText`
3. `updateProfile`

Conceptually, the flow is:

```text
Frontend request
  -> load author profile from workspace/autores/{slug}.md
  -> generate structured correction suggestions
  -> extract clean patterns
  -> update the author profile after the correction
  -> return suggestions + cleanPatterns
```

The frontend contract for this flow is documented in `docs/frontend-contract.md`.

### Feedback flow

`src/mastra/workflows/feedback/feedback-workflow.ts` validates frontend feedback, skips empty comments, and delegates actionable comments to `feedbackAgent`.

This keeps the workflow deterministic while reserving interpretation of author intent for the agent.

## Author Profile Architecture

Author profiles live under `workspace/autores/` and are maintained by the Profile Agent and the Feedback Agent. The canonical protocol is defined as a bundleable TypeScript constant in `src/mastra/agents/profile-agent.skill.ts` and composed by `src/mastra/agents/profile-agent.prompt.ts`.

The profile follows a two-section structure:

- `## PATRONES VIVOS`: active correctional patterns organized by category (Ortografía, Gramática, Puntuación, Tipografía, Léxico, Estilo). Each pattern carries a semaphore state.
- `## CRITERIOS DE INTERVENCIÓN`: explicit author preferences, hard limits, and intervention scope. No semaphore — only flat bullets from direct author feedback.

The profile lifecycle is semaphore-driven:

- `🔴` active pattern,
- `🟡` first clean confirmation,
- `🟢` confirmed and immediately pruned.

The update protocol runs in three phases:

1. **Observe**: compare session `suggestions` and `cleanPatterns` against existing live patterns in `PATRONES VIVOS`.
2. **Transition**: advance semaphore states based on fresh session evidence.
3. **Prune**: immediately delete any pattern that reached `🟢`.

`CRITERIOS DE INTERVENCIÓN` is not semaphore-driven. It changes only via explicit author feedback processed by the Feedback Agent, whose protocol is defined in `src/mastra/agents/feedback-agent.skill.ts` and composed by `src/mastra/agents/feedback-agent.prompt.ts`.

This design keeps correction context compact for the main agent while preserving durable author learning over time.

## Memory, Storage, and Vectors

### Database

The backend requires `POSTGRES_URL` and initializes PostgreSQL-backed storage in `src/mastra/constants/db.ts`.

### Vector store

`src/mastra/constants/vector.ts` configures `PgVector` and standardizes the embedding dimension at `768`, aligned with the configured embedding model.

### Memory

`src/mastra/constants/memory.ts` configures Mastra memory with:

- `lastMessages: 10`
- semantic recall with `topK: 3`
- `messageRange: 2`

The project also documents Observational Memory separately in `docs/observational-memory-overview.md`, `docs/observational-memory-config.md`, and `docs/observational-memory-integration.md`.

## Workspace as a Runtime Boundary

`src/mastra/constants/workspaces.ts` mounts the repository-local `workspace/` directory through Mastra's workspace API.

That workspace contains three important categories of runtime data:

- `workspace/autores/`: persistent author profiles,
- `workspace/dpd/`: language reference material,
- `workspace/skills/`: repo-local skills that encode operational rules.

The project convention is that paths are resolved relative to the mounted workspace root. Runtime code and prompts should not prepend `workspace/` inside workspace-relative paths.

## Models and Provider Boundaries

`src/mastra/constants/models.ts` centralizes the model pool used by the different agents.

That separation matters because it prevents workflow files from becoming provider-configuration dumps. Model choices can evolve independently from feature orchestration.

## Directory Structure

```text
src/
  auth/
    auth.ts
    auth-db.ts
    auth-env.ts
    auth-schema.ts
    mastra-auth.ts
  mastra/
    index.ts
    agents/
    constants/
    scorers/
    tools/
    utils/
    workflows/
workspace/
  autores/
  dpd/
  skills/
docs/
  ARCHITECTURE.md
  auth.md
  frontend-contract.md
  linting-and-file-anatomy.md
  observational-memory-config.md
  observational-memory-integration.md
  observational-memory-overview.md
```

## Shared Module Structure Template

The goal of this document is not to describe every concrete workflow or module. The goal is to define the folder template and file-role notation that the repository reuses across features.

### Pattern A: single-file module

Use a single file when the module is still cohesive and small.

```text
<area>/
  feature-name.ts
```

Typical examples:

- simple agents,
- small workflows,
- constants with one clear responsibility,
- thin adapters that do not yet need internal decomposition.

Rule: do not split preemptively. A single file is preferred until contracts, helpers, prompt assembly, or tests start competing for space.

### Pattern B: feature folder

When a module grows, it should evolve into a feature folder that keeps one base name plus explicit role suffixes.

```text
<area>/
  feature-name/
    index.ts
    feature-name.ts
    feature-name.schemas.ts
    feature-name.types.ts
    feature-name.helpers.ts
    feature-name.constants.ts
    feature-name.prompt.ts
    feature-name.test.ts
    feature-name.schemas.test.ts
    feature-name.helpers.test.ts
    feature-name.prompt.test.ts
```

Not every feature folder needs all of these files. The rule is additive: only create the sibling files that correspond to a real, stable responsibility.

### Pattern C: nested subfeatures

When a feature is itself a container of subfeatures, use a root entrypoint plus nested feature folders.

```text
<area>/
  feature-name/
    feature-name.ts
    index.ts
    subfeatures/
      index.ts
      subfeature-a/
        index.ts
        subfeature-a.ts
        subfeature-a.schemas.ts
        subfeature-a.types.ts
      subfeature-b/
        index.ts
        subfeature-b.ts
        subfeature-b.helpers.ts
```

This is the general pattern behind composed modules such as multi-step workflows, but the template is broader than workflows: it also applies to any feature that needs internal decomposition.

## File Role Notation

The repository uses suffixes as architectural notation. The suffix is not cosmetic; it marks the allowed responsibility of the file.

| Notation | Responsibility | Use it when |
| --- | --- | --- |
| `feature-name.ts` | Main entrypoint for a module or feature | the feature needs one public execution/composition file |
| `feature-name.schemas.ts` | Runtime validation and parsing contracts | the module has `zod` schemas or validated IO |
| `feature-name.types.ts` | TypeScript-only contracts | the module needs inferred or explicit compile-time types |
| `feature-name.helpers.ts` | Narrow deterministic support logic | helpers are real siblings of the feature, not generic utilities |
| `feature-name.constants.ts` | Static literals and bounded configuration | the module has stable constants worth separating |
| `feature-name.prompt.ts` | Prompt assembly | the module builds prompt text or structured prompt payloads |
| `feature-name.step.ts` | Workflow-step execution | the feature is specifically a workflow step in Mastra |
| `index.ts` | Re-export boundary | the folder needs a stable public surface |
| `feature-name.test.ts` | Behavioral tests | the main feature behavior needs direct coverage |
| `feature-name.schemas.test.ts` | Contract tests | schema behavior needs direct coverage |
| `feature-name.helpers.test.ts` | Helper tests | deterministic helper behavior needs direct coverage |
| `feature-name.prompt.test.ts` | Prompt tests | prompt generation needs regression coverage |

### Interpretation rules

1. The base file owns the main story of the feature.
2. Suffix files exist to prevent the base file from mixing too many concerns.
3. `index.ts` is an export surface, not a logic bucket.
4. `.step.ts` is workflow-specific notation, not a generic suffix for arbitrary modules.
5. `.prompt.ts` is also specialized: use it only when prompt construction is a first-class concern.
6. If a suffix file has only trivial content, it probably should not exist yet.

## Folder Design Rules

### Reuse one base name per feature

Sibling files inside one feature folder should reuse the same base name so the module remains visually grouped.

```text
author-profile/
  author-profile.ts
  author-profile.schemas.ts
  author-profile.types.ts
  author-profile.helpers.ts
```

Avoid patterns like this:

```text
author-profile/
  run.ts
  schemas.ts
  helpers.ts
  misc.ts
```

The second version loses discoverability and turns filenames into generic buckets.

### Prefer feature folders over top-level technical buckets

Prefer:

```text
src/application/stylistics/
  run-stylistic-correction.ts
  run-stylistic-correction.schemas.ts
  run-stylistic-correction.types.ts
```

Avoid:

```text
src/application/
  helpers/
  schemas/
  types/
```

Top-level technical buckets usually hide ownership and make related files harder to track.

### Start flat, split on responsibility boundaries

The usual progression is:

1. one cohesive file,
2. then one feature folder,
3. then nested subfeature folders only when the feature truly becomes composite.

The split is justified by responsibility boundaries, not by aesthetics.

## What Architecture Cares About

This document cares about shared structure, naming, and ownership boundaries.

It does not try to inline the internal explanation of every concrete workflow, agent, or feature module. Those details belong in:

- inline docs inside the module itself,
- colocated tests,
- feature-specific docs when a feature needs deeper explanation.

## Conventions

- Use kebab-case file names.
- Keep feature code grouped by capability.
- Keep workflows readable in one pass.
- Prefer extracting deterministic logic instead of hiding it in prompts.
- Treat repo-local skills as canonical operational guidance for agents working in this repository.

## Current State and Direction

The current codebase already has a good separation between runtime wiring and workflow composition. The next architectural improvement path is to move more deterministic application logic out of prompts and step bodies into non-Mastra modules such as future `src/application/`, `src/domain/`, and `src/infrastructure/` folders.

That keeps Mastra stable as an orchestration shell while the actual business logic becomes easier to test, reuse, and evolve.

## Related Documents

- `AGENTS.md`
- `CLAUDE.md`
- `docs/auth.md`
- `docs/frontend-contract.md`
- `docs/linting-and-file-anatomy.md`
- `src/mastra/agents/profile-agent.skill.ts`
- `src/mastra/agents/feedback-agent.skill.ts`
- `docs/observational-memory-overview.md`
- `docs/observational-memory-config.md`
- `docs/observational-memory-integration.md`
