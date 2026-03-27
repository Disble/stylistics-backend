---
name: stylistics-mastra-architecture
description: >
  Project architecture guardrails for building and evolving this Mastra backend.
  Trigger: load before adding or refactoring agents, workflows, provider wiring,
  or application logic so Mastra remains infrastructure and orchestration, not
  the home of all business logic.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Stylistics Mastra Architecture

## When to Use

- Before creating or refactoring any file under `src/mastra/`.
- When deciding whether new behavior belongs in a workflow, agent, tool, or plain application module.
- When adding provider/model configuration, storage adapters, observability, or runtime wiring.
- When a change risks turning workflows into branching scripts full of business rules.

## Critical Patterns

- Mastra is the orchestration layer. It wires workflows, agents, tools, memory, observability, and runtime integration.
- Application logic does NOT live inside Mastra steps just because Mastra can execute it.
- Put durable domain and application rules in plain TypeScript modules outside agent prompts and outside workflow glue.
- Agents exist for cognitive work: interpretation, judgment, extraction, transformation, and tool selection under uncertainty.
- Workflows exist for deterministic sequencing, handoffs, validation boundaries, retries, and persistence checkpoints.
- Provider/model configuration must stay separate from business logic so providers can change without rewriting workflows.

## Target Architecture

| Layer | Responsibility | Typical Paths |
| --- | --- | --- |
| Infrastructure / Orchestration | Mastra bootstrap, workflow composition, agent registration, storage, vectors, observability, provider wiring | `src/mastra/index.ts`, `src/mastra/workflows/`, `src/mastra/agents/`, `src/mastra/constants/` |
| Application | Use cases, orchestration-independent policies, deterministic transformations, validation, mapping | `src/application/`, `src/use-cases/`, `src/services/` |
| Domain | Core rules, entities, value objects, invariants, domain services | `src/domain/` |
| Infrastructure Adapters | File system, DB, provider SDK wrappers, external APIs, repositories | `src/infrastructure/`, `src/providers/`, `src/repositories/` |
| Shared Support | Schemas, DTOs, logging helpers, pure utilities | `src/shared/`, `src/lib/` |

## Recommended Folder Structure

```text
src/
  domain/
    stylistics/
  application/
    stylistics/
    feedback/
    profiles/
  infrastructure/
    persistence/
    providers/
    files/
  shared/
    schemas/
    utils/
  mastra/
    index.ts
    agents/
    workflows/
    tools/
    constants/
    scorers/
    utils/
```

- Treat `src/mastra/` as an adapter entrypoint into the real application layers.
- If a module can be tested without Mastra, it probably belongs outside `src/mastra/`.
- Keep prompt text close to agents, but move deterministic parsing, normalization, policy, and decision code out into reusable modules.

## File Organization Convention

- Prefer feature-first folders inside `src/application/`, `src/domain/`, and `src/infrastructure/`: group files by use case or business capability first, not by technical layer alone.
- Inside a feature, use one base name plus role suffixes when the module grows beyond one file.
- Keep the entry file named with the use case or module name, and add sibling files with explicit suffixes only for stable supporting concerns.

### Naming Pattern

```text
src/application/stylistics/
  run-stylistic-correction.ts
  run-stylistic-correction.constants.ts
  run-stylistic-correction.schemas.ts
  run-stylistic-correction.types.ts
  run-stylistic-correction.helpers.ts
```

- Use kebab-case for file names.
- Reuse the same base name across sibling files so they stay visually grouped.
- Use suffixes that describe the role, not vague categories.
- Start with a single file; split only when responsibilities are clearly different or the file starts mixing contracts and execution.

### What Goes In Each File Type

| File type | Put here | Avoid here |
| --- | --- | --- |
| `feature-name.ts` | Main use case, orchestration-independent application logic, exported public API, light composition of helpers/schemas/types | Big schema declarations, internal utility clutter, unrelated helper functions |
| `feature-name.schemas.ts` | Zod schemas, validation contracts, DTO parsing/shape definitions | Runtime side effects, business flow, provider-specific branching |
| `feature-name.types.ts` | Shared TypeScript types inferred from schemas, explicit ports/interfaces, result shapes | Duplicate schema definitions, hidden runtime constants, logic-heavy helpers |
| `feature-name.constants.ts` | Static values, configuration literals, magic strings, provider-specific settings, enum-like objects | Logic, side effects, anything that imports from the main entry or helpers |
| `feature-name.helpers.ts` | Pure helper functions, parsing helpers, prompt builders, mappers, provider-option builders | Main use-case flow, logging orchestration, stateful IO, inline constants |

### When To Use This Convention

- Use it when one feature file starts mixing schemas, types, helper functions, and the main execution path.
- Use it for application modules that are imported by workflows, agents, or tools and benefit from stable contracts.
- Keep a single file when the module is still short and cohesive; do not split preemptively.

### What To Avoid

- Do not create folders like `types/`, `helpers/`, or `schemas/` at the top level for code that only belongs to one feature.
- Do not split every tiny function into its own file.
- Do not put Mastra workflow glue into `*.helpers.ts` just to make the main file smaller.
- Do not use `utils.ts` as a dumping ground when `helpers.ts` or a more specific suffix would be clearer.
- Do not duplicate exported contracts across multiple files; one source of truth per schema/type.

## Linting And Naming Enforcement

- Use Biome as the default formatter and linter for this backend. Keep tooling centralized and minimal instead of stacking ESLint + Prettier + custom formatter glue.
- Enable Biome filename enforcement with `useFilenamingConvention` and keep source files in kebab-case.
- Biome handles filename case, but project architecture also expects role-suffixed sibling files for split feature modules. Back that up with a tiny repository script that verifies `feature-name.helpers.ts`, `feature-name.schemas.ts`, and `feature-name.types.ts` only exist next to their base `feature-name.ts` file.
- Apply the sibling-file convention mainly in feature-oriented application/domain/infrastructure/shared modules. Do not force Mastra adapter files into artificial dot-suffix splits when a single `weather-agent.ts` or `editorial-workflow.ts` file is still cohesive.
- Treat generic `utils.ts` names inside feature folders as an architecture smell. Prefer a specific feature filename or a `*.helpers.ts` sibling when the helper scope belongs to one feature.

## Git Hook Workflow

- Use Lefthook for repository hooks; keep the workflow explicit and easy to run locally.
- Install hooks through the package manager lifecycle (`prepare`) or an explicit hook script so every contributor can rehydrate hooks after install.
- Keep `pre-commit` focused on fast safety rails only: staged Biome fixes/checks plus the lightweight file-naming validation.
- Do not add builds or heavy integration checks to `pre-commit`; those belong to later validation stages.
- If a hook auto-fixes files, stage the fixes and rerun the check until the commit input is clean.

## Workflow Rules

- Keep workflows thin: coordinate steps, pass validated data, call application services, stop.
- One workflow step should express one orchestration concern, not an entire subsystem.
- Prefer linear flows with explicit handoff objects over deeply nested conditional branches.
- If a workflow needs more than light mapping or guard clauses, extract the logic into `src/application/` first.
- If the same branching appears in multiple workflows, it is application policy and must be shared outside Mastra.
- Persist or log workflow-relevant checkpoints, but do not bury domain decisions inside tracing code.

## Agent Rules

- Agents should own reasoning, not repository architecture.
- Give agents stable contracts: clear input schema, clear output schema, narrow task scope.
- Do not ask agents to perform deterministic transformations that plain code can do more safely.
- Do not hide business-critical invariants only inside prompt instructions; enforce them in code after agent output.
- When an agent needs tools, keep tool side effects explicit and small.

## Provider And Model Boundaries

- Centralize model selection and provider-specific options in dedicated config modules.
- Application services must depend on abstract capabilities or call sites, not on provider-specific literals spread across workflows.
- Provider safety settings, observability tuning, and runtime credentials are infrastructure concerns.
- Switching `google/...` to another provider should mostly touch config and adapter code, not domain/application modules.

## Spaghetti Workflow Smell Check

If two or more are true, STOP and refactor before adding more workflow code.

- The workflow step contains business rules longer than the step wiring itself.
- The same JSON shaping, categorization, or validation logic appears in prompts and code.
- A step knows too much about provider quirks, storage details, and domain rules at the same time.
- New features require editing several unrelated workflows instead of one shared service.
- Error handling branches are carrying product policy instead of technical recovery.
- A prompt is the only place where a critical rule exists.

## Preferred Decision Table

| Need | Put it in | Why |
| --- | --- | --- |
| Deterministic text normalization | `src/application/` or `src/shared/` | Testable and provider-agnostic |
| Domain invariant or policy | `src/domain/` or `src/application/` | Must survive model/prompt changes |
| Agent persona and reasoning instructions | `src/mastra/agents/` | Cognitive capability belongs to the agent |
| Multi-step sequencing and handoff | `src/mastra/workflows/` | Pure orchestration concern |
| Provider/model literals and safety settings | `src/mastra/constants/` or `src/infrastructure/providers/` | Infra concern, easy to swap |
| External IO wrapper | `src/infrastructure/` or `src/mastra/tools/` | Side effects stay isolated |

## Change Checklist

1. Define what part is orchestration vs. application logic.
2. Extract deterministic rules before touching the workflow.
3. Keep agents focused on reasoning tasks with explicit schemas.
4. Centralize any new provider/model configuration.
5. Re-read the workflow and remove anything that smells like hidden business logic.

## Resources

- `AGENTS.md` - project-wide Mastra and skills instructions.
- `.atl/skill-registry.md` - local registry for discoverable project skills.
- `.agents/skills/mastra/SKILL.md` - current Mastra API/doc lookup guidance.
