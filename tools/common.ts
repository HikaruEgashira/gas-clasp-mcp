import { z } from "npm:zod@3.22.5";
import { resolve } from "jsr:@std/path@1/resolve";
import { dirname } from "jsr:@std/path@1/dirname";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.22.5";
import { CommandExecutionError, PathValidationError } from "./error.ts";

export async function runCommand(cmd: string[], cwd: string): Promise<string> {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd: cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  const outputText = new TextDecoder().decode(stdout);
  const errorText = new TextDecoder().decode(stderr);

  if (code !== 0) {
    throw new CommandExecutionError(
      code,
      errorText,
      outputText,
      cmd.join(" "),
    );
  }
  return outputText;
}

export async function validatePath(path: string): Promise<string> {
  const resolvedPath = resolve(path);
  try {
    const fileInfo = await Deno.stat(resolvedPath);
    if (!fileInfo.isDirectory) {
      throw new PathValidationError(
        resolvedPath,
        "Path is not a directory",
      );
    }
    return resolvedPath;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new PathValidationError(resolvedPath, "Directory not found");
    }
    if (error instanceof PathValidationError) {
      throw error;
    }
    throw new PathValidationError(
      resolvedPath,
      `Unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function checkClaspInstalled(): Promise<boolean> {
  try {
    await runCommand(["clasp", "--version"], ".");
    return true;
  } catch {
    return false;
  }
}

export async function installClasp(globalInstall: boolean): Promise<void> {
  const cmd = ["npm", "install"];
  if (globalInstall) {
    cmd.push("-g");
  }
  cmd.push("@google/clasp");
  await runCommand(cmd, ".");
}

export async function checkGitStatus(
  rootDir: string,
): Promise<{ branch: string; isClean: boolean }> {
  try {
    const branch = (await runCommand(
      ["git", "rev-parse", "--abbrev-ref", "HEAD"],
      rootDir,
    )).trim();
    const status = await runCommand(
      ["git", "status", "--porcelain"],
      rootDir,
    );
    const isClean = status.trim() === "";
    return { branch, isClean };
  } catch (error) {
    console.error("Git check failed:", error);
    if (error instanceof CommandExecutionError) {
      throw error;
    }
    throw new Error(
      "Failed to check git status. Is this a git repository?",
    );
  }
}

let globalRootDir: string = Deno.cwd();

export function getRootDir(): string {
  return globalRootDir;
}

export async function setRootDir(rootDir: string): Promise<void> {
  const absolutePath = resolve(rootDir);

  try {
    const stat = await Deno.stat(dirname(absolutePath));
    if (!stat.isDirectory) {
      throw new Error(`Parent directory of ${absolutePath} is not a directory`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await ensureDir(dirname(absolutePath));
    } else {
      throw error;
    }
  }

  globalRootDir = absolutePath;
}

// Tool Schema definitions
export const ClaspSetupArgsSchema = z.object({
  autoInstall: z.boolean().optional().describe(
    "Automatically install clasp if not found",
  ),
  autoLogin: z.boolean().optional().describe(
    "Automatically initiate Google account login",
  ),
  global: z.boolean().optional().describe(
    "Install clasp globally (requires sudo/admin)",
  ),
  listProjects: z.boolean().optional().describe("List projects after setup"),
});

export const ClaspLogoutArgsSchema = z.object({});

export const ClaspCreateArgsSchema = z.object({
  title: z.string().describe("Title of the new Google Apps Script project"),
  type: z
    .enum([
      "standalone",
      "docs",
      "sheets",
      "slides",
      "forms",
      "webapp",
      "api",
    ])
    .optional()
    .describe("Type of the project"),
});

export const ClaspCloneArgsSchema = z.object({
  scriptId: z.string().describe("Script ID to clone"),
});

export const ClaspPullArgsSchema = z.object({
  env: z.enum(["development", "production"]).describe(
    "Target environment for pull",
  ),
  scriptId: z.string().optional().describe(
    "Script ID to pull from (optional, uses .clasp.json if omitted)",
  ),
});

export const ClaspPushArgsSchema = z.object({
  force: z.boolean().optional().describe("Ignore confirmation prompts"),
  watch: z.boolean().optional().describe(
    "Watch for file changes and push automatically",
  ),
});

export const ClaspDeployArgsSchema = z.object({
  env: z.enum(["development", "staging", "production"]).describe(
    "Deployment environment",
  ),
  version: z.string().optional().describe("Deployment version number"),
  description: z.string().optional().describe("Deployment description"),
});

export const ClaspListArgsSchema = z.object({});

// deno-lint-ignore no-explicit-any
export function toToolSchema(schema: z.ZodType<any, any>): any {
  return zodToJsonSchema(schema);
}
