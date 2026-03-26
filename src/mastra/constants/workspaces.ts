import { resolve } from "node:path";
import {
  LocalFilesystem,
  LocalSandbox,
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
});
