/**
 * Registers the consultation agent that explains corrections and resolves
 * stylistic or normative questions with workspace-backed evidence.
 */
import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { workspaceProfile } from "../constants/workspaces";
import { STYLISTIC_CONSULTATION_AGENT_INSTRUCTIONS } from "./stylistic-consultation-agent.prompt";

/** Explains prior corrections and general style questions without re-correcting by default. */
export const stylisticConsultationAgent = new Agent({
  id: "stylistic-consultation-agent",
  name: "Stylistic Consultation Agent",
  instructions: STYLISTIC_CONSULTATION_AGENT_INSTRUCTIONS,
  model: modelPool["stylistic-consultation-agent"],
  memory,
  workspace: workspaceProfile,
});
