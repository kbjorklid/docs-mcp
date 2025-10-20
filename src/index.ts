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
import { createErrorResponse, isNonEmptyString, isStringArray, isValidFileId } from './utils';
import { ERROR_MESSAGES, ToolName, isToolName } from './constants';

const config = createConfig();

// Initialize tool instances with config
const listDocumentationFiles = new ListDocumentationFiles(config);
const tableOfContents = new TableOfContents(config);
const readSections = new ReadSections(config);
const sectionTableOfContents = new SectionTableOfContents(config);
const search = new Search(config);

// Tool registry for declarative tool management
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface ToolHandler {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => ReturnType<typeof listDocumentationFiles.execute>;
}

const toolRegistry: Record<ToolName, ToolHandler> = {
  [ToolName.LIST_DOCUMENTATION_FILES]: {
    definition: ListDocumentationFiles.getToolDefinition(),
    execute: async () => await listDocumentationFiles.execute(),
  },
  [ToolName.TABLE_OF_CONTENTS]: {
    definition: TableOfContents.getToolDefinition(),
    execute: async (args) => {
      const fileId = args.fileId;

      // Validate parameters using type guards
      if (!isNonEmptyString(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.FILE_ID_REQUIRED);
      }

      if (!isValidFileId(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileId));
      }

      return await tableOfContents.execute(fileId);
    },
  },
  [ToolName.READ_SECTIONS]: {
    definition: ReadSections.getToolDefinition(),
    execute: async (args) => {
      const fileId = args.fileId;
      const sectionIds = args.section_ids;

      // Validate parameters using type guards
      if (!isNonEmptyString(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.FILE_ID_REQUIRED);
      }

      if (!isValidFileId(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileId));
      }

      if (!isStringArray(sectionIds)) {
        return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
      }

      return await readSections.execute(fileId, sectionIds);
    },
  },
  [ToolName.SECTION_TABLE_OF_CONTENTS]: {
    definition: SectionTableOfContents.getToolDefinition(),
    execute: async (args) => {
      const fileId = args.fileId;
      const sectionIds = args.section_ids;

      // Validate parameters using type guards
      if (!isNonEmptyString(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.FILE_ID_REQUIRED);
      }

      if (!isValidFileId(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileId));
      }

      if (!isStringArray(sectionIds) || sectionIds.length === 0) {
        return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
      }

      return await sectionTableOfContents.execute(fileId, sectionIds);
    },
  },
  [ToolName.SEARCH]: {
    definition: Search.getToolDefinition(),
    execute: async (args) => {
      const query = args.query;
      const fileId = args.fileId;

      // Validate query parameter
      if (!isNonEmptyString(query)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('query'));
      }

      // Validate fileId if provided (optional parameter)
      if (fileId !== undefined && fileId !== null) {
        if (!isNonEmptyString(fileId)) {
          return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('fileId'));
        }

        if (!isValidFileId(fileId)) {
          return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileId as string));
        }
      }

      return await search.execute(query, fileId);
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

    // Validate tool name
    if (!isToolName(toolName)) {
      return createErrorResponse(ERROR_MESSAGES.UNKNOWN_TOOL(toolName));
    }

    const toolHandler = toolRegistry[toolName];

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
