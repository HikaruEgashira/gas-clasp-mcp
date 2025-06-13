import { z } from "npm:zod@3.22.5";
import { resolve } from "jsr:@std/path@1/resolve";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
  ClaspCreateArgsSchema,
  getWorkspaceDir,
  runCommand,
  toToolSchema,
} from "./common.ts";

export { ClaspCreateArgsSchema };

export const CLASP_CREATE_TOOL: Tool = {
  name: "clasp_create",
  description: "Creates a new Google Apps Script project.",
  inputSchema: toToolSchema(ClaspCreateArgsSchema),
};

export async function claspCreate(args: z.infer<typeof ClaspCreateArgsSchema>) {
  const { title, type } = args;
  const validWorkspaceDir = resolve(getWorkspaceDir());
  await ensureDir(validWorkspaceDir);

  const cmd = ["clasp", "create", "--title", title];
  if (type) cmd.push("--type", type);

  const result = await runCommand(cmd, validWorkspaceDir);
  return result;
}
