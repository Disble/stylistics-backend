import { resolve } from "node:path";
import {
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
  Workspace,
} from "@mastra/core/workspace";

console.log(resolve(import.meta.dirname, "../../workspace"));

export const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: resolve(import.meta.dirname, "../../workspace"),
  }),
  sandbox: new LocalSandbox({
    workingDirectory: resolve(import.meta.dirname, "../../workspace"),
    isolation: "none",
  }),
  skills: ["skills"],
  lsp: false,
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { enabled: false },
    [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: { enabled: false },
    [WORKSPACE_TOOLS.LSP.LSP_INSPECT]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: false },
  },
});
