import { SectionContent, Configuration } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile, parseToolError, getErrorMessage, createFileNotFoundError, createSectionNotFoundError } from '../utils';
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
        'Reads specific sections from a markdown file using numeric section IDs (e.g., "1/2/3" where each number represents the position of a header at each level). ' +
        'Use the table_of_contents tool to see available sections and their IDs.',
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
            description: 'Array of numeric section identifiers to read (e.g., ["1/1", "1/2"])',
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
      const parsedError = parseToolError(error);
      return createErrorResponse(getErrorMessage(parsedError));
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
      throw createFileNotFoundError(filename, errorMsg);
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
    const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Check if all requested sections exist
    const missingSections = sectionIds.filter((id) => !sectionMap.has(id));
    if (missingSections.length > 0) {
      throw createSectionNotFoundError(filename, missingSections);
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
