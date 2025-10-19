import { FileInfoWithId, Configuration } from '../types';
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
        'Lists all available documentation files with their file IDs and metadata. ' +
        'Each file is assigned a unique file ID (e.g., f1, f2, f3) that you must use when calling other tools. ' +
        'Use table_of_contents tool with the file ID to see the structure of a specific file, ' +
        'and then the read_sections tool to read specific parts.',
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
   * Get all documentation files with metadata and file IDs
   */
  private async getDocumentationFiles(): Promise<FileInfoWithId[]> {
    return await this.fileDiscovery.getAllFilesWithIds();
  }
}
