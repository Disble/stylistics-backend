---
name: stylistics-layer-boundaries
description: >
  Enforces dependency direction, layer ownership, and lint-first architecture
  decisions for the Stylistics backend. Trigger: before changing imports across
  src/mastra, src/server, src/domain, src/infrastructure, or any proposed
  application/use-case layer.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Stylistics Layer Boundaries

## When to Use

- Before adding, moving, or deleting code across architectural layers.
- Before creating `src/application`, `src/use-cases`, `src/services`, `src/features`, or similar boundary folders.
- Before importing between `src/mastra`, `src/server`, `src/domain`, and `src/infrastructure`.
- Before extracting workflow step logic into another module.
- Before documenting an architecture convention that could be enforced by ESLint.

## Critical Patterns

1. **Documentation is not enough.** If a convention can be enforced with ESLint, propose the doc update together with the rule.
2. **Step co-location is the default.** Treat workflow step folders like React component folders: keep the step, schemas, types, helpers, and tests close unless there is a justified boundary.
3. **Do not create pass-through wrappers.** A module that only validates input and forwards to another dependency is not an abstraction; it is indirection.
4. **Shared code must earn its place.** Share only real policy, stable contracts, or meaningful integration logic. Do not share just to avoid a few repeated lines.
5. **SOLID is design thinking, not class ceremony.** Optimize dependency direction, cohesion, interface size, and change isolation; do not invent interfaces by reflex.
6. **Infrastructure must not depend on application/use-case modules.** If infrastructure needs a contract, move that contract to domain, an infrastructure-local contract, or an explicit port with correct dependency direction.

## Dependency Direction

Allowed high-level flow:

```text
routes / workflows / steps
  -> step-local helpers OR justified connector
  -> domain / ports
  -> infrastructure implementations
```

The forbidden smell:

```text
infrastructure -> application
```

Why: infrastructure is an implementation detail. It must not import from a higher-level use-case folder just to reuse DTOs or helper types.

## Layer Responsibilities

| Layer | Owns | Must not own |
| --- | --- | --- |
| `src/mastra/workflows/*/steps/*` | Step orchestration, local mapping, step-specific helpers, schemas, tests | Large shared policies, provider quirks repeated across flows |
| `src/server/routes/*` | HTTP entrypoint, auth/context extraction, route schemas | Workflow internals, persistence details beyond adapter calls |
| `src/domain/*` | Stable business concepts, invariants, value types, policies | Mastra runtime details, database schemas, provider SDKs |
| `src/infrastructure/*` | DB/API/filesystem/provider adapters and implementations | Application/use-case imports, workflow contracts |
| Connector module | Strategy/adapter/facade/service with explicit integration purpose | Pass-through forwarding, generic "utils" dumping ground |

## Extraction Decision Table

| Situation | Decision |
| --- | --- |
| Logic is used by one step and belongs to that step | Keep it in the step folder. |
| Logic is a trivial pass-through wrapper | Delete the wrapper; inline or move the contract to the right owner. |
| Two steps repeat a few simple lines | Prefer small duplication until shared policy is proven. |
| Multiple entrypoints need the same real policy | Create a named connector: strategy, adapter, facade, or feature service. |
| Contracts are needed by infrastructure | Put contracts in domain, ports, or infrastructure-local files; never in application. |
| A guideline can be statically enforced | Propose an ESLint rule together with the docs update. |

## Lint-First Architecture Rule

When proposing or implementing an architecture guideline, always check whether it can become an ESLint rule.

Use this response pattern:

```text
Te actualizo la doc y, donde se pueda, agrego la regla de ESLint para que no dependa de memoria humana.
```

Examples of enforceable rules:

- prevent imports from `src/infrastructure/**` to `src/application/**`
- prevent workflow steps from importing trivial pass-through use cases
- prevent generic `utils.ts` buckets
- restrict cross-workflow imports unless they go through an explicit connector
- enforce sibling file naming for step folders

## Review Checklist

Before approving a layer change, verify:

- [ ] Does the import direction point inward or to a lower/stable layer?
- [ ] Is this abstraction doing more than forwarding arguments?
- [ ] Could this stay in the step folder without reducing clarity?
- [ ] Is the shared surface smaller than the duplication it replaces?
- [ ] Is the connector named after the role it plays: strategy, adapter, facade, or service?
- [ ] Can the rule be enforced with ESLint? If yes, propose or implement it.

## Project-Specific Current Guidance

- `src/application` should not exist merely as a bucket for extracted workflow-step logic.
- If `src/application` only mirrors workflow steps, remove or replace it with better-owned modules.
- For the current document profile work, wrappers like `resolveDocumentContext` should disappear unless a strongly justified shared boundary emerges.
- If shared document behavior remains necessary, prefer a clearly named connector or domain/port contract with correct dependency direction.

## Commands

```bash
bun run lint
bun run check:filenames
bun run validate
```

## Resources

- `docs/ARCHITECTURE.md` — repository architecture and workflow principles.
- `docs/linting-and-file-anatomy.md` — file anatomy and ESLint-enforced conventions.
- `eslint.config.mjs` — executable architecture and import rules.
- `.agents/skills/stylistics-mastra-architecture/SKILL.md` — Mastra architecture boundaries.
- `.agents/skills/stylistics-mastra-working-strategy/SKILL.md` — tactical Mastra workflow extraction rules.
