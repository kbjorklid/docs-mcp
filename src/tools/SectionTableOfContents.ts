import { Section, Configuration, TableOfContentsResponse, FileId, parseFileId, SectionId, parseSectionId } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponseRawText, createErrorResponse, parseToolError, getErrorMessage, createSectionNotFoundError, hasHiddenSubsections, INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS, formatTableOfContentsAsXml, SharedHeaderLimiting } from '../utils';
import { ERROR_MESSAGES } from '../constants';

export class SectionTableOfContents {
  private config: Configuration;
  private fileDiscovery: FileDiscoveryService;

  constructor(config: Configuration) {
    this.config = config;
    this.fileDiscovery = new FileDiscoveryService(config);
  }

  static getToolDefinition() {
    return {
      name: 'section_table_of_contents',
      description:
        'Provides a structured table of contents for the subsections within specified parent sections. ' +
        'Unlike table_of_contents which starts from the file root, this tool returns nested subsections ' +
        'up to the configured max-toc-depth starting from the specified section IDs. Use the table_of_contents ' +
        'tool to see available sections and their IDs. The --max-headers and --max-toc-depth options are both respected.',
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
            description: 'Non-empty array of numeric section identifiers to get subsections for (e.g., ["1", "1.2"])',
            minItems: 1,
          },
        },
        required: ['fileId', 'section_ids'],
      },
    };
  }

  async execute(fileIdInput: string, sectionIds: string[]) {
    const fileId = parseFileId(fileIdInput);
    if (!fileId) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileIdInput));
    }

    if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
      return createErrorResponse(ERROR_MESSAGES.SECTION_IDS_REQUIRED);
    }

    try {
      const result = await this.getSectionTableOfContents(fileId, sectionIds);
      const formattedResult = formatTableOfContentsAsXml(result);
      return createSuccessResponseRawText(formattedResult);
    } catch (error) {
      const parsedError = parseToolError(error);
      return createErrorResponse(getErrorMessage(parsedError));
    }
  }

  private async getSectionTableOfContents(fileId: FileId, sectionIdsInput: string[]): Promise<TableOfContentsResponse> {
    const fileMapping = await this.fileDiscovery.getFileByFileId(fileId);
    if (!fileMapping) {
      throw new Error(ERROR_MESSAGES.FILE_ID_NOT_FOUND(fileId));
    }

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

    if (invalidSectionIds.length > 0) {
      throw createSectionNotFoundError(fileMapping.filename, invalidSectionIds);
    }

    const { content } = MarkdownParser.readMarkdownFile(fileMapping.fullPath);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    const missingSections = sectionIds.filter((id) => !sectionMap.has(id));
    if (missingSections.length > 0) {
      throw createSectionNotFoundError(fileMapping.filename, missingSections);
    }

    let subsections = this.getNestedChildrenUpToDepth(sections, sectionIds);
    subsections = this.deduplicateSections(subsections);

    if (this.config.maxHeaders !== undefined) {
      subsections = this.applyMaxHeadersLimit(subsections, this.config.maxHeaders);
    }

    MarkdownParser.applyConditionalSubsectionCounts(subsections);

    const response: TableOfContentsResponse = {
      fileId,
      filename: fileMapping.filename,
      sections: subsections,
    };

    if (hasHiddenSubsections(subsections)) {
      response.instructions = INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS;
    }

    return response;
  }

  private getNestedChildrenUpToDepth(allSections: Section[], parentSectionIds: SectionId[]): Section[] {
    const result: Section[] = [];
    const seenIds = new Set<string>();

    const maxTocDepth = this.config.maxTocDepth || 3;
    const maxAllowedLevel = this.calculateMaxAllowedLevel(parentSectionIds, maxTocDepth);

    for (const parentId of parentSectionIds) {
      const parentSection = allSections.find(s => s.id === parentId);
      if (!parentSection) continue;

      this.collectNestedChildren(allSections, parentSection, parentSection.level, maxAllowedLevel, result, seenIds);
    }

    return result;
  }

  private calculateMaxAllowedLevel(parentSectionIds: SectionId[], maxTocDepth: number): number {
    const minParentLevel = Math.min(...parentSectionIds.map(id => id.split('.').length));
    return minParentLevel + maxTocDepth;
  }

  private collectNestedChildren(
    allSections: Section[],
    parentSection: Section,
    currentLevel: number,
    maxAllowedLevel: number,
    result: Section[],
    seenIds: Set<string>
  ): void {
    if (currentLevel >= maxAllowedLevel) {
      return;
    }

    for (const section of allSections) {
      const childParentId = MarkdownParser.getParentSectionId(section.id);

      if (childParentId === parentSection.id && !seenIds.has(section.id)) {
        result.push(section);
        seenIds.add(section.id);

        this.collectNestedChildren(allSections, section, section.level, maxAllowedLevel, result, seenIds);
      }
    }
  }

  private deduplicateSections(sections: Section[]): Section[] {
    return Array.from(new Map(sections.map(s => [s.id, s])).values());
  }

  private applyMaxHeadersLimit(sections: Section[], maxHeaders: number): Section[] {
    return SharedHeaderLimiting.applyMaxHeadersLimit(sections, maxHeaders);
  }

  

  

  
  
  }
