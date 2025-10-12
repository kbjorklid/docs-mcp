#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool classes
import { DocumentationConfig } from './types';
import { ListDocumentationFiles } from './tools/ListDocumentationFiles';
import { TableOfContents } from './tools/TableOfContents';
import { ReadSections } from './tools/ReadSections';
import { Search } from './tools/Search';
import { createConfig } from './config/ConfigManager';

const config = createConfig();

// Initialize tool instances with config
const listDocumentationFiles = new ListDocumentationFiles(config);
const tableOfContents = new TableOfContents(config);
const readSections = new ReadSections(config);
const search = new Search(config);

// Create MCP server
const server = new Server(
  {
    name: 'documentation-server',
    version: '1.0.0',
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
      Search.getToolDefinition(),
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'list_documentation_files':
        return await listDocumentationFiles.execute();

      case 'table_of_contents': {
        const filename = request.params.arguments?.filename as string;
        const maxDepth = request.params.arguments?.max_depth as number | undefined;
        return tableOfContents.execute(filename, maxDepth);
      }

      case 'read_sections': {
        const filename = request.params.arguments?.filename as string;
        const sectionIds = request.params.arguments?.section_ids as string[];
        return readSections.execute(filename, sectionIds);
      }

      case 'search': {
        const query = request.params.arguments?.query as string;
        const filename = request.params.arguments?.filename as string | undefined;
        return await search.execute(query, filename);
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: {
                    code: 'UNKNOWN_TOOL',
                    message: `Unknown tool: ${request.params.name}`,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
                details: error,
              },
            },
            null,
            2
          ),
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

// Only start the server when this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
