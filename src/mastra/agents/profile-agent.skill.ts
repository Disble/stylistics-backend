/** Canonical protocol for the Profile Agent — source of truth: docs/protocols/profile-agent-protocol.md */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

export const PROFILE_AGENT_SKILL = readFileSync(
  join(dir, "../../../docs/protocols/profile-agent-protocol.md"),
  "utf-8",
);
