import { z } from "npm:zod@3.22.5";
import { resolve } from "jsr:@std/path@1/resolve";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { dirname } from "jsr:@std/path@1/dirname";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
  ClaspCloneArgsSchema,
  getRootDir,
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
  const validRootDir = getRootDir();

  const cmd = [
    "clasp",
    "clone",
    scriptId,
    "--rootDir",
    validRootDir,
  ];

  const result = await runCommand(cmd, dirname(validRootDir));
  return result;
}
