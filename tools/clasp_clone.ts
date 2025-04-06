import { z } from "npm:zod@3.22.5";
import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.224.0/path/dirname.ts";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { ClaspCloneArgsSchema, runCommand, toToolSchema } from "./common.ts";

export { ClaspCloneArgsSchema };

export const CLASP_CLONE_TOOL: Tool = {
    name: "clasp_clone",
    description: "Clones an existing Google Apps Script project.",
    inputSchema: toToolSchema(ClaspCloneArgsSchema),
};

export async function claspClone(args: z.infer<typeof ClaspCloneArgsSchema>) {
    const { scriptId, rootDir } = args;
    const validRootDir = resolve(rootDir);
    await ensureDir(dirname(validRootDir));

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
