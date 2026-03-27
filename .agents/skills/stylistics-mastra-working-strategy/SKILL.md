---
name: stylistics-mastra-working-strategy
description: >
  Practical operating rules for implementing Mastra features in this backend
  without turning workflows, prompts, or helpers into a second application
  architecture. Trigger: load after the core `mastra` skill and the
  `stylistics-mastra-architecture` skill when changing agents, workflows,
  prompting strategy, provider options, observability, or Mastra-facing
  application boundaries in this project.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Stylistics Mastra Working Strategy

## When to Use

- After loading `.agents/skills/mastra/SKILL.md` for current API verification.
- After loading `.agents/skills/stylistics-mastra-architecture/SKILL.md` for structural boundaries.
- Before adding or refactoring any agent, workflow, prompt builder, provider option builder, or observability code under `src/mastra/`.
- When deciding whether a Mastra change should stay inline, move to `src/application/`, or become a reusable project skill.

## Core Stance

- The architecture skill tells you where code belongs. This skill tells you how to work once the boundary is clear.
- Treat Mastra as a runtime shell for cognition and orchestration, not as the place to invent a mini-framework around the framework.
- Prefer the smallest Mastra surface that still gives you clear contracts, traceability, and provider control.
- Every new abstraction must remove real repetition or isolate a real risk. If it only makes Mastra look more "enterprise", do not add it.

## Responsibilities In This Project

| Put it here | When it belongs there | Keep out |
| --- | --- | --- |
| Workflow step | Sequencing, handoff, step-level logging, choosing which agent/service runs next | Prompt shaping logic, provider-specific recovery, big policy branches |
| Application module | Prompt builders, structured output schemas, provider option builders, retry/error normalization, reusable post-processing | Mastra bootstrap wiring, step registration, agent lookup |
| Agent instructions | Stable role, quality bar, domain heuristics, output discipline that should apply across calls | Request-specific payloads, workflow-only file paths, product policy that must be code-enforced |
| Project skill | Repeated decision rules for future agents, anti-patterns, repo conventions, known mistakes to avoid | Runtime business logic, values that should be computed in code |

## Practical Decision Rules

### Use direct `agent.generate(...)` inside the workflow step when ALL are true

- The call is local to one step and unlikely to be reused.
- The workflow only needs success/failure, not rich result normalization.
- No structured output schema or provider-specific options are needed.
- The prompt is short, task-scoped, and mostly passes data through.
- Error handling is simple enough that throwing the provider error is acceptable.

Current example: `src/mastra/workflows/stylistic-workflow.ts` uses direct `agent.generate(...)` for profile updates because the step is fire-and-forget, task-specific, and the workflow only needs the original correction payload back.

### Extract to `src/application/` when ANY of these appear

- Structured output must be validated and normalized.
- `providerOptions`, safety settings, or model-dependent behavior are involved.
- Prompt construction is long enough to deserve helpers or test coverage.
- Errors need translation into workflow-friendly logs/messages.
- The same call shape may be reused from another workflow, route, or tool.
- You need deterministic pre/post-processing around the agent call.

Current example: `src/application/stylistics/run-stylistic-correction.ts` owns prompt building, structured output handling, Google safety block detection, and per-call options so the workflow stays thin.

## Prompting Without Polluting Workflows

- Put durable behavior in agent `instructions`; put request payload and one-off task framing in the call prompt.
- Keep workflow prompts short enough that a future reader can still see the orchestration at a glance.
- If a prompt starts encoding protocol steps, formatting rules, provider workarounds, and domain policy together, stop and extract builders/helpers.
- Do not duplicate the same rule in workflow prompt text and in agent instructions unless the workflow truly needs a call-specific override.
- Never trust prompts alone for product-critical invariants; validate agent output in code.

## Structured Output, Provider Options, And Safety

- Keep schemas in `*.schemas.ts` next to the use case that needs them.
- Build generate options in helper/application modules, not inline in workflow steps.
- Use per-call options when the tuning is request-dependent (genre, safety posture, output schema, temperature, provider knobs).
- Keep model selection centralized in `src/mastra/constants/models.ts`; do not scatter provider literals through workflows.
- Catch provider-specific failures where you can add context once. Do not spread Google/Gemini or other provider recovery branches across multiple workflow steps.

Rule of thumb:

- Stable agent identity -> agent instructions + shared model config.
- Request-scoped execution knobs -> `agent.generate(prompt, options)`.
- Deterministic shaping/validation -> application layer.

## Avoid Repeating These Mistakes

- Do not build workflow spaghetti: if the step body contains more policy than orchestration, the design is already drifting.
- Do not overengineer around Mastra: no custom workflow engine, no homegrown agent registry, no wrapper layer for every native Mastra call.
- Do not duplicate native Mastra capabilities such as memory, observability, or agent/tool registration unless the project has a real gap to fill.
- Do not hide provider quirks inside arbitrary helpers with generic names like `utils.ts`; make the adapter explicit.
- Do not hardcode the same workspace file paths or skill paths in many places; once repeated, extract a dedicated builder or constant.
- Do not move logic into helpers just to make a workflow file shorter. Extraction is for responsibility boundaries, not aesthetics.
- Do not create "framework-shaped" abstractions before the second real use case exists.

## What Goes Where

| Concern | Best home in this repo | Why |
| --- | --- | --- |
| Multi-step correction + profile maintenance order | `src/mastra/workflows/` | Orchestration concern |
| Prompt builder + output schema + error normalization | `src/application/...` | Testable, deterministic, reusable |
| Long-lived correction persona | `src/mastra/agents/` | Stable cognitive contract |
| Cross-agent working rules and anti-patterns | `.agents/skills/` | Future-agent guidance, not runtime logic |
| Provider model pool | `src/mastra/constants/models.ts` | Single source of truth |
| Traces/log exporters and redaction | `src/mastra/index.ts` | Runtime infrastructure |

## Observability Worth Keeping

- Log workflow handoff checkpoints with business-safe metadata: slug, category, counts, text lengths, finish reason, model id when useful.
- Prefer one good log at step start and one at step completion over noisy line-by-line tracing.
- Record provider-specific failure context once, close to the call site that understands it.
- Keep Mastra observability exporters in `src/mastra/index.ts`; let the framework handle trace persistence instead of inventing a parallel trace system.
- Use debug logs for prompt metadata, not for dumping full sensitive prompts by default.
- Redaction and safety filters are infrastructure concerns; keep them centralized.

## Helpers, Files, And Abstractions

- Start with one cohesive file, then split into `*.schemas.ts`, `*.types.ts`, or `*.helpers.ts` only when responsibilities actually diverge.
- Name helpers after the feature they support. Avoid anonymous shared buckets.
- A helper should be pure or clearly scoped. If it starts coordinating IO, it probably wants to be an application module instead.
- Do not create a helper that only forwards arguments into `agent.generate(...)` without adding a contract, normalization, or reuse value.
- If a file cannot be understood without reading three other tiny files, you split too early.

## Coexisting With Architecture And Repo Tooling

- Load the `mastra` skill first for current APIs. Load `stylistics-mastra-architecture` second for boundaries. Load this skill third for tactical implementation choices.
- When this skill conflicts with the architecture skill, the architecture boundary wins.
- Follow the repo file conventions: kebab-case filenames, focused feature modules, and sibling suffix files only when needed.
- Keep Biome and Lefthook happy with minimal structure, not ceremony. The goal is clean contracts and maintainable flow, not abstraction count.
- Do not add heavy validation to hooks or use build steps as a local safety crutch; the repo already favors fast lint/file-naming checks.

## Working Checklist

1. Verify the current Mastra API with `.agents/skills/mastra/SKILL.md`.
2. Use `.agents/skills/stylistics-mastra-architecture/SKILL.md` to place the change in the right layer.
3. Ask whether the change is orchestration, deterministic logic, agent behavior, or future-agent guidance.
4. Keep the workflow readable in one pass.
5. Extract only when you gain schema discipline, provider isolation, reuse, or better traces.
6. Re-read the change and delete any abstraction that exists only for style points.

## Commands

```bash
bun run lint
bun run check:filenames
bun run hooks:pre-commit
```

## Resources

- `AGENTS.md` - project-wide instructions and skill loading order.
- `.atl/skill-registry.md` - discoverable local skill registry.
- `.agents/skills/mastra/SKILL.md` - current Mastra API/doc lookup guidance.
- `.agents/skills/stylistics-mastra-architecture/SKILL.md` - structural boundaries for this backend.
- `src/application/stylistics/run-stylistic-correction.ts` - example of extracting structured output, provider options, and safety handling out of the workflow.
- `src/mastra/workflows/stylistic-workflow.ts` - example of a thin workflow with one extracted call and one direct agent call.
- `src/mastra/index.ts` - centralized observability/exporter wiring.
