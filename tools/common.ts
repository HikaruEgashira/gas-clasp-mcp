import { z } from "npm:zod@3.22.5";
import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.22.5";

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
        throw new Error(
            `Command failed with code ${code}: ${errorText || outputText}`,
        );
    }
    return outputText;
}

export async function validatePath(path: string): Promise<string> {
    const resolvedPath = resolve(path);
    const fileInfo = await Deno.stat(resolvedPath);
    if (!fileInfo.isDirectory) {
        throw new Error(`Path is not a directory: ${resolvedPath}`);
    }
    return resolvedPath;
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
        throw new Error(
            "Failed to check git status. Is this a git repository?",
        );
    }
}

// Base Schema
export const RootDirSchema = z.object({
    rootDir: z.string().describe(
        "Project root directory containing .clasp.json",
    ),
});

// Tool Schema definitions
export const ClaspSetupArgsSchema = RootDirSchema.extend({
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

export const ClaspLogoutArgsSchema = RootDirSchema;

export const ClaspCreateArgsSchema = RootDirSchema.extend({
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

export const ClaspCloneArgsSchema = RootDirSchema.extend({
    scriptId: z.string().describe("Script ID to clone"),
});

export const ClaspPullArgsSchema = RootDirSchema.extend({
    scriptId: z.string().optional().describe(
        "Script ID to pull from (optional, uses .clasp.json if omitted)",
    ),
});

export const ClaspPushArgsSchema = RootDirSchema.extend({
    force: z.boolean().optional().describe("Ignore confirmation prompts"),
    watch: z.boolean().optional().describe(
        "Watch for file changes and push automatically",
    ),
});

export const ClaspDeployArgsSchema = RootDirSchema.extend({
    env: z.enum(["development", "staging", "production"]).describe(
        "Deployment environment",
    ),
    version: z.string().optional().describe("Deployment version number"),
    description: z.string().optional().describe("Deployment description"),
});

export const ClaspListArgsSchema = RootDirSchema;

// deno-lint-ignore no-explicit-any
export function toToolSchema(schema: z.ZodType<any, any>): any {
    return zodToJsonSchema(schema);
}
