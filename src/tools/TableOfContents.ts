import { Section, Configuration, TableOfContentsResponse, FileId, parseFileId } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponseRawText, createErrorResponse, parseToolError, getErrorMessage, hasHiddenSubsections, INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS, formatTableOfContentsAsXml, SharedHeaderLimiting } from '../utils';
import { ERROR_MESSAGES, MINIMUM_VIABLE_HEADER_COUNT, DEFAULT_MAX_TOC_DEPTH } from '../constants';

export class TableOfContents {
  private config: Configuration;
  private fileDiscovery: FileDiscoveryService;

  constructor(config: Configuration) {
    this.config = config;
    this.fileDiscovery = new FileDiscoveryService(config);
  }

  static getToolDefinition() {
    return {
      name: 'table_of_contents',
      description:
        'Provides a structured table of contents for a documentation file with numeric section IDs (e.g., "1.2.3"). ' +
        'Use the list_documentation_files tool to get file IDs. ' +
        'ALWAYS use this tool first before resorting to the \'search\' tool. ' +
        'After using this tool, use the read_sections tool with the section IDs to read specific sections. ' +
        `The depth of headers returned is controlled by the server's max-toc-depth setting (default: ${DEFAULT_MAX_TOC_DEPTH} for ${'#'.repeat(DEFAULT_MAX_TOC_DEPTH)} headers).`,
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description:
              'The file ID (e.g., \'f1\', \'f2\') returned by the list_documentation_files tool.',
          },
        },
        required: ['fileId'],
      },
    };
  }

  async execute(fileIdInput: string) {
    const fileId = parseFileId(fileIdInput);
    if (!fileId) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileIdInput));
    }

    try {
      const result = await this.getTableOfContents(fileId);
      const formattedResult = formatTableOfContentsAsXml(result);
      return createSuccessResponseRawText(formattedResult);
    } catch (error) {
      const parsedError = parseToolError(error);
      return createErrorResponse(getErrorMessage(parsedError));
    }
  }


  private async getTableOfContents(fileId: FileId): Promise<TableOfContentsResponse> {
    const fileMapping = await this.fileDiscovery.getFileByFileId(fileId);
    if (!fileMapping) {
      throw new Error(ERROR_MESSAGES.FILE_ID_NOT_FOUND(fileId));
    }

    const { content } = MarkdownParser.readMarkdownFile(fileMapping.fullPath);
    const { sections: fullSections } = MarkdownParser.parseMarkdownSections(content);

    let filtered = fullSections;
    if (this.config.maxTocDepth !== undefined && this.config.maxTocDepth > 0) {
      filtered = fullSections.filter(section => section.level <= this.config.maxTocDepth!);
    }

    if (this.config.maxHeaders !== undefined) {
      filtered = this.applyMaxHeadersLimit(filtered, this.config.maxHeaders);
    }

    MarkdownParser.applyConditionalSubsectionCounts(filtered);

    const response: TableOfContentsResponse = {
      fileId,
      filename: fileMapping.filename,
      sections: filtered,
    };

    if (hasHiddenSubsections(filtered)) {
      response.instructions = INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS;
    }

    return response;
  }

  private applyMaxHeadersLimit(sections: Section[], maxHeaders: number): Section[] {
    return SharedHeaderLimiting.applyMaxHeadersLimit(sections, maxHeaders);
  }
}