/**
 * Registers the agent that interprets one author-feedback comment and updates
 * the persisted author profile when the feedback reveals a reusable pattern.
 */
import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { workspaceFeedback } from "../constants/workspaces";
import { FEEDBACK_AGENT_INSTRUCTIONS } from "./feedback-agent.prompt";

/** Processes author feedback using the inlined canonical protocol. */
export const feedbackAgent = new Agent({
  id: "feedback-agent",
  name: "Feedback Author Agent",
  instructions: FEEDBACK_AGENT_INSTRUCTIONS,
  model: modelPool["feedback-agent"],
  memory,
  workspace: workspaceFeedback,
});
