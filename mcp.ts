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
import { setRootDir } from "./tools/common.ts";

export const TOOLS: Tool[] = [
  tools.CLASP_SETUP_TOOL,
  tools.CLASP_CREATE_TOOL,
  tools.CLASP_CLONE_TOOL,
  tools.CLASP_PULL_TOOL,
  tools.CLASP_LIST_TOOL,
  tools.CLASP_PUSH_AND_DEPLOY_TOOL,
];

function parseArgs() {
  const args = Deno.args;
  let rootDir = Deno.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rootdir" && i + 1 < args.length) {
      rootDir = args[i + 1];
      break;
    }
  }

  return { rootDir };
}

async function main() {
  const { rootDir } = parseArgs();
  await setRootDir(rootDir);

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
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const output = await tools.claspSetup(parsed.data);
            return {
              content: [{ type: "text", text: output }],
            };
          }

          case "clasp_create": {
            const parsed = tools.ClaspCreateArgsSchema.safeParse(args);
            if (!parsed.success) {
              throw new Error(
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const result = await tools.claspCreate(parsed.data);
            return { content: [{ type: "text", text: result }] };
          }

          case "clasp_clone": {
            const parsed = tools.ClaspCloneArgsSchema.safeParse(args);
            if (!parsed.success) {
              throw new Error(
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const result = await tools.claspClone(parsed.data);
            return { content: [{ type: "text", text: result }] };
          }

          case "clasp_pull": {
            const parsed = tools.ClaspPullArgsSchema.safeParse(args);
            if (!parsed.success) {
              throw new Error(
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const result = await tools.claspPull(parsed.data);
            return { content: [{ type: "text", text: result }] };
          }

          case "clasp_list": {
            const parsed = tools.ClaspListArgsSchema.safeParse(args);
            if (!parsed.success) {
              throw new Error(
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const result = await tools.claspList(parsed.data);
            return { content: [{ type: "text", text: result }] };
          }

          case "clasp_push_and_deploy": {
            const parsed = tools.ClaspPushAndDeployArgsSchema.safeParse(args);
            if (!parsed.success) {
              throw new Error(
                `Invalid args: ${JSON.stringify(parsed.error.format())}`,
              );
            }
            const result = await tools.claspPushAndDeploy(parsed.data);
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
}

main().catch(console.error);
