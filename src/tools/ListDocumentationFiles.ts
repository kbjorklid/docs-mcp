import * as path from 'path';
import { FileInfo, Configuration } from '../types';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { ERROR_MESSAGES } from '../constants';

export class ListDocumentationFiles {
  private config: Configuration;
  private fileDiscovery: FileDiscoveryService;

  constructor(config: Configuration) {
    this.config = config;
    this.fileDiscovery = new FileDiscoveryService(config);
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'list_documentation_files',
      description:
        'Lists all available documentation files with their metadata. Use table_of_contents tool to see metadata for a specific file, and then the read_sections tool to read specific parts.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  /**
   * Execute the list_documentation_files tool
   */
  async execute() {
    try {
      const files = await this.getDocumentationFiles();

      // Return the files array (even if empty)
      // An empty array is a valid result, not an error
      return createSuccessResponse(files);
    } catch (error) {
      return createErrorResponse(ERROR_MESSAGES.FILE_SYSTEM_ERROR);
    }
  }

  /**
   * Get all documentation files with metadata
   */
  private async getDocumentationFiles(): Promise<FileInfo[]> {
    return await this.fileDiscovery.getFileInfoList();
  }
}
