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
        "Pulls changes from the remote Google Apps Script project to the local directory. Automatically switches .clasp.json based on the specified environment (env).",
    inputSchema: toToolSchema(ClaspPullArgsSchema),
};

export async function claspPull(args: z.infer<typeof ClaspPullArgsSchema>) {
    if (!args.env) {
        throw new Error(
            "env is required and must be either 'production' or 'development'",
        );
    }

    const envConfigPath = `${args.rootDir}/.clasp.${args.env}.json`;
    const targetConfigPath = `${args.rootDir}/.clasp.json`;

    try {
        await Deno.stat(envConfigPath);
    } catch {
        throw new Error(`Environment config file not found: ${envConfigPath}`);
    }

    const envConfig = await Deno.readTextFile(envConfigPath);
    await Deno.writeTextFile(targetConfigPath, envConfig);

    const validRootDir = await validatePath(args.rootDir);
    const cmd = ["clasp", "pull"];

    const result = await runCommand(cmd, validRootDir);
    return result;
}
