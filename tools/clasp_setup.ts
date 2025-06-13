import { z } from "npm:zod@3.22.5";
import { resolve } from "jsr:@std/path@1/resolve";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
  checkClaspInstalled,
  ClaspSetupArgsSchema,
  getWorkspaceDir,
  installClasp,
  runCommand,
  toToolSchema,
} from "./common.ts";
import {
  ClaspInstallationError,
  CommandExecutionError,
  formatErrorMessage,
} from "./error.ts";

export { ClaspSetupArgsSchema };

export const CLASP_SETUP_TOOL: Tool = {
  name: "clasp_setup",
  description:
    "Sets up the clasp environment. Checks installation, optionally installs clasp, and optionally logs into Google. In headless or Docker environments, browser login may not work; instead, perform 'clasp login' on host and mount the resulting .clasprc.json into the container.",
  inputSchema: toToolSchema(ClaspSetupArgsSchema),
};

export async function claspSetup(args: z.infer<typeof ClaspSetupArgsSchema>) {
  const {
    autoInstall,
    autoLogin,
    global: globalInstall,
    listProjects,
  } = args;
  const validWorkspaceDir = resolve(getWorkspaceDir());
  await ensureDir(validWorkspaceDir);

  let output = `Setup started.\n`;
  let installed = await checkClaspInstalled();
  output += `Clasp installed: ${installed}\n`;

  if (!installed && autoInstall) {
    output += `Attempting to install clasp...\n`;
    try {
      await installClasp(!!globalInstall);
      installed = true;
      output += `Clasp installed successfully.\n`;
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      throw new ClaspInstallationError(errorMessage);
    }
  } else if (!installed) {
    throw new ClaspInstallationError(
      "Clasp is not installed. Run again with autoInstall: true or install manually.",
    );
  }

  if (autoLogin) {
    output += `Attempting Google login (follow browser prompts)...\n`;
    try {
      await runCommand(
        ["clasp", "login"],
        validWorkspaceDir,
      );
      output +=
        `Login command executed. Check terminal/browser if interaction needed.\n`;
    } catch (error) {
      if (error instanceof CommandExecutionError) {
        output +=
          `Login command failed: ${error.message}. Manual login might be required ('clasp login').\n`;
      } else {
        output += `Login failed: ${
          formatErrorMessage(error)
        }. Manual login might be required ('clasp login').\n`;
      }
    }
  }

  if (listProjects) {
    output += `Listing projects...\n`;
    try {
      const projects = await runCommand(
        ["clasp", "list"],
        validWorkspaceDir,
      );
      output += projects;
    } catch (error) {
      if (error instanceof CommandExecutionError) {
        output += `Failed to list projects: ${error.message}\n`;
      } else {
        output += `Failed to list projects: ${formatErrorMessage(error)}\n`;
      }
    }
  }

  return output + "Setup finished.";
}
