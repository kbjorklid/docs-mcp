import { ReadSectionsResponse, Configuration, FileId, parseFileId, SectionId, parseSectionId } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, parseToolError, getErrorMessage, createSectionNotFoundError } from '../utils';
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
        'Sections include therir subsections, e.g. reading section "1" includes "1/1", "1/2", etc.' +
        'Use the table_of_contents tool to see available sections and their IDs.',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description:
              'The file ID (e.g., \'f1\', \'f2\') returned by the list_documentation_files tool.',
          },
          section_ids: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of numeric section identifiers to read (e.g., ["1/1", "1/2"])',
          },
        },
        required: ['fileId', 'section_ids'],
      },
    };
  }

  /**
   * Execute the read_sections tool
   */
  async execute(fileIdInput: string, sectionIds: string[]) {
    // Parse and validate fileId parameter
    const fileId = parseFileId(fileIdInput);
    if (!fileId) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileIdInput));
    }

    // Validate section_ids parameter
    if (!sectionIds || !Array.isArray(sectionIds)) {
      return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
    }

    try {
      const result = await this.readSections(fileId, sectionIds);
      return createSuccessResponse(result);
    } catch (error) {
      const parsedError = parseToolError(error);
      return createErrorResponse(getErrorMessage(parsedError));
    }
  }

  /**
   * Read specific sections from a markdown file
   */
  private async readSections(
    fileId: FileId,
    sectionIdsInput: string[]
  ): Promise<ReadSectionsResponse> {
    // Resolve fileId to file path
    const fileMapping = await this.fileDiscovery.getFileByFileId(fileId);

    if (!fileMapping) {
      throw new Error(ERROR_MESSAGES.FILE_ID_NOT_FOUND(fileId));
    }

    // Handle empty section_ids array - return empty result with file info
    if (sectionIdsInput.length === 0) {
      return {
        fileId,
        filename: fileMapping.filename,
        sections: [],
      };
    }

    // Parse and validate section IDs
    const sectionIds: SectionId[] = [];
    const invalidSectionIds: string[] = [];

    for (const idInput of sectionIdsInput) {
      const parsedId = parseSectionId(idInput);
      if (parsedId) {
        sectionIds.push(parsedId);
      } else {
        invalidSectionIds.push(idInput);
      }
    }

    // If any section IDs are invalid, treat them as "not found"
    // This makes sense from a user perspective - whether the format is invalid
    // or the section doesn't exist, they should use table_of_contents to get valid IDs
    if (invalidSectionIds.length > 0) {
      throw createSectionNotFoundError(fileMapping.filename, invalidSectionIds);
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fileMapping.fullPath);
    const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Check if all requested sections exist
    const missingSections = sectionIds.filter((id) => !sectionMap.has(id));
    if (missingSections.length > 0) {
      throw createSectionNotFoundError(fileMapping.filename, missingSections);
    }

    // Read the requested sections
    const sections = MarkdownParser.readSectionsFromContent(
      content,
      sectionIds,
      sectionMap
    );

    return {
      fileId,
      filename: fileMapping.filename,
      sections,
    };
  }
}
