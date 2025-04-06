import { z } from "npm:zod@3.22.5";
import { Tool } from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import {
    ClaspLogoutArgsSchema,
    runCommand,
    toToolSchema,
    validatePath,
} from "./common.ts";

export { ClaspLogoutArgsSchema };

export const CLASP_LOGOUT_TOOL: Tool = {
    name: "clasp_logout",
    description:
        "Logs out from the currently logged-in Google account via clasp.",
    inputSchema: toToolSchema(ClaspLogoutArgsSchema),
};

export async function claspLogout(args: z.infer<typeof ClaspLogoutArgsSchema>) {
    const validRootDir = await validatePath(args.rootDir);
    const result = await runCommand(
        ["clasp", "logout"],
        validRootDir,
    );
    return result || "Logged out successfully.";
}
