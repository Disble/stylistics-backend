/**
 * Registers the sample weather agent used by the demo weather workflow.
 */
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { scorers } from "../scorers/weather-scorer";
import { weatherTool } from "../tools/weather-tool";
import { WEATHER_AGENT_INSTRUCTIONS } from "./weather-agent.prompt";

/** Provides weather-aware activity suggestions by combining tool output and scoring. */
export const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  instructions: WEATHER_AGENT_INSTRUCTIONS,
  model: "google/gemini-2.5-pro",
  tools: { weatherTool },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    translation: {
      scorer: scorers.translationScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  memory: new Memory(),
});
