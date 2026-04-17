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
    model: "lmstudio/qwen3.6-35b-a3b@q2_k_xl",
  },
] as const satisfies AgentConfig["model"];

export const modelPool = {
  "editorial-agent": "google/gemini-3.1-flash-lite-preview",
  "stylistic-agent": stylisticReasoningModels,
  "stylistic-consultation-agent": stylisticReasoningModels,
  "profile-agent": [
    {
      model: "google/gemini-3.1-flash-lite-preview",
    },
    {
      model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    },
    {
      model: "lmstudio/qwen3.6-35b-a3b@q2_k_xl",
    },
  ],
  "feedback-agent": "lmstudio/qwen3.6-35b-a3b@q2_k_xl",
} as const satisfies Record<string, AgentConfig["model"]>;
