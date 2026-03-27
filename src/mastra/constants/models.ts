import type { AgentConfig } from "@mastra/core/agent";

export const modelPool = {
  "editorial-agent": "google/gemini-3.1-flash-lite-preview",
  "stylistic-agent": [
    {
      model: "google/gemini-3.1-pro-preview",
    },
    {
      model: "google/gemini-3.1-flash-lite-preview",
    },
    {
      model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    },
  ],
  "profile-agent": [
    {
      model: "google/gemini-3.1-flash-lite-preview",
    },
    {
      model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    },
  ],
  "feedback-agent":
    "lmstudio/qwen3.5-9b-claude-4.6-opus-reasoning-distilled-v2",
} as const satisfies Record<string, AgentConfig["model"]>;
