#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool classes
import { DEFAULT_CONFIG, DocumentationConfig } from "./types.js";
import { ListDocumentationFiles } from "./tools/ListDocumentationFiles.js";
import { TableOfContents } from "./tools/TableOfContents.js";
import { ReadSections } from "./tools/ReadSections.js";

// Parse command line arguments
function parseCommandLineArgs(): { docsPath?: string } {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--docs-path' || args[i] === '-d') {
      if (i + 1 < args.length) {
        return { docsPath: args[i + 1] };
      }
    }
  }
  
  return {};
}

// Create configuration with precedence: CLI args > environment variables > defaults
function createConfig(): DocumentationConfig {
  const cliArgs = parseCommandLineArgs();
  
  return {
    ...DEFAULT_CONFIG,
    documentation_path: cliArgs.docsPath || process.env.DOCS_PATH || "./docs"
  };
}

const config = createConfig();

// Initialize tool instances with config
const listDocumentationFiles = new ListDocumentationFiles(config);
const tableOfContents = new TableOfContents(config);
const readSections = new ReadSections(config);

// Create MCP server
const server = new Server(
  {
    name: "documentation-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ListDocumentationFiles.getToolDefinition(),
      TableOfContents.getToolDefinition(),
      ReadSections.getToolDefinition(),
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "list_documentation_files":
        return await listDocumentationFiles.execute();

      case "table_of_contents": {
        const filename = request.params.arguments?.filename as string;
        return tableOfContents.execute(filename);
      }

      case "read_sections": {
        const filename = request.params.arguments?.filename as string;
        const sectionIds = request.params.arguments?.section_ids as string[];
        return readSections.execute(filename, sectionIds);
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: {
                  code: "UNKNOWN_TOOL",
                  message: `Unknown tool: ${request.params.name}`,
                },
              }, null, 2),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: {
              code: "INTERNAL_ERROR",
              message: "An internal error occurred",
              details: error,
            },
          }, null, 2),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});