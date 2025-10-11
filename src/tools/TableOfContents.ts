import * as path from 'path';
import { Section, DocumentationConfig, ErrorResponse } from '../types';
import { MarkdownParser } from '../MarkdownParser';

export class TableOfContents {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'table_of_contents',
      description:
        'Provides a structured table of contents for a documentation file. Use the list_documentation_files tool to see available files. ' +
        'After using this tool, use the read_sections tool to read specific sections.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description:
              'The documentation file path as provided by the list_documentation_files tool.',
          },
        },
        required: ['filename'],
      },
    };
  }

  /**
   * Execute the table_of_contents tool
   */
  execute(filename: string) {
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
      const sections = this.getTableOfContents(filename);
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
   * Get table of contents for a markdown file
   */
  private getTableOfContents(filename: string): Section[] {
    const fullPath = path.resolve(this.config.documentation_path, filename);

    // Check if file exists
    const validation = MarkdownParser.validateFile(
      fullPath,
      this.config.max_file_size
    );
    if (!validation.valid) {
      if (validation.error === 'File not found') {
        throw new Error(
          `FILE_NOT_FOUND: File '${filename}' not found. Use the list_documentation_files tool to see available files.`
        );
      } else if (validation.error === 'File too large') {
        throw new Error(`FILE_TOO_LARGE: ${filename}`);
      } else {
        throw new Error(validation.error);
      }
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections } = MarkdownParser.parseMarkdownSections(content);

    return sections;
  }
}
