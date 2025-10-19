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
import { SectionTableOfContents } from './tools/SectionTableOfContents';
import { Search } from './tools/Search';
import { createConfig } from './config/ConfigManager';
import { createErrorResponse, isNonEmptyString, isStringArray } from './utils';
import { ERROR_MESSAGES } from './constants';

const config = createConfig();

// Initialize tool instances with config
const listDocumentationFiles = new ListDocumentationFiles(config);
const tableOfContents = new TableOfContents(config);
const readSections = new ReadSections(config);
const sectionTableOfContents = new SectionTableOfContents(config);
const search = new Search(config);

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

      // Validate parameters using type guards
      if (!isNonEmptyString(filename)) {
        return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
      }

      return await tableOfContents.execute(filename);
    },
  },
  read_sections: {
    definition: ReadSections.getToolDefinition(),
    execute: async (args) => {
      const filename = args.filename;
      const sectionIds = args.section_ids;

      // Validate parameters using type guards
      if (!isNonEmptyString(filename)) {
        return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
      }

      if (!isStringArray(sectionIds)) {
        return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
      }

      return await readSections.execute(filename, sectionIds);
    },
  },
  section_table_of_contents: {
    definition: SectionTableOfContents.getToolDefinition(),
    execute: async (args) => {
      const filename = args.filename;
      const sectionIds = args.section_ids;

      // Validate parameters using type guards
      if (!isNonEmptyString(filename)) {
        return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
      }

      if (!isStringArray(sectionIds) || sectionIds.length === 0) {
        return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
      }

      return await sectionTableOfContents.execute(filename, sectionIds);
    },
  },
  search: {
    definition: Search.getToolDefinition(),
    execute: async (args) => {
      const query = args.query;
      const filename = args.filename;

      // Validate parameters using type guards
      if (!isNonEmptyString(query)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('query'));
      }

      if (!isNonEmptyString(filename)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('filename'));
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
      return createErrorResponse(ERROR_MESSAGES.UNKNOWN_TOOL(toolName));
    }

    return await toolHandler.execute(request.params.arguments || {});
  } catch (error) {
    return createErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
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
