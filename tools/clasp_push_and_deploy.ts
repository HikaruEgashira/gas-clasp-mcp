import { z } from "npm:zod@3.22.5";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
  checkGitStatus,
  getWorkspaceDir,
  runCommand,
  toToolSchema,
  validatePath,
} from "./common.ts";

export const ClaspPushAndDeployArgsSchema = z.object({
  // Push Option
  force: z.boolean().optional().describe(
    "Ignore confirmation prompts for push",
  ),
  watch: z.boolean().optional().describe(
    "Watch for file changes and push automatically",
  ),

  // Deploy Option
  deploy: z.boolean().optional().describe("Deploy after pushing changes"),
  env: z.enum(["development", "production"]).describe(
    "Deployment environment",
  ),
  version: z.string().optional().describe("Deployment version number"),
  description: z.string().optional().describe("Deployment description"),
});

export const CLASP_PUSH_AND_DEPLOY_TOOL: Tool = {
  name: "clasp_push_and_deploy",
  description:
    "Pushes local changes to the remote Google Apps Script project and optionally deploys it. Automatically switches .clasp.json based on the specified environment (env).",
  inputSchema: toToolSchema(ClaspPushAndDeployArgsSchema),
};

export async function claspPushAndDeploy(
  args: z.infer<typeof ClaspPushAndDeployArgsSchema>,
) {
  if (!args.env) {
    throw new Error(
      "env is required and must be either 'production' or 'development'",
    );
  }

  const workspaceDir = getWorkspaceDir();
  const envConfigPath = `${workspaceDir}/.clasp.${args.env}.json`;
  const targetConfigPath = `${workspaceDir}/.clasp.json`;

  try {
    await Deno.stat(envConfigPath);
  } catch {
    throw new Error(`Environment config file not found: ${envConfigPath}`);
  }

  const envConfig = await Deno.readTextFile(envConfigPath);
  await Deno.writeTextFile(targetConfigPath, envConfig);

  const validWorkspaceDir = await validatePath(workspaceDir);

  const pushCmd = ["clasp", "push"];
  if (args.force) pushCmd.push("--force");
  if (args.watch) pushCmd.push("--watch");

  const pushResult = await runCommand(pushCmd, validWorkspaceDir);

  if (!args.deploy) {
    return pushResult;
  }

  if (!args.env) {
    throw new Error(
      "Deployment environment (env) must be specified when deploy=true",
    );
  }

  // Check Git status for production environment
  if (args.env === "production") {
    const { branch, isClean } = await checkGitStatus(validWorkspaceDir);
    if (branch !== "main" || !isClean) {
      throw new Error(
        "Production deploys require being on the 'main' branch with no uncommitted changes.",
      );
    }
  }

  const deployCmd = ["clasp", "deploy"];
  if (args.version) deployCmd.push("--versionNumber", args.version);
  if (args.description) deployCmd.push("--description", args.description);

  const deployResult = await runCommand(deployCmd, validWorkspaceDir);

  return `Push completed:\n${pushResult}\n\nDeployment (${args.env}) initiated:\n${deployResult}`;
}
