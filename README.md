<div align="center">

<img src="website/static/img/logo.png" alt="Logo" width="200"/>

# GAS Clasp MCP

Model Context Protocol (MCP) server for Google Clasp integration.

</div>

## Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "gas-clasp": {
      "command": "deno",
      "args": [
        "run",
        "--allow-read=.",
        "--allow-run",
        "--allow-env",
        "--allow-net",
        "jsr:@hikae/gas-clasp-mcp/mcp.ts"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [],
      "autoApprove": []
    }
  }
}
```

or

```json
{
  "mcpServers": {
    "gas-clasp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "-v", ".:/workspace",
        "-w", "/workspace",
        "-v", "~/.clasprc.json:/root/.clasprc.json",
        "ghcr.io/hikaruegashira/gas-clasp-mcp:latest"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [],
      "autoApprove": []
    }
  }
}
```

## Tools

This MCP server provides tools to interact with the Google Apps Script command-line tool [clasp](https://github.com/google/clasp).

### Environment Configuration (env)

Deployments can target specific environments:

-   `development`: Development environment
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
5.  **clasp_pull**: Pulls remote changes to the local project. Automatically switches `.clasp.json` based on the specified environment.
    ```json
    {
      "rootDir": "Project root directory",
      "env": "Environment (development or production)"
    }
    ```
6.  **clasp_push_and_deploy**: Pushes local changes and optionally deploys. Automatically switches `.clasp.json` based on the specified environment.
    ```json
    {
      "rootDir": "Project root directory",
      "env": "Environment (development or production)",
      "force": "Ignore confirmation prompts (optional: true/false)",
      "watch": "Watch for changes and auto-push (optional: true/false)",
      "deploy": "Deploy after push (optional: true/false)",
      "version": "Deployment version (optional)",
      "description": "Deployment description (optional)"
    }
    ```
7.  **clasp_list**: Lists Google Apps Script projects associated with the account.
    ```json
    { "rootDir": "Project root directory (used for context)" }
    ```

## Setup Development Environment

1.  **Install Deno**: Follow the instructions at [https://deno.land/](https://deno.land/)
2.  **Cache Dependencies**:
    ```bash
    deno cache mcp.ts
    ```
3.  **Run Directly**:
    ```bash
    deno run --allow-read --allow-run --allow-env --allow-net mcp.ts
    ```

## Build with Docker

```bash
docker login ghcr.io

docker buildx build --load -t gas-clasp-mcp .
docker tag gas-clasp-mcp ghcr.io/hikaruegashira/gas-clasp-mcp:latest
IMAGE_ID=$(docker inspect --format='{{.Id}}' gas-clasp-mcp | cut -d':' -f2 | head -c 12)
docker tag gas-clasp-mcp ghcr.io/hikaruegashira/gas-clasp-mcp:sha-$IMAGE_ID

docker push ghcr.io/hikaruegashira/gas-clasp-mcp:latest
docker push ghcr.io/hikaruegashira/gas-clasp-mcp:sha-$IMAGE_ID
```
