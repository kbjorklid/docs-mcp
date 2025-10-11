# Hello World MCP Server

A simple TypeScript/Node.js Model Context Protocol (MCP) server that demonstrates a basic "Hello, World" tool implementation.

## Features

- Implements the MCP stdio protocol
- Provides a simple `hello_world` tool
- Built with TypeScript for type safety
- Easy to extend with additional tools

## Installation

```bash
npm install
```

## Usage

### Quick Start with PowerShell

The easiest way to run the MCP server is using the PowerShell scripts:

#### From Project Directory

```powershell
# Production mode (builds and runs)
.\run-mcp-server.ps1

# Development mode (runs directly without building)
.\run-mcp-server.ps1 -Development

# Clean build first
.\run-mcp-server.ps1 -Clean

# Show help
.\run-mcp-server.ps1 -Help
```

#### From Any Directory

```powershell
# Run from anywhere using the global launcher
hello-world-mcp.ps1

# Development mode from anywhere
hello-world-mcp.ps1 -Development
```

### Manual Usage

#### Development

Run the server in development mode with TypeScript:

```bash
npm run dev
```

#### Production

Build and run the server:

```bash
npm run build
npm start
```

### Testing the Server

You can test the server by sending JSON-RPC messages via stdin:

1. List available tools:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start
```

2. Call the hello_world tool:

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hello_world","arguments":{"name":"Your Name"}}}' | npm start
```

## Tool Description

### hello_world

A simple greeting tool that returns a friendly hello message.

**Parameters:**

- `name` (optional, string): The name to greet. Defaults to "World" if not provided.

**Example Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Hello, Claude! 👋"
    }
  ]
}
```

## Project Structure

```
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Project configuration and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Extending the Server

To add new tools:

1. Add the tool definition to the `ListToolsRequestSchema` handler
2. Add a case for your tool in the `CallToolRequestSchema` handler
3. Implement the tool logic

Example:

```typescript
// Add to tools list
{
  name: "my_tool",
  description: "Description of my tool",
  inputSchema: {
    type: "object",
    properties: {
      // Define your parameters here
    },
    required: ["param1"],
  },
}

// Add to tool execution handler
case "my_tool": {
  // Implement your tool logic here
  return {
    content: [
      {
        type: "text",
        text: "Tool result",
      },
    ],
  };
}
```

## License

ISC
