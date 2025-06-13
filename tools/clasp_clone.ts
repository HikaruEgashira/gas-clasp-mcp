import { z } from "npm:zod@3.22.5";
import { dirname } from "jsr:@std/path@1/dirname";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
  ClaspCloneArgsSchema,
  getWorkspaceDir,
  runCommand,
  toToolSchema,
} from "./common.ts";

export { ClaspCloneArgsSchema };

export const CLASP_CLONE_TOOL: Tool = {
  name: "clasp_clone",
  description: "Clones an existing Google Apps Script project.",
  inputSchema: toToolSchema(ClaspCloneArgsSchema),
};

export async function claspClone(args: z.infer<typeof ClaspCloneArgsSchema>) {
  const { scriptId } = args;
  const validWorkspaceDir = getWorkspaceDir();

  const cmd = [
    "clasp",
    "clone",
    scriptId,
    "--rootDir",
    validWorkspaceDir,
  ];

  const result = await runCommand(cmd, dirname(validWorkspaceDir));
  return result;
}
