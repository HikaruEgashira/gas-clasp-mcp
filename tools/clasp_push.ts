import { z } from "npm:zod@3.22.5";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
    ClaspPushArgsSchema,
    runCommand,
    toToolSchema,
    validatePath,
} from "./common.ts";

export { ClaspPushArgsSchema };

export const CLASP_PUSH_TOOL: Tool = {
    name: "clasp_push",
    description:
        "Pushes local changes to the remote Google Apps Script project.",
    inputSchema: toToolSchema(ClaspPushArgsSchema),
};

export async function claspPush(args: z.infer<typeof ClaspPushArgsSchema>) {
    const validRootDir = await validatePath(args.rootDir);
    const cmd = ["clasp", "push"];
    if (args.force) cmd.push("--force");
    if (args.watch) cmd.push("--watch");

    const result = await runCommand(cmd, validRootDir);
    return result;
}
