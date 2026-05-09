# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | `branch-pr` | `C:\Users\User\.claude\skills\branch-pr\SKILL.md` |
| Measure Cognitive Complexity, audit understandability, compare complexity, or refactor to reduce cognitive load. | `cognitive-complexity` | `C:\Users\User\.config\opencode\skills\cognitive-complexity\SKILL.md` |
| Cargar cuando el modelo necesite buscar un término, validar una grafía, explorar variantes, o cuando el usuario pregunte “cómo se escribe”, “es correcto decir”, etc. | `diccionario` | `D:\dev\eln\stylistic\stylistics-backend\workspace\skills\diccionario\SKILL.md` |
| When the user asks “cómo se escribe”, “lleva tilde”, “es correcto decir”, “cuál es el plural de”, or asks about Spanish normative rules. | `dlexa` | `C:\Users\User\.gemini\skills\dlexa\SKILL.md` |
| When writing Go tests, using teatest, or adding test coverage. | `go-testing` | `C:\Users\User\.claude\skills\go-testing\SKILL.md` |
| When user wants to stress-test a plan, get grilled on their design, or mentions “grill me”. | `grill-me` | `C:\Users\User\.claude\skills\grill-me\SKILL.md` |
| When writing or refactoring UI components in React Native projects using heroui-native. | `heroui-native` | `C:\Users\User\.claude\skills\heroui-native\SKILL.md` |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | `issue-creation` | `C:\Users\User\.claude\skills\issue-creation\SKILL.md` |
| When user says “judgment day”, “judgment-day”, “review adversarial”, “dual review”, “doble review”, “juzgar”, or “que lo juzguen”. | `judgment-day` | `C:\Users\User\.claude\skills\judgment-day\SKILL.md` |
| When writing code that imports external libraries, when an error includes library internals, or when a task targets a specific library version. | `kin` | `C:\Users\User\.config\opencode\skills\kin\SKILL.md` |
| When user asks to register/setup KIN in their agent config. | `kin-init` | `C:\Users\User\.config\opencode\skills\kin-init\SKILL.md` |
| Use this skill for all Mastra development to ensure you're using current APIs from the installed version or latest documentation. | `mastra` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\mastra\SKILL.md` |
| When SonarQube reports duplicated test code, duplicated lines density, or repeated Go test boilerplate/testdata patterns. | `no-duplication` | `C:\Users\User\.claude\skills\no-duplication\SKILL.md` |
| After making React changes; use when reviewing code, finishing a feature, or fixing bugs in a React project. | `react-doctor` | `C:\Users\User\.claude\skills\react-doctor\SKILL.md` |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | `skill-creator` | `C:\Users\User\.claude\skills\skill-creator\SKILL.md` |
| Before changing imports across `src/mastra`, `src/server`, `src/domain`, `src/infrastructure`, or any proposed application/use-case layer. | `stylistics-layer-boundaries` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-layer-boundaries\SKILL.md` |
| Before adding or refactoring agents, workflows, provider wiring, or application logic so Mastra remains orchestration, not business logic. | `stylistics-mastra-architecture` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-mastra-architecture\SKILL.md` |
| Load after `mastra` and `stylistics-mastra-architecture` when changing agents, workflows, prompting strategy, provider options, observability, or Mastra-facing boundaries. | `stylistics-mastra-working-strategy` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-mastra-working-strategy\SKILL.md` |
| When debugging a regression that escaped tests, investigating Office.js behavior mismatches, or fixing bugs in `stylistic-addon`. | `stylistic-addon-debugging` | `C:\Users\User\.claude\skills\stylistic-addon-debugging\SKILL.md` |
| When writing, reviewing, or refactoring tests in `stylistic-addon`; load before asserting on Office.js API calls. | `stylistic-addon-testing` | `C:\Users\User\.claude\skills\stylistic-addon-testing\SKILL.md` |
| When user wants to build features or fix bugs using TDD, mentions red-green-refactor, wants integration tests, or asks for test-first development. | `tdd` | `C:\Users\User\.claude\skills\tdd\SKILL.md` |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue; no issue link means the PR is invalid.
- Add exactly one `type:*` label and make it match the commit/PR intent.
- Branch names must follow `type/description` with lowercase `a-z0-9._-` only.
- Use conventional commits only; never add `Co-Authored-By` trailers.
- Use the PR template with `Closes/Fixes/Resolves #N`, summary bullets, changes table, and test plan.
- Run `shellcheck` on modified scripts before opening the PR.

### cognitive-complexity
- Score methods top-to-bottom while tracking `nesting_level` explicitly.
- Structural nodes (`if`, loops, `switch`, `catch`, ternary) add `+1 + nesting_level`.
- `else` / `else if` are hybrid: `+1`, increase nesting, but take no nesting penalty themselves.
- Boolean operator sequences, recursion, and labeled jumps add flat fundamental increments.
- `switch` counts once, `catch` counts once, `try/finally` count zero, lambdas add zero but raise nesting inside.
- Return annotated code, a breakdown table, and refactor suggestions when score is high.

### diccionario
- Use ONLY `./dlexa.exe` from the `workspace/` directory; do not answer from memory or local markdown.
- Always start with `./dlexa.exe search ...` or `./dlexa.exe dpd search ...`, then copy the exact suggested command.
- Do not invent definitions, rules, or command formats if the binary does not show them.
- If results are ambiguous or empty, say so clearly and try nearby variants (singular, infinitive, alternate spelling).
- Use `--no-cache` for stale data and `--doctor` for health checks.

### dlexa
- Use `dlexa` only for normative Spanish doubts; do not use it for translation, etymology, or generic dictionary work.
- Start with `dlexa search ...` or `dlexa dpd search ...`, then execute the exact `- sugerencia:` command returned.
- Never guess CLI syntax from memory; copy the suggested command verbatim.
- If a lookup is weak or misses, refine with another spelling, singular/plural, or infinitive and be explicit about ambiguity.
- Use `--no-cache` for freshness and `--doctor` to validate the tool health.

### go-testing
- Prefer table-driven tests with named cases and `t.Run(...)` for behavior coverage.
- Test Bubbletea state transitions directly through `Model.Update()` with real `tea.KeyMsg` values.
- Use `teatest.NewTestModel(...)` for interactive flows; wait, then assert on `FinalModel(...)`.
- Use golden files for stable rendered output comparisons.
- For boundaries like exec/filesystem, isolate the dependency and test the public behavior, not internals.

### grill-me
- Walk the design tree one unresolved branch at a time; do not dump a random questionnaire.
- Ask the highest-leverage next question first.
- For every question, provide your recommended answer.
- If the codebase can answer a question, inspect the code instead of asking the user.
- Continue until dependencies are resolved and shared understanding is explicit.

### heroui-native
- Wrap the app with `HeroUINativeProvider`; HeroUI theming and toast behavior depend on it.
- Never hardcode colors; use semantic theme classes or `useThemeColor(...)`.
- Use `cn()` from `heroui-native` for class merging instead of template-string class concatenation.
- Prefer HeroUI primitives (`Button`, `Input`, `Tabs`, `Alert`, etc.) over raw RN controls when the component exists.
- Prefer `className` + theme tokens over `StyleSheet.create` for themed styling.

### issue-creation
- Blank issues are disabled; always use the bug or feature template.
- Search for duplicates before creating anything new.
- Questions belong in Discussions, not Issues.
- New issues start as `status:needs-review`; no PR should open until a maintainer adds `status:approved`.
- Fill every required field and pre-flight checkbox completely.

### judgment-day
- Resolve matching compact-rule blocks from the registry first and inject the SAME standards into both judges and the fix agent.
- Launch two blind judges in parallel with `delegate`; the orchestrator coordinates and never performs the review itself.
- Synthesize findings into confirmed, suspect, and contradiction buckets; classify warnings as real vs theoretical.
- After round 1, show the verdict and ASK before fixing confirmed issues.
- Re-judge only when confirmed CRITICAL issues justify it; theoretical warnings become INFO and do not block approval.

### kin
- Use KIN for any external-library API work, library-internal error, pinned version, or version uncertainty.
- Read `.atl/docs-routing.yaml` first, then `.atl/skill-registry.md`, relevant instruction files, and `knowledge/strategies/{lib}`.
- Resolve local dependency metadata before guessing versions; prerelease, pinned, or internal-error cases force docs lookup.
- Discover `llms.txt` candidates and scan manifest capabilities before falling back to generic docs.
- Fallback is linear: Context7 -> official docs pages -> GitHub; save only reusable strategy, not raw docs.

### kin-init
- Read the bundled `kin-search`, routing template, mirrored KIN section, and core `kin` skill before editing anything.
- Classify each artifact as `missing`, `present`, `present-but-stale`, or `conflicting`; preserve conflicting user-owned variants unless migration is explicit.
- Treat `.atl/docs-routing.yaml` as canonical and repair only minimal scaffolding/pointer drift, not project library entries.
- Update the highest-precedence project instruction file surgically with the canonical KIN pointer block; do not append duplicates.
- Re-read every modified artifact and verify one clean KIN footprint plus the final `/kin-search` state.

### mastra
- Never trust memory for Mastra APIs; verify current docs before writing code.
- If `@mastra/*` packages are installed, use embedded docs in `node_modules` first; source code second; remote docs only if needed.
- Mastra requires ES2022 modules with `moduleResolution: bundler`; CommonJS assumptions are wrong.
- Model IDs must use `provider/model-name` format.
- Type errors usually mean stale API knowledge first; verify docs before blaming the app code.

### no-duplication
- Extract repeated Go test case structs into package-level `var` values, never `const`.
- Extract repeated `t.Run` loops into `t.Helper()` runner functions.
- Replace repeated response/model setup with named builder helpers like `makeXxx(...)`.
- Move cross-file boilerplate into dedicated `*_helpers_test.go` files in the same package.
- Exclude duplicated `testdata/` fixtures through Sonar CPD exclusions and re-run analysis after refactoring.

### react-doctor
- Run `npx -y react-doctor@latest . --verbose --diff` after React changes.
- Treat it as a post-change diagnostic for security, performance, correctness, and architecture.
- Fix reported errors first, then re-run to verify improvement.
- Use it near feature completion or bug fixes, not as a replacement for tests.
- Track score changes only after real fixes.

### skill-creator
- Create a skill only for reusable patterns, project-specific conventions, or repeatable decision workflows.
- Use `skills/{skill-name}/SKILL.md` with optional `assets/` and `references/`; references should point to LOCAL files.
- Frontmatter must include lowercase-hyphen `name`, a description with Trigger text, `Apache-2.0`, author, and version.
- Put critical patterns first, keep examples minimal, and include a copy-paste Commands section.
- Register the skill in `AGENTS.md` before calling it complete.

### stylistics-layer-boundaries
- If a convention can be enforced with ESLint, do that; documentation alone is not enough.
- Default to step co-location; keep step helpers, schemas, and tests beside the owning workflow step.
- Do not create pass-through wrappers or share code just to avoid a few duplicated lines.
- Infrastructure must never depend on application/use-case modules; move contracts downward or localize them correctly.
- When shared behavior is real, name the connector by role (`strategy`, `adapter`, `facade`, `service`) and verify dependency direction.

### stylistics-mastra-architecture
- Treat Mastra as orchestration/runtime infrastructure, not as the home of business rules.
- If a module is testable without Mastra, prefer application/domain/shared layers over `src/mastra`.
- Keep workflows thin: sequencing, checkpoints, retries, and handoffs only.
- Agents own reasoning with explicit contracts; deterministic shaping and invariants must live in code outside prompts.
- Centralize provider/model configuration and split feature files only when responsibilities truly diverge.

### stylistics-mastra-working-strategy
- Load `mastra` first and `stylistics-mastra-architecture` second; if they conflict, architecture wins.
- Use direct `agent.generate(...)` only for simple, local calls without structured output or provider-specific handling.
- Extract to application modules when prompts, options, schemas, error normalization, or reuse become substantial.
- Keep durable behavior in agent instructions and request-specific payload in the call prompt; never trust prompts alone for critical invariants.
- Do not build workflow spaghetti or framework-shaped wrappers unless they remove real risk or repetition.

### stylistic-addon-debugging
- Follow the strict bug-fix order: understand current code, verify correct behavior/docs, write RED, prove RED, fix GREEN, then run the full suite.
- Treat screenshots and explicit current-vs-expected behavior as first-class evidence before reading code.
- Investigate in order: symptom -> UI/taskpane -> adapter contract -> creation/resolution mechanics -> Office.js host semantics.
- Pick test type by layer: host contract, adapter regression, or UI guardrail.
- During live bug work, refactor only the active bug path and update skills/instructions when a prior assumption was wrong.

### stylistic-addon-testing
- Use Vitest with `node` environment; co-locate `.test.ts` beside source and skip unit tests under `src/taskpane/**`.
- Stub Word/DOM globals with `vi.stubGlobal(...)` and always restore them with `vi.unstubAllGlobals()`.
- Verify Office.js argument semantics in docs before asserting `toHaveBeenCalledWith(...)`.
- Prefer stateful mocks whose later queries reflect earlier document mutations; permissive mocks hide regressions.
- Cover known Word edge cases such as collapsed cursor fallback, keep-content CC removal, cleanup refresh, and comment line-ending normalization.

### tdd
- Confirm the public interface and priority behaviors before coding; test behavior through public interfaces only.
- Work in vertical slices: one RED test -> minimal GREEN code -> repeat.
- Do not bulk-write all tests first or couple tests to internal implementation details.
- Add only enough code to pass the current test; no speculative features.
- Refactor only after GREEN and rerun tests after each refactor step.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| `AGENTS.md` | `D:\dev\eln\stylistic\stylistics-backend\AGENTS.md` | Index — references files below |
| `CLAUDE.md` | `D:\dev\eln\stylistic\stylistics-backend\CLAUDE.md` | Standalone project convention file |
| `docs/ARCHITECTURE.md` | `D:\dev\eln\stylistic\stylistics-backend\docs\ARCHITECTURE.md` | Referenced by `AGENTS.md` |
| `.agents/skills/mastra/SKILL.md` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\mastra\SKILL.md` | Referenced by `AGENTS.md` |
| `.agents/skills/stylistics-mastra-architecture/SKILL.md` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-mastra-architecture\SKILL.md` | Referenced by `AGENTS.md` |
| `.agents/skills/stylistics-layer-boundaries/SKILL.md` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-layer-boundaries\SKILL.md` | Referenced by `AGENTS.md` |
| `.agents/skills/stylistics-mastra-working-strategy/SKILL.md` | `D:\dev\eln\stylistic\stylistics-backend\.agents\skills\stylistics-mastra-working-strategy\SKILL.md` | Referenced by `AGENTS.md` |
| `workspace/skills/diccionario/SKILL.md` | `D:\dev\eln\stylistic\stylistics-backend\workspace\skills\diccionario\SKILL.md` | Referenced by `AGENTS.md` |
| `src/mastra/agents/profile-agent.skill.ts` | `D:\dev\eln\stylistic\stylistics-backend\src\mastra\agents\profile-agent.skill.ts` | Referenced by `AGENTS.md` |
| `src/mastra/agents/feedback-agent.skill.ts` | `D:\dev\eln\stylistic\stylistics-backend\src\mastra\agents\feedback-agent.skill.ts` | Referenced by `AGENTS.md` |
| `.atl/docs-routing.yaml` | `D:\dev\eln\stylistic\stylistics-backend\.atl\docs-routing.yaml` | Referenced by `AGENTS.md` |
| `.atl/skill-registry.md` | `D:\dev\eln\stylistic\stylistics-backend\.atl\skill-registry.md` | Referenced by `AGENTS.md` |
| `src/mastra/index.ts` | `D:\dev\eln\stylistic\stylistics-backend\src\mastra\index.ts` | Referenced by `AGENTS.md` |
| `package.json` | `D:\dev\eln\stylistic\stylistics-backend\package.json` | Referenced by `AGENTS.md` |
| `tsconfig.json` | `D:\dev\eln\stylistic\stylistics-backend\tsconfig.json` | Referenced by `AGENTS.md` |
| `.env.example` | `D:\dev\eln\stylistic\stylistics-backend\.env.example` | Referenced by `AGENTS.md` |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
