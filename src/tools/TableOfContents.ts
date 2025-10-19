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
        'Provides a structured table of contents for a documentation file with numeric section IDs (e.g., "1/2/3"). ' +
        'Use the list_documentation_files tool to see available files. ' +
        'ALWAYS use this tool first before resorting to the \'search\' tool. ' +
        'After using this tool, use the read_sections tool with the section IDs to read specific sections. ' +
        'The depth of headers returned is controlled by the server\'s max-toc-depth setting (default: 3 for ### headers).',
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
  async execute(filename: string) {
    // Validate filename parameter
    if (!filename) {
      return createErrorResponse(ERROR_MESSAGES.FILENAME_REQUIRED);
    }

    try {
      const sections = await this.getTableOfContents(filename);
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
  private async getTableOfContents(filename: string): Promise<Section[]> {
    // Validate and resolve the file path
    const fileValidation = await validateAndResolveFile(filename, this.fileDiscovery);

    if (!fileValidation.valid) {
      const errorMsg = fileValidation.errorMessage || `File '${filename}' not found`;
      throw new Error(`FILE_NOT_FOUND: ${filename}|${errorMsg}`);
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
    const { sections } = MarkdownParser.parseMarkdownSections(content);

    // Filter sections by max toc depth from configuration if set
    let filtered = sections;
    if (this.config.maxTocDepth !== undefined && this.config.maxTocDepth > 0) {
      filtered = sections.filter(section => section.level <= this.config.maxTocDepth!);
    }

    // Apply max headers limit from configuration if set
    if (this.config.maxHeaders !== undefined) {
      filtered = this.applyMaxHeadersLimit(filtered, this.config.maxHeaders);
    }

    return filtered;
  }

  /**
   * Apply maximum headers limit using a two-phase algorithm:
   * 1. Base greedy algorithm (always include level-1, then progressively deeper levels)
   * 2. Phase 1: Minimum viability check (if < 3 headers, include next level entirely)
   * 3. Phase 2: Greedy filling (fill remaining slots with character-count-prioritized sections)
   * Uses index-based filtering to preserve original document order.
   */
  private applyMaxHeadersLimit(sections: Section[], maxHeaders: number): Section[] {
    if (maxHeaders < 1) {
      return sections;
    }

    // Base greedy algorithm (existing logic)
    const levelGroups = this.groupSectionsByLevel(sections);
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    let includedIndices = this.selectHeaderIndicesByLevel(levelGroups, sortedLevels, maxHeaders);

    // Phase 1: Minimum Viability Check
    includedIndices = this.applyPhase1MinimumViability(
      sections,
      includedIndices,
      levelGroups,
      sortedLevels,
      maxHeaders
    );

    // Phase 2: Greedy Filling (only if below limit after Phase 1)
    if (includedIndices.size < maxHeaders) {
      includedIndices = this.applyPhase2GreedyFilling(
        sections,
        includedIndices,
        levelGroups,
        sortedLevels,
        maxHeaders
      );
    }

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

  /**
   * Phase 1: Minimum Viability Check
   * If result < 3 headers AND document has >= 3 headers total:
   * - Include the next sublevel completely, even if it exceeds max_headers
   *
   * @param sections - All sections from the document
   * @param includedIndices - Indices selected by base algorithm
   * @param levelGroups - Sections grouped by level
   * @param sortedLevels - Sorted array of header levels
   * @param maxHeaders - Maximum header limit
   * @returns Updated set of included indices
   */
  private applyPhase1MinimumViability(
    sections: Section[],
    includedIndices: Set<number>,
    levelGroups: Map<number, number[]>,
    sortedLevels: number[],
    maxHeaders: number
  ): Set<number> {
    const totalHeadersInDocument = sections.length;
    const currentlyIncluded = includedIndices.size;

    // Check if Phase 1 applies
    // Condition: currentlyIncluded < 3 AND totalHeadersInDocument >= 3
    if (currentlyIncluded >= 3 || totalHeadersInDocument < 3) {
      return includedIndices; // No action needed
    }

    // Find the deepest level currently included
    const deepestIncludedLevel = this.findDeepestIncludedLevel(includedIndices, sections);

    // Find the next level after the deepest included
    const nextLevelIndex = sortedLevels.findIndex(level => level > deepestIncludedLevel);

    if (nextLevelIndex === -1) {
      // No deeper levels exist, return as is
      return includedIndices;
    }

    const nextLevel = sortedLevels[nextLevelIndex];
    const nextLevelIndices = levelGroups.get(nextLevel) || [];

    // Include all headers from the next level (even if exceeds max_headers)
    const newIncludedIndices = new Set(includedIndices);
    nextLevelIndices.forEach(idx => newIncludedIndices.add(idx));

    return newIncludedIndices;
  }

  /**
   * Find the deepest (highest number) header level currently included
   */
  private findDeepestIncludedLevel(includedIndices: Set<number>, sections: Section[]): number {
    let deepestLevel = 0;
    includedIndices.forEach(idx => {
      if (sections[idx].level > deepestLevel) {
        deepestLevel = sections[idx].level;
      }
    });
    return deepestLevel;
  }

  /**
   * Phase 2: Greedy Filling
   * If below max_headers after Phase 1, fill remaining slots by:
   * 1. Finding the deepest level currently included
   * 2. Identifying parent sections at that level
   * 3. Sorting sections by total character count (largest first)
   * 4. Adding complete child groups that fit within limit
   *
   * @param sections - All sections from the document
   * @param includedIndices - Indices after Phase 1
   * @param levelGroups - Sections grouped by level
   * @param sortedLevels - Sorted array of header levels
   * @param maxHeaders - Maximum header limit
   * @returns Updated set of included indices
   */
  private applyPhase2GreedyFilling(
    sections: Section[],
    includedIndices: Set<number>,
    levelGroups: Map<number, number[]>,
    sortedLevels: number[],
    maxHeaders: number
  ): Set<number> {
    const newIncludedIndices = new Set(includedIndices);

    // Find the deepest level currently included
    const deepestIncludedLevel = this.findDeepestIncludedLevel(includedIndices, sections);

    // Find the next level (children of current deepest level)
    const nextLevelIndex = sortedLevels.findIndex(level => level > deepestIncludedLevel);

    if (nextLevelIndex === -1) {
      // No deeper levels exist, return as is
      return newIncludedIndices;
    }

    const nextLevel = sortedLevels[nextLevelIndex];

    // Group children by their parent sections at the deepest included level
    const parentSectionGroups = this.groupChildrenByParent(
      sections,
      includedIndices,
      deepestIncludedLevel,
      nextLevel
    );

    // Sort parent sections by total character count (largest first)
    const sortedParents = this.sortParentsByCharacterCount(parentSectionGroups, sections);

    // Try to add each parent's children if they fit
    for (const { childIndices } of sortedParents) {
      const wouldExceedLimit = newIncludedIndices.size + childIndices.length > maxHeaders;

      if (!wouldExceedLimit) {
        // Add all children from this parent (all-or-nothing constraint)
        childIndices.forEach(idx => newIncludedIndices.add(idx));
      }
      // If it would exceed, skip this parent entirely (all-or-nothing)
    }

    return newIncludedIndices;
  }

  /**
   * Group children at nextLevel by their parent sections at parentLevel
   * Returns array of { parentIdx, childIndices[] }
   */
  private groupChildrenByParent(
    sections: Section[],
    includedIndices: Set<number>,
    parentLevel: number,
    childLevel: number
  ): Array<{ parentIdx: number; childIndices: number[] }> {
    const groups: Array<{ parentIdx: number; childIndices: number[] }> = [];

    // Get all parent sections at parentLevel that are included
    const parentIndices = Array.from(includedIndices).filter(
      idx => sections[idx].level === parentLevel
    );

    parentIndices.forEach(parentIdx => {
      const parentSection = sections[parentIdx];
      const childIndices: number[] = [];

      // Find all direct children at childLevel
      sections.forEach((section, idx) => {
        if (section.level === childLevel && this.isDirectChild(section, parentSection)) {
          childIndices.push(idx);
        }
      });

      if (childIndices.length > 0) {
        groups.push({ parentIdx, childIndices });
      }
    });

    return groups;
  }

  /**
   * Check if childSection is a direct child of parentSection based on ID hierarchy
   */
  private isDirectChild(childSection: Section, parentSection: Section): boolean {
    // Child ID format: "parent-id/child-id"
    // Check if child starts with parent ID and has exactly one more level
    if (!childSection.id.startsWith(parentSection.id + '/')) {
      return false;
    }

    const childParts = childSection.id.split('/');
    const parentParts = parentSection.id.split('/');

    // Direct child has exactly one more level than parent
    return childParts.length === parentParts.length + 1;
  }

  /**
   * Sort parent section groups by total character count (largest first)
   * Character count includes the parent section's character_count
   */
  private sortParentsByCharacterCount(
    groups: Array<{ parentIdx: number; childIndices: number[] }>,
    sections: Section[]
  ): Array<{ parentIdx: number; childIndices: number[] }> {
    return groups.sort((a, b) => {
      const aCharCount = sections[a.parentIdx].character_count;
      const bCharCount = sections[b.parentIdx].character_count;
      return bCharCount - aCharCount; // Descending order (largest first)
    });
  }
}
