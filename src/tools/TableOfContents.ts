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
    let filtered = sections;
    if (maxDepth !== undefined && maxDepth > 0) {
      filtered = sections.filter(section => section.level <= maxDepth);
    }

    // Apply max headers limit from configuration if set
    if (this.config.maxHeaders !== undefined) {
      filtered = this.applyMaxHeadersLimit(filtered, this.config.maxHeaders);
    }

    return filtered;
  }

  /**
   * Apply maximum headers limit to sections by progressively including header levels.
   * Always includes all level-1 headers, then level-2, etc., until adding another level would exceed the limit.
   * Uses index-based filtering to preserve original document order.
   */
  private applyMaxHeadersLimit(sections: Section[], maxHeaders: number): Section[] {
    if (maxHeaders < 1) {
      return sections;
    }

    const levelGroups = this.groupSectionsByLevel(sections);
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    const includedIndices = this.selectHeaderIndicesByLevel(levelGroups, sortedLevels, maxHeaders);

    // Return sections in original order, filtered by included indices
    return sections.filter((_, index) => includedIndices.has(index));
  }

  /**
   * Group sections by their header level, tracking original array indices.
   * Preserves index order within each group for deterministic filtering.
   */
  private groupSectionsByLevel(sections: Section[]): Map<number, number[]> {
    const levelGroups = new Map<number, number[]>();

    for (let i = 0; i < sections.length; i++) {
      const level = sections[i].level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(i);
    }

    return levelGroups;
  }

  /**
   * Select header indices by progressively including levels, respecting the maximum header limit.
   * Level-1 headers are always included regardless of limit to preserve document structure.
   */
  private selectHeaderIndicesByLevel(
    levelGroups: Map<number, number[]>,
    sortedLevels: number[],
    maxHeaders: number,
  ): Set<number> {
    const includedIndices = new Set<number>();
    let totalCount = 0;

    for (const level of sortedLevels) {
      const indices = levelGroups.get(level)!;
      const newTotal = totalCount + indices.length;

      // Always include level-1 (top-level structure), or if adding this level doesn't exceed limit
      if (level === 1 || newTotal <= maxHeaders) {
        indices.forEach(idx => includedIndices.add(idx));
        totalCount = newTotal;
      } else {
        // Stop including deeper levels once limit would be exceeded
        break;
      }
    }

    return includedIndices;
  }
}
