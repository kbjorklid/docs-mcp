import * as path from 'path';
import { SectionContent, DocumentationConfig, ErrorResponse } from '../types';
import { MarkdownParser } from '../MarkdownParser';

export class ReadSections {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'read_sections',
      description: 'Reads specific sections from a markdown file',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description:
              'Path to the markdown file relative to the documentation folder',
          },
          section_ids: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of section identifiers to read',
          },
        },
        required: ['filename', 'section_ids'],
      },
    };
  }

  /**
   * Execute the read_sections tool
   */
  execute(filename: string, sectionIds: string[]) {
    // Validate filename parameter
    if (!filename) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_PARAMETER',
          message: 'filename parameter is required',
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

    // Validate section_ids parameter
    if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_PARAMETER',
          message: 'section_ids parameter must be a non-empty array',
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
      const sections = this.readSections(filename, sectionIds);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sections, null, 2),
          },
        ],
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.startsWith('FILE_NOT_FOUND')) {
          const filename = error.message.split(': ')[1];
          const errorResponse: ErrorResponse = {
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'The specified file was not found',
              details: {
                filename,
                search_path: this.config.documentation_path,
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
        } else if (error.message.startsWith('FILE_TOO_LARGE')) {
          const filename = error.message.split(': ')[1];
          const errorResponse: ErrorResponse = {
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File exceeds size limits',
              details: {
                filename,
                max_size: this.config.max_file_size,
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
        } else if (error.message.startsWith('SECTION_NOT_FOUND')) {
          const parts = error.message.split(': ');
          const filename = parts[1];
          const missingSections = JSON.parse(parts[2]);
          const errorResponse: ErrorResponse = {
            error: {
              code: 'SECTION_NOT_FOUND',
              message: `Sections [${missingSections.join(', ')}] not found in '${filename}'. Use the table_of_contents tool to see available sections.`,
              details: {
                filename,
                missing_sections: missingSections,
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

      // Generic error handling
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
   * Read specific sections from a markdown file
   */
  private readSections(
    filename: string,
    sectionIds: string[]
  ): SectionContent[] {
    const fullPath = path.resolve(this.config.documentation_path, filename);

    // Check if file exists
    const validation = MarkdownParser.validateFile(
      fullPath,
      this.config.max_file_size
    );
    if (!validation.valid) {
      if (validation.error === 'File not found') {
        throw new Error(`FILE_NOT_FOUND: ${filename}`);
      } else if (validation.error === 'File too large') {
        throw new Error(`FILE_TOO_LARGE: ${filename}`);
      } else {
        throw new Error(validation.error);
      }
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Check if all requested sections exist
    const missingSections = sectionIds.filter((id) => !sectionMap.has(id));
    if (missingSections.length > 0) {
      throw new Error(
        `SECTION_NOT_FOUND: ${filename}: ${JSON.stringify(missingSections)}`
      );
    }

    // Read the requested sections
    const sections = MarkdownParser.readSectionsFromContent(
      content,
      sectionIds,
      sectionMap
    );
    return sections;
  }
}
