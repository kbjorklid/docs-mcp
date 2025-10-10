#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool classes
import { DEFAULT_CONFIG } from "./types.js";
import { ListDocumentationFiles } from "./tools/ListDocumentationFiles.js";
import { TableOfContents } from "./tools/TableOfContents.js";
import { ReadSections } from "./tools/ReadSections.js";

// Initialize tool instances
const listDocumentationFiles = new ListDocumentationFiles(DEFAULT_CONFIG);
const tableOfContents = new TableOfContents(DEFAULT_CONFIG);
const readSections = new ReadSections(DEFAULT_CONFIG);

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
  console.error("Documentation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});