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
import * as tools from "./tools/mod.ts";
import { formatErrorMessage } from "./tools/error.ts";

export const TOOLS: Tool[] = [
    tools.CLASP_SETUP_TOOL,
    tools.CLASP_LOGOUT_TOOL,
    tools.CLASP_CREATE_TOOL,
    tools.CLASP_CLONE_TOOL,
    tools.CLASP_PULL_TOOL,
    tools.CLASP_PUSH_TOOL,
    tools.CLASP_DEPLOY_TOOL,
    tools.CLASP_LIST_TOOL,
];

const server = new Server(
    {
        name: "gas-clasp-mcp",
        version: "0.1.0",
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

        try {
            switch (name) {
                case "clasp_setup": {
                    const parsed = tools.ClaspSetupArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const output = await tools.claspSetup(parsed.data);
                    return {
                        content: [{
                            type: "text",
                            text: output,
                        }],
                    };
                }

                case "clasp_logout": {
                    const parsed = tools.ClaspLogoutArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspLogout(parsed.data);
                    return {
                        content: [{
                            type: "text",
                            text: result,
                        }],
                    };
                }

                case "clasp_create": {
                    const parsed = tools.ClaspCreateArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspCreate(parsed.data);
                    return { content: [{ type: "text", text: result }] };
                }

                case "clasp_clone": {
                    const parsed = tools.ClaspCloneArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspClone(parsed.data);
                    return { content: [{ type: "text", text: result }] };
                }

                case "clasp_pull": {
                    const parsed = tools.ClaspPullArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspPull(parsed.data);
                    return { content: [{ type: "text", text: result }] };
                }

                case "clasp_push": {
                    const parsed = tools.ClaspPushArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspPush(parsed.data);
                    return { content: [{ type: "text", text: result }] };
                }

                case "clasp_deploy": {
                    const parsed = tools.ClaspDeployArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspDeploy(parsed.data);
                    return {
                        content: [{
                            type: "text",
                            text: result,
                        }],
                    };
                }

                case "clasp_list": {
                    const parsed = tools.ClaspListArgsSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new Error(
                            `Invalid args: ${
                                JSON.stringify(parsed.error.format())
                            }`,
                        );
                    }
                    const result = await tools.claspList(parsed.data);
                    return { content: [{ type: "text", text: result }] };
                }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            console.error(`Error executing tool ${name}:`, error);
            return {
                content: [{
                    type: "text",
                    text: formatErrorMessage(error),
                }],
            };
        }
    },
);

if (import.meta.main) {
    try {
        await server.connect(new StdioServerTransport());
        console.error("GAS Clasp MCP server running on stdio (Deno)");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        Deno.exit(1);
    }
}
