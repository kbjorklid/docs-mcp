import { Section, Configuration, TableOfContentsResponse, FileId, parseFileId, SectionId, parseSectionId } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponseRawText, createErrorResponse, parseToolError, getErrorMessage, createSectionNotFoundError, hasHiddenSubsections, INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS, formatTableOfContentsAsXml } from '../utils';
import { ERROR_MESSAGES } from '../constants';

/**
 * Represents a parent section and its direct children indices.
 * Used for organizing sections during the max_headers limiting algorithm.
 */
interface ParentSectionGroup {
  parentIdx: number;
  childIndices: number[];
}

export class SectionTableOfContents {
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

  /**
   * Execute the section_table_of_contents tool
   */
  async execute(fileIdInput: string, sectionIds: string[]) {
    // Parse and validate fileId parameter
    const fileId = parseFileId(fileIdInput);
    if (!fileId) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileIdInput));
    }

    // Validate section_ids parameter
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

  /**
   * Get table of contents for subsections of specified sections
   */
  private async getSectionTableOfContents(fileId: FileId, sectionIdsInput: string[]): Promise<TableOfContentsResponse> {
    // Resolve fileId to file path
    const fileMapping = await this.fileDiscovery.getFileByFileId(fileId);

    if (!fileMapping) {
      throw new Error(ERROR_MESSAGES.FILE_ID_NOT_FOUND(fileId));
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
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Check if all requested sections exist
    const missingSections = sectionIds.filter((id) => !sectionMap.has(id));
    if (missingSections.length > 0) {
      throw createSectionNotFoundError(fileMapping.filename, missingSections);
    }

    // Get nested children of all requested sections respecting maxTocDepth
    let subsections = this.getNestedChildrenUpToDepth(sections, sectionIds);

    // Remove duplicates that may occur from overlapping parent hierarchies
    subsections = this.deduplicateSections(subsections);

    // Apply max headers limit from configuration if set
    if (this.config.maxHeaders !== undefined) {
      subsections = this.applyMaxHeadersLimit(subsections, this.config.maxHeaders);
    }

    // Apply conditional logic: only show subsection_count if not all children are visible
    // The subsection counts were calculated from the full document during parsing,
    // and we conditionally hide them if all children are already visible in the filtered results
    MarkdownParser.applyConditionalSubsectionCounts(subsections);

    // Build response with file info and sections
    const response: TableOfContentsResponse = {
      fileId,
      filename: fileMapping.filename,
      sections: subsections,
    };

    // Add instructions if any section has hidden subsections
    if (hasHiddenSubsections(subsections)) {
      response.instructions = INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS;
    }

    return response;
  }

  /**
   * Get nested children of specified parent sections up to maxTocDepth.
   * Each parent may have multiple nested children, and multiple parents may be queried simultaneously.
   * Respects maxTocDepth configuration to limit how deep the nested hierarchy goes.
   * Maintains order of sections as they appear in the document.
   *
   * @param allSections - All sections from the document
   * @param parentSectionIds - IDs of parent sections to retrieve children for
   * @returns Array of nested children from all parent sections, deduplicated
   */
  private getNestedChildrenUpToDepth(allSections: Section[], parentSectionIds: SectionId[]): Section[] {
    const result: Section[] = [];
    const seenIds = new Set<string>();

    // Calculate the maximum depth we should include
    const maxTocDepth = this.config.maxTocDepth || 3; // Default to 3 if not set
    const maxAllowedLevel = this.calculateMaxAllowedLevel(parentSectionIds, maxTocDepth);

    for (const parentId of parentSectionIds) {
      const parentSection = allSections.find(s => s.id === parentId);
      if (!parentSection) continue;

      // Get all nested children up to the allowed depth
      this.collectNestedChildren(allSections, parentSection, parentSection.level, maxAllowedLevel, result, seenIds);
    }

    return result;
  }

  /**
   * Calculate the maximum allowed level based on parent levels and maxTocDepth
   *
   * @param parentSectionIds - IDs of parent sections
   * @param maxTocDepth - Maximum depth to include
   * @returns Maximum level number that should be included
   */
  private calculateMaxAllowedLevel(parentSectionIds: SectionId[], maxTocDepth: number): number {
    // Find the minimum level among all parent sections
    const minParentLevel = Math.min(...parentSectionIds.map(id => {
      // Extract level from ID (e.g., "1.2.3" -> level 3)
      const parts = id.split('.');
      return parts.length;
    }));

    // Calculate max allowed level: parent level + maxTocDepth
    return minParentLevel + maxTocDepth;
  }

  /**
   * Recursively collect nested children up to the allowed level
   *
   * @param allSections - All sections from the document
   * @param parentSection - Current parent section
   * @param currentLevel - Level of the current parent
   * @param maxAllowedLevel - Maximum level allowed
   * @param result - Array to collect results in
   * @param seenIds - Set to track already included sections
   */
  private collectNestedChildren(
    allSections: Section[],
    parentSection: Section,
    currentLevel: number,
    maxAllowedLevel: number,
    result: Section[],
    seenIds: Set<string>
  ): void {
    // If we've reached the maximum allowed depth, stop collecting
    if (currentLevel >= maxAllowedLevel) {
      return;
    }

    // Find direct children of this parent
    for (const section of allSections) {
      const childParentId = MarkdownParser.getParentSectionId(section.id);

      // Check if this section is a direct child of the current parent and hasn't been added yet
      if (childParentId === parentSection.id && !seenIds.has(section.id)) {
        result.push(section);
        seenIds.add(section.id);

        // Recursively collect children of this child (up to max allowed depth)
        this.collectNestedChildren(allSections, section, section.level, maxAllowedLevel, result, seenIds);
      }
    }
  }

  /**
   * Remove duplicate sections that may occur from overlapping parent hierarchies.
   * Uses a Map keyed by section ID to preserve only the first occurrence.
   *
   * @param sections - Array of sections that may contain duplicates
   * @returns Array with duplicate sections removed, maintaining order
   */
  private deduplicateSections(sections: Section[]): Section[] {
    return Array.from(new Map(sections.map(s => [s.id, s])).values());
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
   * Build an index of section indices by level for O(1) lookup
   * Improves performance when filtering by level
   */
  private indexSectionsByLevel(sections: Section[]): Map<number, number[]> {
    const levelIndex = new Map<number, number[]>();
    sections.forEach((section, idx) => {
      if (!levelIndex.has(section.level)) {
        levelIndex.set(section.level, []);
      }
      levelIndex.get(section.level)!.push(idx);
    });
    return levelIndex;
  }

  /**
   * Group children at nextLevel by their parent sections at parentLevel.
   * Returns array of parent-child relationships organized for processing.
   * Optimized using pre-indexed sections by level to avoid O(n*m) scanning.
   *
   * @param sections - All sections from the document
   * @param includedIndices - Indices of currently included sections
   * @param parentLevel - Header level of parent sections to consider
   * @param childLevel - Header level of child sections to group
   * @returns Array of parent-child groupings
   */
  private groupChildrenByParent(
    sections: Section[],
    includedIndices: Set<number>,
    parentLevel: number,
    childLevel: number
  ): ParentSectionGroup[] {
    const groups: ParentSectionGroup[] = [];

    // Get all parent sections at parentLevel that are included
    const parentIndices = Array.from(includedIndices).filter(
      idx => sections[idx].level === parentLevel
    );

    // Pre-index sections at childLevel for O(1) lookup instead of O(n*m) scanning
    const childIndicesByLevel = this.indexSectionsByLevel(sections).get(childLevel) || [];

    parentIndices.forEach(parentIdx => {
      const parentSection = sections[parentIdx];

      // Find direct children from pre-indexed list at childLevel
      const childIndices = childIndicesByLevel.filter(childIdx =>
        this.isDirectChild(sections[childIdx], parentSection)
      );

      if (childIndices.length > 0) {
        groups.push({ parentIdx, childIndices });
      }
    });

    return groups;
  }

  /**
   * Check if childSection is a direct child of parentSection based on ID hierarchy
   * Uses MarkdownParser utilities for consistency and clarity
   */
  private isDirectChild(childSection: Section, parentSection: Section): boolean {
    // A direct child's parent ID should match the parent section's ID
    const childParentId = MarkdownParser.getParentSectionId(childSection.id);
    return childParentId === parentSection.id;
  }

  /**
   * Sort parent section groups by total character count (largest first).
   * Prioritizes processing of larger sections to maximize content included within limits.
   *
   * @param groups - Parent-child groupings to sort
   * @param sections - All sections (used for accessing character counts)
   * @returns Sorted parent-child groupings, ordered by character count descending
   */
  private sortParentsByCharacterCount(
    groups: ParentSectionGroup[],
    sections: Section[]
  ): ParentSectionGroup[] {
    return groups.sort((a, b) => {
      const aCharCount = sections[a.parentIdx].character_count;
      const bCharCount = sections[b.parentIdx].character_count;
      return bCharCount - aCharCount; // Descending order (largest first)
    });
  }
}
