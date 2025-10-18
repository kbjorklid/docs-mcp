import * as path from 'path';
import { FileInfo, Configuration, ErrorResponse } from '../types';
import { FileDiscoveryService } from '../services';

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
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FILE_SYSTEM_ERROR',
          message: 'Error accessing documentation files',
          details: error,
        },
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Get all documentation files with metadata
   */
  private async getDocumentationFiles(): Promise<FileInfo[]> {
    return await this.fileDiscovery.getFileInfoList();
  }
}
