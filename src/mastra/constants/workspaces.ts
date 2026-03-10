import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { resolve } from 'node:path';

console.log(resolve(import.meta.dirname, '../../workspace'));

export const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: resolve(import.meta.dirname, '../../workspace'),
  }),
  sandbox: new LocalSandbox({
    workingDirectory: resolve(import.meta.dirname, '../../workspace'),
  }),
  skills: ['/skills'],
})
