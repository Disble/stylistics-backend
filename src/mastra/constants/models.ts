import type { AgentConfig } from "@mastra/core/agent";

const stylisticReasoningModels = [
  {
    model: "google/gemini-3.1-pro-preview",
  },
  {
    model: "google/gemini-3.1-flash-lite",
  },
] as const satisfies AgentConfig["model"];

export const modelPool = {
  "editorial-agent": "google/gemini-3.1-flash-lite-preview",
  "stylistic-agent": stylisticReasoningModels,
  "stylistic-consultation-agent": stylisticReasoningModels,
  "profile-agent": [
    {
      model: "google/gemini-3.1-flash-lite",
    },
    {
      model: "opencode-go/deepseek-v4-flash",
    },
    // {
    //   model: "lmstudio/qwen3.6-35b-a3b@q2_k_xl",
    // },
  ],
  "feedback-agent": "lmstudio/qwen3.6-35b-a3b@q2_k_xl",
} as const satisfies Record<string, AgentConfig["model"]>;

/**
 * Google model thinking levels for enhanced reasoning.
 * Controls the depth of reasoning in gemini models.
 */
export const GOOGLE_MODEL_THINKING_LEVELS = {
  MINIMAL: "minimal",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;
