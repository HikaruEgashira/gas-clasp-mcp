import { z } from "npm:zod@3.22.5";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
    ClaspPullArgsSchema,
    runCommand,
    toToolSchema,
    validatePath,
} from "./common.ts";

export { ClaspPullArgsSchema };

export const CLASP_PULL_TOOL: Tool = {
    name: "clasp_pull",
    description:
        "Pulls changes from the remote Google Apps Script project to the local directory.",
    inputSchema: toToolSchema(ClaspPullArgsSchema),
};

export async function claspPull(args: z.infer<typeof ClaspPullArgsSchema>) {
    const validRootDir = await validatePath(args.rootDir);
    const cmd = ["clasp", "pull"];

    const result = await runCommand(cmd, validRootDir);
    return result;
}
