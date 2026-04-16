import type { AgentConfig } from "@mastra/core/agent";

const stylisticReasoningModels = [
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
    model: "lmstudio/qwen3.5-9b-claude-4.6-opus-reasoning-distilled-v2",
  },
] as const satisfies AgentConfig["model"];

export const modelPool = {
  "editorial-agent": "google/gemini-3.1-flash-lite-preview",
  "stylistic-agent": stylisticReasoningModels,
  "stylistic-consultation-agent": stylisticReasoningModels,
  "stylistic-agent-output": "lmstudio/qwopus3.5-9b-v3", // NOTE: se usa para el output de correctText
  "profile-agent": [
    {
      model: "google/gemini-3.1-flash-lite-preview",
    },
    {
      model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    },
    {
      model: "lmstudio/qwen3.5-9b-claude-4.6-opus-reasoning-distilled-v2",
    },
  ],
  "feedback-agent":
    "lmstudio/qwen3.5-9b-claude-4.6-opus-reasoning-distilled-v2",
} as const satisfies Record<string, AgentConfig["model"]>;
