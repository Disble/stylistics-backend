/** Registers the agent responsible for updating DB-backed document style profiles. */
import { Agent } from "@mastra/core/agent";

import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { DOCUMENT_PROFILE_AGENT_INSTRUCTIONS } from "./document-profile-agent.prompt";

/** Generates updated markdown for one persisted document style profile. */
export const documentProfileAgent = new Agent({
  id: "document-profile-agent",
  name: "Document Profile Agent",
  instructions: DOCUMENT_PROFILE_AGENT_INSTRUCTIONS,
  model: modelPool["profile-agent"],
  memory,
});
