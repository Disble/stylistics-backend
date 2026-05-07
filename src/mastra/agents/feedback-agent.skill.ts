/** Canonical protocol for the Feedback Agent — source of truth: docs/protocols/feedback-agent-protocol.md */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

export const FEEDBACK_AGENT_SKILL = readFileSync(
  join(dir, "../../../docs/protocols/feedback-agent-protocol.md"),
  "utf-8",
);
