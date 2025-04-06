import { z } from "npm:zod@3.22.5";
import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { ClaspCreateArgsSchema, runCommand, toToolSchema } from "./common.ts";

export { ClaspCreateArgsSchema };

export const CLASP_CREATE_TOOL: Tool = {
    name: "clasp_create",
    description: "Creates a new Google Apps Script project.",
    inputSchema: toToolSchema(ClaspCreateArgsSchema),
};

export async function claspCreate(args: z.infer<typeof ClaspCreateArgsSchema>) {
    const { title, rootDir, type } = args;
    const validRootDir = resolve(rootDir);
    await ensureDir(validRootDir);

    const cmd = ["clasp", "create", "--title", title];
    if (type) cmd.push("--type", type);

    const result = await runCommand(cmd, validRootDir);
    return result;
}
