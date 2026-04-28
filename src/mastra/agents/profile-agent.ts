/**
 * Registers the agent responsible for maintaining author profile files from
 * structured correction-session evidence.
 */
import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";
import { workspaceProfile } from "../constants/workspaces";
import { PROFILE_AGENT_INSTRUCTIONS } from "./profile-agent.prompt";

/** Updates persisted author profiles from correction suggestions and clean patterns. */
export const profileAgent = new Agent({
  id: "profile-agent",
  name: "Profile Agent",
  instructions: PROFILE_AGENT_INSTRUCTIONS,
  model: modelPool["profile-agent"],
  memory,
  workspace: workspaceProfile,
});
