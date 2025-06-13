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

# Run tests
deno test --allow-run --allow-net --allow-env --allow-read tests/
```
