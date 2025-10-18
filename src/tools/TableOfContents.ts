import { Section, Configuration } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile } from '../utils';
import { ERROR_MESSAGES } from '../constants';

export class TableOfContents {
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
      name: 'table_of_contents',
      description:
        'Provides a structured table of contents for a documentation file. Use the list_documentation_files tool to see available files. ' +
        'ALWAYS use this tool first before resorting to the \'search\' tool. ' +
        'After using this tool, use the read_sections tool to read specific sections.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description:
              'The documentation file path as provided by the list_documentation_files tool.',
          },
          max_depth: {
            type: 'number',
            description:
              'Optional maximum depth for table of contents entries. If provided, only headers up to this level will be included (e.g., 2 for # and ## headers only). Use 0 to disable depth limiting and return all sections.',
            minimum: 0,
          },
        },
        required: ['filename'],
      },
    };
  }

  /**
   * Execute the table_of_contents tool
   */
  async execute(filename: string, maxDepth?: number) {
    // Validate filename parameter
    if (!filename) {
      return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
    }

    try {
      const sections = await this.getTableOfContents(filename, maxDepth);
      return createSuccessResponse(sections);
    } catch (error) {
      // Check if it's a FILE_NOT_FOUND error
      if (
        error instanceof Error &&
        error.message.startsWith('FILE_NOT_FOUND:')
      ) {
        // Format: FILE_NOT_FOUND: filename|error message
        const parts = error.message.split('|');
        const errorMsg = parts[1] || ERROR_MESSAGES.PARSE_ERROR;
        return createErrorResponse(errorMsg);
      }

      return createErrorResponse(ERROR_MESSAGES.PARSE_ERROR);
    }
  }


  /**
   * Get table of contents for a markdown file
   */
  private async getTableOfContents(filename: string, maxDepth?: number): Promise<Section[]> {
    // Validate and resolve the file path
    const fileValidation = await validateAndResolveFile(filename, this.fileDiscovery);

    if (!fileValidation.valid) {
      const errorMsg = fileValidation.errorMessage || `File '${filename}' not found`;
      throw new Error(`FILE_NOT_FOUND: ${filename}|${errorMsg}`);
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
    const { sections } = MarkdownParser.parseMarkdownSections(content);

    // Filter sections by max depth if specified (0 means disabled - return all sections)
    if (maxDepth !== undefined && maxDepth > 0) {
      return sections.filter(section => section.level <= maxDepth);
    }

    return sections;
  }
}
