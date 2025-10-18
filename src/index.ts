#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool classes
import { Configuration } from './types';
import { ListDocumentationFiles } from './tools/ListDocumentationFiles';
import { TableOfContents } from './tools/TableOfContents';
import { ReadSections } from './tools/ReadSections';
import { Search } from './tools/Search';
import { createConfig } from './config/ConfigManager';
import { createErrorResponse } from './utils';

const config = createConfig();

// Initialize tool instances with config
const listDocumentationFiles = new ListDocumentationFiles(config);
const tableOfContents = new TableOfContents(config);
const readSections = new ReadSections(config);
const search = new Search(config);

// Type guards for parameter validation
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && value > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

// Tool registry for declarative tool management
interface ToolHandler {
  definition: any;
  execute: (args: Record<string, unknown>) => ReturnType<typeof listDocumentationFiles.execute>;
}

const toolRegistry: Record<string, ToolHandler> = {
  list_documentation_files: {
    definition: ListDocumentationFiles.getToolDefinition(),
    execute: async () => await listDocumentationFiles.execute(),
  },
  table_of_contents: {
    definition: TableOfContents.getToolDefinition(),
    execute: async (args) => {
      const filename = args.filename;
      let maxDepth = args.max_depth;

      // Validate parameters using type guards
      if (!isNonEmptyString(filename)) {
        return createErrorResponse('INVALID_PARAMETER', 'filename parameter is required');
      }

      // maxDepth is optional but if provided must be a number
      // Handle gracefully: negative/non-numeric values are treated as "no limit" (undefined)
      let finalMaxDepth: number | undefined = undefined;
      if (maxDepth !== undefined) {
        const numericDepth = typeof maxDepth === 'number' ? maxDepth : parseFloat(String(maxDepth));
        // If not a valid number or negative, treat as no limit (undefined)
        if (!isNaN(numericDepth) && numericDepth >= 0) {
          finalMaxDepth = numericDepth;
        }
      }

      return await tableOfContents.execute(filename, finalMaxDepth);
    },
  },
  read_sections: {
    definition: ReadSections.getToolDefinition(),
    execute: async (args) => {
      const filename = args.filename;
      const sectionIds = args.section_ids;

      // Validate parameters using type guards
      if (!isNonEmptyString(filename)) {
        return createErrorResponse('INVALID_PARAMETER', 'filename parameter is required');
      }

      if (!isStringArray(sectionIds)) {
        return createErrorResponse('INVALID_PARAMETER', 'section_ids parameter must be an array of strings');
      }

      return await readSections.execute(filename, sectionIds);
    },
  },
  search: {
    definition: Search.getToolDefinition(),
    execute: async (args) => {
      const query = args.query;
      const filename = args.filename;

      // Validate parameters using type guards
      if (!isNonEmptyString(query)) {
        return createErrorResponse('INVALID_PARAMETER', 'query parameter is required');
      }

      if (!isNonEmptyString(filename)) {
        return createErrorResponse('INVALID_PARAMETER', 'filename parameter is required');
      }

      return await search.execute(query, filename);
    },
  },
};

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
    tools: Object.values(toolRegistry).map(handler => handler.definition),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    const toolHandler = toolRegistry[toolName];

    if (!toolHandler) {
      return createErrorResponse(
        'UNKNOWN_TOOL',
        `Unknown tool: ${toolName}`
      );
    }

    return await toolHandler.execute(request.params.arguments || {});
  } catch (error) {
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred',
      { error }
    );
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
