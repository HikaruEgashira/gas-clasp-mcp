#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env --allow-net

import { Server } from "npm:@modelcontextprotocol/sdk@1.5.0/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import type {
    CallToolRequest,
    Tool,
} from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.22.5";
import z from "npm:zod@3.22.5";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts";
import { dirname } from "https://deno.land/std@0.224.0/path/dirname.ts";

// deno-lint-ignore no-explicit-any
function toToolSchema(schema: z.ZodType<any, any>): any {
    return zodToJsonSchema(schema);
}

const RootDirSchema = z.object({
    rootDir: z.string().describe(
        "Project root directory containing .clasp.json",
    ),
});

const ClaspSetupArgsSchema = RootDirSchema.extend({
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

const ClaspLogoutArgsSchema = RootDirSchema;

const ClaspCreateArgsSchema = RootDirSchema.extend({
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

const ClaspCloneArgsSchema = RootDirSchema.extend({
    scriptId: z.string().describe("Script ID to clone"),
});

const ClaspPullArgsSchema = RootDirSchema.extend({
    scriptId: z.string().optional().describe(
        "Script ID to pull from (optional, uses .clasp.json if omitted)",
    ),
});

const ClaspPushArgsSchema = RootDirSchema.extend({
    force: z.boolean().optional().describe("Ignore confirmation prompts"),
    watch: z.boolean().optional().describe(
        "Watch for file changes and push automatically",
    ),
});

const ClaspDeployArgsSchema = RootDirSchema.extend({
    env: z.enum(["development", "staging", "production"]).describe(
        "Deployment environment",
    ),
    version: z.string().optional().describe("Deployment version number"),
    description: z.string().optional().describe("Deployment description"),
});

const ClaspListArgsSchema = RootDirSchema;

const TOOLS: Tool[] = [
    {
        name: "clasp_setup",
        description:
            "Sets up the clasp environment. Checks installation, optionally installs clasp, and optionally logs into Google.",
        inputSchema: toToolSchema(ClaspSetupArgsSchema),
    },
    {
        name: "clasp_logout",
        description:
            "Logs out from the currently logged-in Google account via clasp.",
        inputSchema: toToolSchema(ClaspLogoutArgsSchema),
    },
    {
        name: "clasp_create",
        description: "Creates a new Google Apps Script project.",
        inputSchema: toToolSchema(ClaspCreateArgsSchema),
    },
    {
        name: "clasp_clone",
        description: "Clones an existing Google Apps Script project.",
        inputSchema: toToolSchema(ClaspCloneArgsSchema),
    },
    {
        name: "clasp_pull",
        description:
            "Pulls changes from the remote Google Apps Script project to the local directory.",
        inputSchema: toToolSchema(ClaspPullArgsSchema),
    },
    {
        name: "clasp_push",
        description:
            "Pushes local changes to the remote Google Apps Script project.",
        inputSchema: toToolSchema(ClaspPushArgsSchema),
    },
    {
        name: "clasp_deploy",
        description:
            "Deploys the Google Apps Script project. Production deploys require the main branch with no uncommitted changes.",
        inputSchema: toToolSchema(ClaspDeployArgsSchema),
    },
    {
        name: "clasp_list",
        description: "Lists Google Apps Script projects.",
        inputSchema: toToolSchema(ClaspListArgsSchema),
    },
];

async function runCommand(cmd: string[], cwd: string): Promise<string> {
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

async function validatePath(path: string): Promise<string> {
    const resolvedPath = resolve(path);
    const fileInfo = await Deno.stat(resolvedPath);
    if (!fileInfo.isDirectory) {
        throw new Error(`Path is not a directory: ${resolvedPath}`);
    }
    return resolvedPath;
}

async function checkClaspInstalled(): Promise<boolean> {
    try {
        await runCommand(["clasp", "--version"], ".");
        return true;
    } catch {
        return false;
    }
}

async function installClasp(globalInstall: boolean): Promise<void> {
    const cmd = ["npm", "install"];
    if (globalInstall) {
        cmd.push("-g");
    }
    cmd.push("@google/clasp");
    await runCommand(cmd, ".");
}

async function checkGitStatus(
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

const server = new Server(
    {
        name: "gas-clasp-mcp",
        version: "0.2.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    },
);

server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [],
}));

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));

server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
        const name = request.params.name;
        const args = request.params.arguments ?? {};

        switch (name) {
            case "clasp_setup": {
                const parsed = ClaspSetupArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const {
                    rootDir,
                    autoInstall,
                    autoLogin,
                    global: globalInstall,
                    listProjects,
                } = parsed.data;
                const validRootDir = resolve(rootDir);
                await ensureDir(validRootDir);

                let output = `Setup started.\n`;
                let installed = await checkClaspInstalled();
                output += `Clasp installed: ${installed}\n`;

                if (!installed && autoInstall) {
                    output += `Attempting to install clasp...\n`;
                    try {
                        await installClasp(!!globalInstall);
                        installed = true;
                        output += `Clasp installed successfully.\n`;
                        // deno-lint-ignore no-explicit-any
                    } catch (e: any) {
                        output += `Clasp installation failed: ${e.message}\n`;
                        throw new Error(output);
                    }
                } else if (!installed) {
                    throw new Error(
                        "Clasp is not installed. Run again with autoInstall: true or install manually.",
                    );
                }

                if (autoLogin) {
                    output +=
                        `Attempting Google login (follow browser prompts)...\n`;
                    try {
                        await runCommand(
                            ["clasp", "login", "--no-localhost"],
                            validRootDir,
                        );
                        output +=
                            `Login command executed. Check terminal/browser if interaction needed.\n`;
                        // deno-lint-ignore no-explicit-any
                    } catch (e: any) {
                        output +=
                            `Login command failed: ${e.message}. Manual login might be required ('clasp login').\n`;
                    }
                }

                if (listProjects) {
                    output += `Listing projects...\n`;
                    try {
                        const projects = await runCommand(
                            ["clasp", "list"],
                            validRootDir,
                        );
                        output += projects;
                        // deno-lint-ignore no-explicit-any
                    } catch (e: any) {
                        output += `Failed to list projects: ${e.message}\n`;
                    }
                }

                return {
                    content: [{
                        type: "text",
                        text: output + "Setup finished.",
                    }],
                };
            }

            case "clasp_logout": {
                const parsed = ClaspLogoutArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const validRootDir = await validatePath(
                    parsed.data.rootDir,
                );
                const result = await runCommand(
                    ["clasp", "logout"],
                    validRootDir,
                );
                return {
                    content: [{
                        type: "text",
                        text: result || "Logged out successfully.",
                    }],
                };
            }

            case "clasp_create": {
                const parsed = ClaspCreateArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const { title, rootDir, type } = parsed.data;
                const validRootDir = resolve(rootDir);
                await ensureDir(validRootDir);

                const cmd = ["clasp", "create", "--title", title];
                if (type) cmd.push("--type", type);

                const result = await runCommand(cmd, validRootDir);
                return { content: [{ type: "text", text: result }] };
            }

            case "clasp_clone": {
                const parsed = ClaspCloneArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const { scriptId, rootDir } = parsed.data;
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
                return { content: [{ type: "text", text: result }] };
            }

            case "clasp_pull": {
                const parsed = ClaspPullArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const validRootDir = await validatePath(
                    parsed.data.rootDir,
                );
                const cmd = ["clasp", "pull"];

                const result = await runCommand(cmd, validRootDir);
                return { content: [{ type: "text", text: result }] };
            }

            case "clasp_push": {
                const parsed = ClaspPushArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const validRootDir = await validatePath(
                    parsed.data.rootDir,
                );
                const cmd = ["clasp", "push"];
                if (parsed.data.force) cmd.push("--force");
                if (parsed.data.watch) cmd.push("--watch");
                const result = await runCommand(cmd, validRootDir);
                return { content: [{ type: "text", text: result }] };
            }

            case "clasp_deploy": {
                const parsed = ClaspDeployArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }
                const { rootDir, env, version, description } = parsed.data;
                const validRootDir = await validatePath(rootDir);

                if (env === "production") {
                    const { branch, isClean } = await checkGitStatus(
                        validRootDir,
                    );
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
                return {
                    content: [{
                        type: "text",
                        text: `Deployment (${env}) initiated:\n${result}`,
                    }],
                };
            }

            case "clasp_list": {
                const parsed = ClaspListArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid args: ${parsed.error}`);
                }

                const validRootDir = resolve(parsed.data.rootDir);
                await ensureDir(validRootDir);
                const result = await runCommand(
                    ["clasp", "list"],
                    validRootDir,
                );
                return { content: [{ type: "text", text: result }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    },
);

if (import.meta.main) {
    await server.connect(new StdioServerTransport());
    console.error("GAS Clasp MCP server running on stdio (Deno)");
}
