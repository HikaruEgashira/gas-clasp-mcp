import { assertExists } from "jsr:@std/assert";
import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/client/stdio.js";

Deno.test("MCP server responds to listTools via stdio", async () => {
    const transport = new StdioClientTransport({
        command: "deno",
        args: ["run", "-A", "mcp.ts"],
    });

    const client = new Client({
        name: "test-client",
        version: "0.1.0",
    });

    await client.connect(transport);

    const response = await client.listTools();

    assertExists(response.tools, "No tools returned from MCP server");

    await transport.close();
    await client.close();
});
