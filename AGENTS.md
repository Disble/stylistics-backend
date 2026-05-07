# AGENTS.md

This document provides guidance for AI coding agents working in this repository.

## CRITICAL: Mastra Skill Required

**BEFORE doing ANYTHING with Mastra code or answering Mastra questions, load the Mastra skill FIRST.**

See [Mastra Skills section](#mastra-skills) for loading instructions.

## Project Overview

This is a **Mastra** project written in TypeScript. Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack.

For the repository architecture and system boundaries, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Commands

Use these commands to interact with the project.

### Installation

```bash
npm install
```

### Development

Start the Mastra Studio at localhost:4111 by running the `dev` script:

```bash
npm run dev
```

### Build

In order to build a production-ready server, run the `build` script:

```bash
npm run build
```

## Project Structure

Folders organize your agent's resources, like agents, tools, and workflows.

| Folder                 | Description                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/mastra`           | Entry point for all Mastra-related code and configuration.                                                                               |
| `src/mastra/agents`    | Define and configure your agents - their behavior, goals, and tools.                                                                     |
| `src/mastra/workflows` | Define multi-step workflows that orchestrate agents and tools together.                                                                  |
| `src/mastra/tools`     | Create reusable tools that your agents can call                                                                                          |
| `src/mastra/mcp`       | (Optional) Implement custom MCP servers to share your tools with external agents                                                         |
| `src/mastra/scorers`   | (Optional) Define scorers for evaluating agent performance over time                                                                     |
| `src/mastra/public`    | (Optional) Contents are copied into the `.build/output` directory during the build process, making them available for serving at runtime |

### Top-level files

Top-level files define how your Mastra project is configured, built, and connected to its environment.

| File                  | Description                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/mastra/index.ts` | Central entry point where you configure and initialize Mastra.                                                    |
| `.env.example`        | Template for environment variables - copy and rename to `.env` to add your secret [model provider](/models) keys. |
| `package.json`        | Defines project metadata, dependencies, and available npm scripts.                                                |
| `tsconfig.json`       | Configures TypeScript options such as path aliases, compiler settings, and build output.                          |

## Mastra Skills

Skills are modular capabilities that extend agent functionalities. They provide pre-built tools, integrations, and workflows that agents can leverage to accomplish tasks more effectively.

This project has skills installed for the following agents:

- Claude Code
- Cursor
- Github Copilot
- Antigravity

### Loading Skills

1. **Load the Mastra skill FIRST** - Use `/mastra` command or Skill tool
2. **Never rely on cached knowledge** - Mastra APIs change frequently between versions
3. **Always verify against current docs** - The skill provides up-to-date documentation

**Why this matters:** Your training data about Mastra is likely outdated. Constructor signatures, APIs, and patterns change rapidly. Loading the skill ensures you use current, correct APIs.

Skills are automatically available to agents in your project once installed. Agents can access and use these skills without additional configuration.

### Project Skills

| Skill | Description | Source |
|-------|-------------|--------|
| `mastra` | Guía base para trabajar con APIs vigentes de Mastra y verificar documentación antes de escribir código | [.agents/skills/mastra/SKILL.md](.agents/skills/mastra/SKILL.md) |
| `stylistics-mastra-architecture` | Arquitectura objetivo del backend: Mastra como orquestación, workflows livianos, lógica de aplicación separada y límites para evitar workflows espagueti | [.agents/skills/stylistics-mastra-architecture/SKILL.md](.agents/skills/stylistics-mastra-architecture/SKILL.md) |
| `stylistics-mastra-working-strategy` | Practical operating strategy for implementing Mastra features in this repo without overengineering workflows, prompts, helpers, or provider glue | [.agents/skills/stylistics-mastra-working-strategy/SKILL.md](.agents/skills/stylistics-mastra-working-strategy/SKILL.md) |

### Workspace Skills

| Skill | Description | Source |
|-------|-------------|--------|
| `diccionario` | Consultar el DLE usando el binario local `dlexa.exe` | [SKILL.md](workspace/skills/diccionario/SKILL.md) |

> **Author profile protocol** is defined in [`docs/protocols/profile-agent-protocol.md`](docs/protocols/profile-agent-protocol.md) and loaded at runtime by `src/mastra/agents/profile-agent.skill.ts`. See also the feedback protocol at [`docs/protocols/feedback-agent-protocol.md`](docs/protocols/feedback-agent-protocol.md).

## KIN Docs Routing

KIN project-local docs routing lives in `.atl/docs-routing.yaml`.
Read that file first when resolving external-library docs.
Then use `.atl/skill-registry.md`, project instruction files, and relevant skills only to discover or follow sources that routing and the current project context point to; they do not replace local routing.

## KIN (Knowledge Ingestion Network)

KIN is an internal documentation intelligence service. It resolves the best documentation source for any library/framework and returns docs to its CALLER (another agent or process), not to the user.

### When KIN activates
- Agent needs docs for a library already in the project
- Agent needs docs for a library/version NOT yet in the project
- Agent is unsure about an API and needs authoritative reference

### KIN routing (decision tree)
1. Read project-local routing in `.atl/docs-routing.yaml` first when it exists. That file is the canonical source for project doc-source choices.
2. Use `.atl/skill-registry.md`, project instruction files, and relevant skills only to discover sources or guidance named by routing or the current project context; they do not replace routing.
3. If routing or project guidance points to docs domains, manifests, or tool-use guidance, inspect manifest/capability signals before falling back.
4. Reuse `knowledge/strategies/{lib}` only as supporting experience when it still matches the current library/version context; never treat it as higher priority than routing.
5. Only after routing, discovery, and manifest/capability scanning are exhausted, run the linear fallback chain: Context7 -> official docs -> GitHub.

### Commands
- `/kin-search <query>` - Rare direct access. User asks KIN to find docs on a topic.

### Confidence scoring
Run `node ~/.config/opencode/skills/kin/kin-score.mjs <lib1> <lib2> ...` to evaluate whether internal knowledge is sufficient or external docs should be fetched.

## Resources

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Mastra .well-known skills discovery](https://mastra.ai/.well-known/skills/index.json)
