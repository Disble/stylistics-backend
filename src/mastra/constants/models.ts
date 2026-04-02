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
    {
      model: "lmstudio/qwopus3.5-9b-v3",
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
  "feedback-agent": "lmstudio/qwopus3.5-9b-v3",
} as const satisfies Record<string, AgentConfig["model"]>;
