import * as path from 'path';
import { SectionContent, Configuration } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile } from '../utils';
import { ERROR_MESSAGES } from '../constants';

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
      return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
    }

    // Validate section_ids parameter
    if (!sectionIds || !Array.isArray(sectionIds)) {
      return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
    }

    try {
      const sections = await this.readSections(filename, sectionIds);
      return createSuccessResponse(sections);
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.startsWith('FILE_NOT_FOUND')) {
          // Format: FILE_NOT_FOUND: filename|error message
          const parts = error.message.split('|');
          const errorMsg = parts[1] || ERROR_MESSAGES.PARSE_ERROR;
          return createErrorResponse(errorMsg);
        } else if (error.message.startsWith('SECTION_NOT_FOUND')) {
          const parts = error.message.split(': ');
          const extractedFilename = parts[1];
          const missingSections = JSON.parse(parts[2]);
          return createErrorResponse(
            ERROR_MESSAGES.SECTION_NOT_FOUND(missingSections, extractedFilename)
          );
        }
      }

      // Generic error handling
      return createErrorResponse(ERROR_MESSAGES.PARSE_ERROR);
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
      // Return the FILE_NOT_FOUND error message directly by throwing with the error message
      const errorMsg = fileValidation.errorMessage || `File '${filename}' not found`;
      throw new Error(`FILE_NOT_FOUND: ${filename}|${errorMsg}`);
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
