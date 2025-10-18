import * as path from 'path';
import { SectionContent, Configuration } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile } from '../utils';

export class ReadSections {
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
      name: 'read_sections',
      description:
        'Reads specific sections from a markdown file. Use the table_of_contents tool to see available sections.',
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
  async execute(filename: string, sectionIds: string[]) {
    // Validate filename parameter
    if (!filename) {
      return createErrorResponse(
        'INVALID_PARAMETER',
        'filename parameter is required'
      );
    }

    // Validate section_ids parameter
    if (!sectionIds || !Array.isArray(sectionIds)) {
      return createErrorResponse(
        'INVALID_PARAMETER',
        'section_ids parameter must be an array'
      );
    }

    try {
      const sections = await this.readSections(filename, sectionIds);
      return createSuccessResponse(sections);
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.startsWith('FILE_NOT_FOUND')) {
          const extractedFilename = error.message.split(': ')[1];
          return createErrorResponse(
            'FILE_NOT_FOUND',
            'The specified file was not found in any documentation directory',
            {
              filename: extractedFilename,
              search_paths: this.config.documentationPaths,
            }
          );
        } else if (error.message.startsWith('SECTION_NOT_FOUND')) {
          const parts = error.message.split(': ');
          const extractedFilename = parts[1];
          const missingSections = JSON.parse(parts[2]);
          return createErrorResponse(
            'SECTION_NOT_FOUND',
            `Sections [${missingSections.join(', ')}] not found in '${extractedFilename}'. Use the table_of_contents tool to see available sections.`,
            {
              filename: extractedFilename,
              missing_sections: missingSections,
            }
          );
        }
      }

      // Generic error handling
      return createErrorResponse(
        'PARSE_ERROR',
        'Error parsing markdown file',
        { filename, error }
      );
    }
  }

  /**
   * Read specific sections from a markdown file
   */
  private async readSections(
    filename: string,
    sectionIds: string[]
  ): Promise<SectionContent[]> {
    // Handle empty section_ids array - return empty result
    if (sectionIds.length === 0) {
      return [];
    }

    // Validate and resolve the file path
    const fileValidation = await validateAndResolveFile(filename, this.fileDiscovery);

    if (!fileValidation.valid) {
      throw new Error(`FILE_NOT_FOUND: ${filename}`);
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
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
