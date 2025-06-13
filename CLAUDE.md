# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides Google Apps Script clasp integration. It's built with Deno and provides tools for managing Google Apps Script projects through the clasp CLI.

## Key Commands

### Development
```bash
# Cache dependencies
deno cache mcp.ts

# Run the MCP server directly
deno run --allow-read --allow-run --allow-env --allow-net mcp.ts --workspacedir /path/to/project

# Or using environment variable
WORKSPACE_DIR=/path/to/project deno run --allow-read --allow-run --allow-env --allow-net mcp.ts

# Run tests
deno test --allow-run --allow-net --allow-env --allow-read tests/
```

### Docker Build
```bash
docker buildx build --load -t gas-clasp-mcp .
```

## Architecture

### Core Structure
- `mcp.ts` - Main MCP server entry point that handles tool routing and argument parsing
- `tools/` - Individual tool implementations for clasp operations
- `tools/mod.ts` - Central export module for all tools
- `tests/` - Integration tests using MCP Client SDK

### MCP Tools
The server exposes 6 clasp-related tools:
1. `clasp_setup` - Environment setup and clasp installation
2. `clasp_create` - New project creation
3. `clasp_clone` - Clone existing projects
4. `clasp_pull` - Pull remote changes
5. `clasp_push_and_deploy` - Push and deploy with environment switching
6. `clasp_list` - List available projects

### Environment Management
- Supports `development` and `production` environments
- Production deployments require clean `main` branch
- Automatic `.clasp.json` switching based on environment

### Testing Strategy
- Uses MCP Inspector for manual testing
- Integration tests with `StdioClientTransport` to test actual MCP communication
- Tests run via `deno test` with necessary permissions
- No mocking - tests against real MCP server instances

## Key Technical Details

- Built on Deno runtime with JSR package distribution
- Uses `@modelcontextprotocol/sdk` for MCP protocol implementation
- All tools accept `workspaceDir` parameter (auto-injected from CLI args or WORKSPACE_DIR environment variable)
- Error handling uses custom `formatErrorMessage` utility
- Zod schemas for argument validation on all tools