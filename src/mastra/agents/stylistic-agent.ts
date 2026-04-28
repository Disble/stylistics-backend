/**
 * Registers the main stylistic-correction agent used by the stylistic workflow.
 */
import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { STYLISTIC_AGENT_INSTRUCTIONS } from "./stylistic-agent.prompt";

/** Produces structured orthotypographic and stylistic correction suggestions. */
export const stylisticAgent = new Agent({
  id: "stylistic-agent",
  name: "Stylistic Agent",
  instructions: STYLISTIC_AGENT_INSTRUCTIONS,
  model: modelPool["stylistic-agent"],
  memory,
});
