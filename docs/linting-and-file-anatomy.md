# Linting and File Anatomy Guidelines

This document defines the project rules for ESLint-driven file anatomy. The goal
is to stop generated or hand-written code from accumulating unrelated concerns
in one file.

These rules deliberately avoid vague categories like "main file" or
"architectural file". A rule is valid only when it can be detected mechanically
by filename, folder path, import, or AST shape.

This file is the runtime contract. The high-level architectural narrative for
the same conventions lives in [ARCHITECTURE.md](./ARCHITECTURE.md) under
"Shared Module Structure Template" and "File Role Notation".

## Guiding principle

When code contains a recognizable secondary concern, that concern must live in
its dedicated anatomy file.

| Detected concern | Detector | Required file |
| --- | --- | --- |
| exported types, interfaces, enums | `export type`, `export interface`, `export enum` | `*.types.ts` |
| exported semantic constants | `export const SCREAMING_CASE` | `*.constants.ts` |
| pure exported helpers | exported non-IO helper functions | `*.helpers.ts` |
| schemas | zod schema declarations/exports | `*.schemas.ts` |
| prompt assembly | exported prompt template literals | `*.prompt.ts` |
| skill text | exported skill body for an agent | `*.skill.ts` |
| workflow step body | step definition consumed by a workflow | `*.step.ts` |
| tests | colocated `*.test.ts` | colocated next to the file under test |

The enforcement model is content-first: if a new module role appears tomorrow,
the rule still holds because it targets the mixed concern itself, not a brittle
taxonomy of possible file roles.

## Naming conventions

Filenames and folder names under `src/` are kebab-case and ASCII only. The
linter rejects PascalCase, camelCase, snake_case, and non-ASCII characters.

Do not create generic `utils.ts` or `Utils.ts` files inside feature folders.
Generic utility buckets hide ownership; if a function deserves to exist, it
deserves a feature-aligned home or a `*.helpers.ts` sibling.

Compound names follow the role-suffix pattern: `feature-name.<role>.ts`. Only
the suffixes from the table above (and the `.test.ts` / `.spec.ts` test
suffixes) are blessed. Adding a new role suffix is itself an architectural
decision and must be agreed before introducing it.

## Folder anatomy

Outside the runtime constants folder, modules grow in three stages.

### Pattern A: single-file module

Use a single file when the module is still cohesive and small.

```text
<area>/
  feature-name.ts
```

Typical examples: simple agents, small workflows, thin adapters, single-purpose
constants. Do not split preemptively.

### Pattern B: feature folder

When the module grows and contracts, helpers, prompt assembly, or tests start
competing for space, evolve into a feature folder.

```text
<area>/
  feature-name/
    index.ts
    feature-name.ts
    feature-name.types.ts
    feature-name.constants.ts
    feature-name.schemas.ts
    feature-name.helpers.ts
    feature-name.prompt.ts
    feature-name.test.ts
    feature-name.schemas.test.ts
    feature-name.helpers.test.ts
    feature-name.prompt.test.ts
```

Not every feature folder needs all of these files. The rule is additive — only
create the sibling files that correspond to a real, stable responsibility. Do
not create empty anatomy files.

`index.ts` is an export surface, not a logic bucket.

### Pattern C: nested subfeatures

When a feature is itself a container of subfeatures (multi-step workflows are
the canonical case), use a root entrypoint plus nested feature folders.

```text
<area>/
  feature-name/
    feature-name.ts
    index.ts
    steps/
      index.ts
      step-a/
        index.ts
        step-a.step.ts
        step-a.schemas.ts
        step-a.types.ts
      step-b/
        index.ts
        step-b.step.ts
        step-b.helpers.ts
```

## File role rules

### Types

Exported TypeScript contracts live in `*.types.ts`.

```text
load-author-profile.types.ts
correct-text.types.ts
```

The linter warns when an `export type`, `export interface`, or `export enum`
appears outside a `*.types.ts` file inside `src/`.

### Constants

Exported semantic constants (`export const SCREAMING_CASE`) live in
`*.constants.ts`.

The linter warns when SCREAMING_CASE constants are exported from any other
file under `src/` — with three intentional exemptions:

- `src/mastra/constants/**` is the runtime configuration boundary (models,
  storage, vectors, memory, workspaces). Files there are themselves the
  constants module for their concern; they predate the suffix convention and
  do not need to migrate.
- `*.prompt.ts` files own prompt content as their entire purpose; the
  exported prompt is the role of the file.
- `*.skill.ts` files own skill text in the same way.

### Helpers

Exported pure helper functions live in `*.helpers.ts`. Helpers must stay
framework-free — the linter forbids any of these imports inside a
`*.helpers.ts` file:

- `@mastra/*`
- `better-auth`, `better-auth/*`
- `drizzle-orm`, `drizzle-orm/*`
- `pg`
- `pino`

If a function needs those dependencies, it is not a generic helper. It belongs
in the feature module, an adapter, or `src/mastra/constants/`.

### Schemas

Zod schemas live in `*.schemas.ts` (plural). The plural form is intentional and
is the canonical form across this repository — sibling backend code already
uses it; do not introduce `*.schema.ts`.

### Prompts

Prompt content (template literals, prompt builders) lives in `*.prompt.ts`.

Agents that require non-trivial prompts must extract them. The base agent file
stays focused on runtime composition (`new Agent({ ... })`) and imports the
prompt from its sibling. Established examples:

- `src/mastra/agents/feedback-agent.ts` + `feedback-agent.prompt.ts`
- `src/mastra/agents/profile-agent.ts` + `profile-agent.prompt.ts`
- `src/mastra/agents/stylistic-agent.ts` + `stylistic-agent.prompt.ts`
- `src/mastra/agents/stylistic-consultation-agent.ts` +
  `stylistic-consultation-agent.prompt.ts`

There is no automatic detector for "prompt is too long, extract it" today.
Extraction is judgment-driven: when an agent file ceases to be readable in one
pass because the prompt dominates it, extract.

### Skills

Skill bodies (the protocol or canonical instructions consumed by an agent)
live in `*.skill.ts`. They are exported as constants and composed inside the
prompt file via template interpolation, exactly as
`feedback-agent.skill.ts` is composed into `feedback-agent.prompt.ts`.

### Workflow steps

Step files use `*.step.ts`. This is workflow-specific notation, not a generic
suffix for arbitrary modules. A `*.step.ts` file is expected to be the
implementation passed to a Mastra workflow's `.then(...)` — its sole runtime
role.

### Tests

Test files use `*.test.ts` and live colocated next to the file under test.
Spec-style `*.spec.ts` is also accepted. Both are exempt from the types and
constants extraction rules.

## Agent anatomy

Agents follow the same content-first decomposition as the rest of the
repository.

```text
agents/
  feature-agent.ts          # Agent({...}) runtime only
  feature-agent.prompt.ts   # the instructions string
  feature-agent.skill.ts    # canonical protocol body, optional
  feature-agent.types.ts    # output / runtime context shapes, optional
```

The base `feature-agent.ts` should contain the `new Agent({ ... })` call and
nothing else of substance. Imports allowed: `@mastra/core/agent`, repo-local
constants (`memory`, `modelPool`, workspaces), and the sibling prompt.

This mirrors the "store + state types + constants" decomposition that the
sibling stylistic-addon project uses for Zustand stores: the runtime file owns
runtime composition, every other concern is extracted.

## ESLint enforcement

The flat config in `eslint.config.mjs` wires the following plugins:

| Plugin | Responsibility |
| --- | --- |
| `typescript-eslint` | TypeScript parsing and base recommended rules |
| `@eslint/js` | JavaScript recommended rules |
| `eslint-plugin-check-file` | filename and folder contracts (kebab-case, no `utils.ts`) |
| `eslint-plugin-import-x` | import hygiene (`no-duplicates`, `no-cycle`) |
| `eslint-plugin-sonarjs` | maintainability rules (cognitive complexity, duplicate functions) |
| `eslint-plugin-jsdoc` | tag-name validation on doc comments |

Custom rules are expressed via `no-restricted-syntax` for AST-level detection
and `no-restricted-imports` for the helpers purity rule. The full list of
exemptions is co-located with each rule in `eslint.config.mjs`.

Run the full pipeline with `bun run validate`. It chains:

1. `bun run lint` — ESLint (errors fail the build, warnings do not)
2. `bun run format:check` — Prettier (no formatting drift)
3. `bun run typecheck` — `tsc --noEmit`

`bun run lint:write` and `bun run format` apply autofixes for ESLint and
Prettier respectively. The lefthook pre-commit hook runs both on staged files
and re-stages the result.

## Adding new rules

Prefer extending the existing ESLint plugins before adding custom scripts. A
rule belongs in this repository when:

- it can be expressed as an AST selector or filename/folder pattern,
- it has at least one concrete example of code that should fail it, and
- the failure mode is more useful as an error or warning than as code review
  feedback.

If a content-first rule cannot be expressed in ESLint (for example, "the
prompt template literal exceeds N lines"), document the convention here and
keep it as a code-review check. Do not add a parallel custom script unless
that check is high-traffic.
