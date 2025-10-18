import * as path from 'path';
import { Section, Configuration, ErrorResponse } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';

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
              'Optional maximum depth for table of contents entries. If provided, only headers up to this level will be included (e.g., 2 for # and ## headers only). Use 0 to disable depth limiting and return all sections.' +
              'When the discount_single_top_header feature is enabled and the document has only one or no top-level (#) headers, the effective max depth will be increased by 1.',
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
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_PARAMETER',
          message:
            'filename parameter is required. Use the list_documentation_files tool to see available files.',
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

    try {
      const sections = await this.getTableOfContents(filename, maxDepth);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sections, null, 2),
          },
        ],
      };
    } catch (error) {
      // Check if it's a FILE_NOT_FOUND error
      if (
        error instanceof Error &&
        error.message.startsWith('FILE_NOT_FOUND:')
      ) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'FILE_NOT_FOUND',
            message: error.message.replace('FILE_NOT_FOUND: ', ''),
            details: {
              filename,
            },
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

    const errorResponse: ErrorResponse = {
      error: {
        code: 'PARSE_ERROR',
        message: 'Error parsing markdown file',
        details: {
          filename,
          error,
        },
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
   * Count the number of top-level (#) headers in the content
   */
  private countTopLevelHeaders(content: string): number {
    const lines = content.split('\n');
    let count = 0;

    for (const line of lines) {
      // Match headers that start with exactly one # followed by space
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        count++;
      }
    }

    return count;
  }

  /**
   * Calculate the effective max depth based on the discount_single_top_header setting
   */
  private calculateEffectiveMaxDepth(
    maxDepth: number | undefined,
    content: string
  ): number | undefined {
    // If discountSingleTopHeader is not enabled, return the original max depth
    if (!this.config.discountSingleTopHeader) {
      return maxDepth;
    }

    // If max depth is not set or is disabled (0), no adjustment needed
    if (maxDepth === undefined || maxDepth === 0) {
      return maxDepth;
    }

    // Count top-level headers
    const topLevelHeaderCount = this.countTopLevelHeaders(content);

    // If there is one or zero top-level headers, discount it by increasing effective max depth by 1
    if (topLevelHeaderCount <= 1) {
      return maxDepth + 1;
    }

    // Otherwise, return the original max depth
    return maxDepth;
  }

  /**
   * Get table of contents for a markdown file
   */
  private async getTableOfContents(filename: string, maxDepth?: number): Promise<Section[]> {
    const fullPath = await this.fileDiscovery.resolveFilePath(filename);

    if (!fullPath) {
      throw new Error(
        `FILE_NOT_FOUND: File '${filename}' not found in any documentation directory. Use the list_documentation_files tool to see available files.`
      );
    }

    // Check if file exists
    const validation = MarkdownParser.validateFile(fullPath);
    if (!validation.valid) {
      if (validation.error === 'File not found') {
        throw new Error(
          `FILE_NOT_FOUND: File '${filename}' not found in any documentation directory. Use the list_documentation_files tool to see available files.`
        );
      } else {
        throw new Error(validation.error);
      }
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections } = MarkdownParser.parseMarkdownSections(content);

    // Determine the effective max depth (parameter > config > unlimited)
    // Note: We need to explicitly check for undefined because 0 is a valid value
    const baseMaxDepth = maxDepth !== undefined ? maxDepth : this.config.maxTocDepth;

    // Calculate effective max depth with discount_single_top_header logic
    const effectiveMaxDepth = this.calculateEffectiveMaxDepth(baseMaxDepth, content);

    // Filter sections by max depth if specified (0 means disabled - return all sections)
    if (effectiveMaxDepth !== undefined && effectiveMaxDepth > 0) {
      return sections.filter(section => section.level <= effectiveMaxDepth);
    }

    return sections;
  }
}
