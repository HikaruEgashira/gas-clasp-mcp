import { z } from "npm:zod@3.22.5";
import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
    checkClaspInstalled,
    ClaspSetupArgsSchema,
    installClasp,
    runCommand,
    toToolSchema,
} from "./common.ts";

export { ClaspSetupArgsSchema };

export const CLASP_SETUP_TOOL: Tool = {
    name: "clasp_setup",
    description:
        "Sets up the clasp environment. Checks installation, optionally installs clasp, and optionally logs into Google.",
    inputSchema: toToolSchema(ClaspSetupArgsSchema),
};

export async function claspSetup(args: z.infer<typeof ClaspSetupArgsSchema>) {
    const {
        rootDir,
        autoInstall,
        autoLogin,
        global: globalInstall,
        listProjects,
    } = args;
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
        output += `Attempting Google login (follow browser prompts)...\n`;
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

    return output + "Setup finished.";
}
