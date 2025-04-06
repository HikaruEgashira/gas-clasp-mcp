import { z } from "npm:zod@3.22.5";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
    checkGitStatus,
    ClaspDeployArgsSchema,
    runCommand,
    toToolSchema,
    validatePath,
} from "./common.ts";

export { ClaspDeployArgsSchema };

export const CLASP_DEPLOY_TOOL: Tool = {
    name: "clasp_deploy",
    description:
        "Deploys the Google Apps Script project. Production deploys require the main branch with no uncommitted changes.",
    inputSchema: toToolSchema(ClaspDeployArgsSchema),
};

export async function claspDeploy(args: z.infer<typeof ClaspDeployArgsSchema>) {
    const { rootDir, env, version, description } = args;
    const validRootDir = await validatePath(rootDir);

    if (env === "production") {
        const { branch, isClean } = await checkGitStatus(validRootDir);
        if (branch !== "main" || !isClean) {
            throw new Error(
                "Production deploys require being on the 'main' branch with no uncommitted changes.",
            );
        }
    }

    const cmd = ["clasp", "deploy"];
    if (version) cmd.push("--versionNumber", version);
    if (description) cmd.push("--description", description);

    const result = await runCommand(cmd, validRootDir);
    return `Deployment (${env}) initiated:\n${result}`;
}
