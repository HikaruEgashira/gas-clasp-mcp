import { z } from "npm:zod@3.22.5";
import { resolve } from "jsr:@std/path@1/resolve";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { ClaspListArgsSchema, runCommand, toToolSchema } from "./common.ts";

export { ClaspListArgsSchema };

export const CLASP_LIST_TOOL: Tool = {
    name: "clasp_list",
    description: "Lists Google Apps Script projects.",
    inputSchema: toToolSchema(ClaspListArgsSchema),
};

export async function claspList(args: z.infer<typeof ClaspListArgsSchema>) {
    const validRootDir = resolve(args.rootDir);
    await ensureDir(validRootDir);
    const result = await runCommand(
        ["clasp", "list"],
        validRootDir,
    );
    return result;
}
