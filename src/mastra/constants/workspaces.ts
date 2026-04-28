import { resolve } from "node:path";
import {
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
  Workspace,
} from "@mastra/core/workspace";

/**
 * Base filesystem configuration for workspace operations.
 * Points to the workspace directory relative to the current module.
 */
const fileSystemBase = new LocalFilesystem({
  basePath: resolve(import.meta.dirname, "../../workspace"),
});

/**
 * Base sandbox configuration for executing commands.
 * Configured with no isolation for unrestricted command execution.
 */
const sandboxBase = new LocalSandbox({
  workingDirectory: resolve(import.meta.dirname, "../../workspace"),
  isolation: "none",
});

/**
 * Skills are disabled in the base workspace configuration, but
 * when you need config the real skills, you need to use: ["skills"]
 */
const skillsBase = () => [];

/**
 * LSP (Language Server Protocol) is disabled in base configuration.
 */
const lspBase = false;

/**
 * Base tools configuration with most filesystem and sandbox operations disabled.
 * Provides secure defaults by restricting potentially dangerous operations.
 */
const toolsBase = {
  [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { enabled: false },
  [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: false },
  [WORKSPACE_TOOLS.LSP.LSP_INSPECT]: { enabled: false },
  [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: { enabled: false },
  [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { enabled: false },
  [WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]: { enabled: false },
  [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: false },
};

/**
 * Profile workspace configuration.
 * Uses base settings with restricted access to filesystem and sandbox tools.
 */
export const workspaceProfile = new Workspace({
  filesystem: fileSystemBase,
  sandbox: sandboxBase,
  skills: skillsBase,
  lsp: lspBase,
  tools: toolsBase,
});

/**
 * Feedback workspace tools configuration.
 * Extends base tools with write file operations disabled.
 */
const toolsFeedback = {
  ...toolsBase,
  [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: false },
};

/**
 * Feedback workspace configuration.
 * Similar to profile workspace but with additional write file restrictions.
 */
export const workspaceFeedback = new Workspace({
  filesystem: fileSystemBase,
  sandbox: sandboxBase,
  skills: skillsBase,
  lsp: lspBase,
  tools: toolsFeedback,
});
