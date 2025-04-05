# GAS Clasp MCP (Deno Version)

Model Context Protocol (MCP) server for Google Clasp integration, running on Deno.

## Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "gas-clasp": {
      "command": "deno",
      "args": ["run", "--allow-read", "--allow-run", "--allow-env", "--allow-net", "/path/to/gas-clasp-mcp/mcp.ts"],
      "env": {},
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```
*Replace `/path/to/gas-clasp-mcp/mcp.ts` with the actual absolute path.*

## Installation and Running

1.  **Install Deno**: Follow the instructions at [https://deno.land/](https://deno.land/)
2.  **Cache Dependencies**:
    ```bash
    deno cache mcp.ts
    ```
3.  **Run Directly**:
    ```bash
    deno run --allow-read --allow-run --allow-env --allow-net mcp.ts
    ```
4.  **Run with Task Runner**:
    ```bash
    deno task start
    ```
5.  **Run in Watch Mode (Development)**:
    ```bash
    deno task dev
    ```

## Tools

This MCP server provides tools to interact with the Google Apps Script command-line tool [clasp](https://github.com/google/clasp).

### Environment Configuration (env)

Deployments can target specific environments:

-   `development`: Development environment (default)
-   `staging`: Staging/testing environment
-   `production`: Production environment
    -   **Important**: Production deployments require being on the `main` git branch with no uncommitted changes.

### Available Tools

1.  **clasp_setup**: Sets up the clasp environment (checks/installs clasp, optional login).
    ```json
    {
      "rootDir": "Project root directory",
      "autoInstall": "Install clasp if missing (optional: true/false)",
      "autoLogin": "Initiate Google login (optional: true/false)",
      "global": "Install clasp globally (optional: true/false)",
      "listProjects": "List projects after setup (optional: true/false)"
    }
    ```
2.  **clasp_logout**: Logs out from the current Google account via clasp.
    ```json
    { "rootDir": "Project root directory" }
    ```
3.  **clasp_create**: Creates a new Google Apps Script project.
    ```json
    {
      "title": "Project title",
      "rootDir": "Directory to create project in",
      "type": "Project type (optional: standalone/docs/sheets/slides/forms/webapp/api)"
    }
    ```
4.  **clasp_clone**: Clones an existing Google Apps Script project.
    ```json
    {
      "scriptId": "Script ID to clone",
      "rootDir": "Directory to clone into"
    }
    ```
5.  **clasp_pull**: Pulls remote changes to the local project.
    ```json
    { "rootDir": "Project root directory" }
    ```
6.  **clasp_push**: Pushes local changes to the remote project.
    ```json
    {
      "rootDir": "Project root directory",
      "force": "Ignore confirmation prompts (optional: true/false)",
      "watch": "Watch for changes and auto-push (optional: true/false, not recommended for MCP)"
    }
    ```
7.  **clasp_deploy**: Deploys the project.
    ```json
    {
      "rootDir": "Project root directory",
      "env": "Environment (development/staging/production)",
      "version": "Deployment version (optional)",
      "description": "Deployment description (optional)"
    }
    ```
8.  **clasp_list**: Lists Google Apps Script projects associated with the account.
    ```json
    { "rootDir": "Project root directory (used for context)" }
    ```

### Usage Example

```javascript
// Deploy to development environment
use_mcp_tool({
  server_name: "gas-clasp", // Use the name defined in MCP settings
  tool_name: "clasp_deploy",
  arguments: {
    "rootDir": "/Users/username/projects/my-gas-project",
    "env": "development",
    "description": "Development deployment"
  }
});

// Deploy to production (requires main branch, clean state)
use_mcp_tool({
  server_name: "gas-clasp",
  tool_name: "clasp_deploy",
  arguments: {
    "rootDir": "/Users/username/projects/my-gas-project",
    "env": "production",
    "description": "Production release v1.0.0"
  }
});
```
