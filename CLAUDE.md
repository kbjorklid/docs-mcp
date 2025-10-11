# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides documentation reading and navigation tools for markdown-based documentation repositories. The server follows MCP standards and communicates via stdio transport.

## Features

The server implements three core tools for documentation management:

1. **list_documentation_files** - Lists all available documentation files with metadata
2. **table_of_contents** - Provides structured table of contents for markdown files
3. **read_sections** - Reads specific sections from markdown files

## Configuration

The server uses environment variables and default configuration:

- `DOCS_PATH` - Root directory containing markdown files (default: "./docs")
- Supports YAML front matter parsing for metadata
- Configurable file size limits and exclusion patterns
- Glob-based file discovery with include/exclude patterns

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

List documentation files:

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start
```

Get table of contents:

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"your-file.md"}}}' | npm start
```

Read specific sections:

```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_sections","arguments":{"filename":"your-file.md","section_ids":["section-id"]}}' | npm start
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
- **js-yaml** - YAML front matter parsing
- **glob** - File pattern matching
- **tsx** - TypeScript execution for development
- **typescript** - TypeScript compiler with strict mode enabled

## Binary Distribution

The package includes a binary entry point:

- `docs-mcp` command points to `dist/index.js`

## Error Handling

The server implements comprehensive error handling with structured error responses:

- **FILE_NOT_FOUND** - Requested file doesn't exist
- **INVALID_SECTION_ID** - Section identifier is malformed
- **SECTION_NOT_FOUND** - Requested section doesn't exist
- **FILE_TOO_LARGE** - File exceeds size limits
- **PARSE_ERROR** - Error parsing markdown or metadata
- **FILE_SYSTEM_ERROR** - Error accessing documentation files

All errors follow the JSON format specified in SPECIFICATION.md.
