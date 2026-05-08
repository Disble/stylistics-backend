/** Registers the agent that applies explicit feedback to persisted document profiles. */
import { Agent } from "@mastra/core/agent";

import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { DOCUMENT_FEEDBACK_AGENT_INSTRUCTIONS } from "./document-feedback-agent.prompt";

/** Interprets one explicit feedback comment for a persisted document profile. */
export const documentFeedbackAgent = new Agent({
  id: "document-feedback-agent",
  name: "Document Feedback Agent",
  instructions: DOCUMENT_FEEDBACK_AGENT_INSTRUCTIONS,
  model: modelPool["feedback-agent"],
  memory,
});
