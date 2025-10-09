# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides a simple "Hello World" tool implementation. The server follows MCP standards and communicates via stdio transport.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in the `dist/` directory
- `npm run dev` - Run the server in development mode using tsx (no build step)
- `npm start` - Run the compiled server from `dist/index.js`

### PowerShell Scripts
- `.\run.ps1` - Build and run the server in production mode
- `.\run.ps1 -Development` - Run in development mode (no build)
- `.\run.ps1 -Clean` - Clean build directory before running
- `.\run.ps1 -Help` - Show help information

### Testing the Server
Test the MCP server by sending JSON-RPC messages via stdin:

List tools:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start
```

Call hello_world tool:
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hello_world","arguments":{"name":"Your Name"}}}' | npm start
```

## Architecture

### Core Structure
- **src/index.ts** - Main MCP server implementation with tool registration and request handling
- **MCP SDK** - Uses `@modelcontextprotocol/sdk` for server infrastructure and stdio transport
- **TypeScript Configuration** - Targets ES2020 with CommonJS modules

### MCP Server Pattern
The server follows the standard MCP pattern:
1. Creates a Server instance with capabilities (tools)
2. Registers request handlers for `ListToolsRequestSchema` and `CallToolRequestSchema`
3. Connects via StdioServerTransport for JSON-RPC communication
4. Handles tool execution with parameter validation

### Tool Implementation
Tools are implemented as:
1. Tool definition in the `ListToolsRequestSchema` handler (name, description, inputSchema)
2. Execution logic in the `CallToolRequestSchema` handler (case statement)

## Adding New Tools

To add a new tool:

1. Add tool definition to the tools array in the `ListToolsRequestSchema` handler
2. Add a new case in the `CallToolRequestSchema` handler
3. Implement the tool logic and return structured content

Example tool structure:
```typescript
{
  name: "my_tool",
  description: "Description of my tool",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Parameter description" }
    },
    required: ["param1"]
  }
}
```

## Dependencies

- **@modelcontextprotocol/sdk** - Core MCP server functionality
- **tsx** - TypeScript execution for development
- **typescript** - TypeScript compiler with strict mode enabled

## Binary Distribution

The package includes a binary entry point:
- `hello-world-mcp` command points to `dist/index.js`