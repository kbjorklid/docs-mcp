import { Section } from '../types';
import { MINIMUM_VIABLE_HEADER_COUNT } from '../constants';

/**
 * Shared header limiting functionality extracted from TableOfContents and SectionTableOfContents
 * to eliminate code duplication while maintaining identical behavior.
 */
export const SharedHeaderLimiting = {
  /**
   * Apply maximum headers limit using the exact same algorithm as the original implementation
   */
  applyMaxHeadersLimit(sections: Section[], maxHeaders: number): Section[] {
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
  },

  /**
   * Group sections by their header level, tracking original array indices.
   * Preserves index order within each group for deterministic filtering.
   */
  groupSectionsByLevel(sections: Section[]): Map<number, number[]> {
    const levelGroups = new Map<number, number[]>();

    for (let i = 0; i < sections.length; i++) {
      const level = sections[i].level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(i);
    }

    return levelGroups;
  },

  /**
   * Select header indices by progressively including levels, respecting the maximum header limit.
   * Level-1 headers are always included regardless of limit to preserve document structure.
   */
  selectHeaderIndicesByLevel(
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
  },

  /**
   * Phase 1: Minimum Viability Check
   * If result < MINIMUM_VIABLE_HEADER_COUNT headers AND document has >= MINIMUM_VIABLE_HEADER_COUNT headers total:
   * - Include the next sublevel completely, even if it exceeds max_headers
   */
  applyPhase1MinimumViability(
    sections: Section[],
    includedIndices: Set<number>,
    levelGroups: Map<number, number[]>,
    sortedLevels: number[],
    maxHeaders: number
  ): Set<number> {
    const totalHeadersInDocument = sections.length;
    const currentlyIncluded = includedIndices.size;

    // Check if Phase 1 applies
    // Condition: currentlyIncluded < MINIMUM_VIABLE_HEADER_COUNT AND totalHeadersInDocument >= MINIMUM_VIABLE_HEADER_COUNT
    if (currentlyIncluded >= MINIMUM_VIABLE_HEADER_COUNT || totalHeadersInDocument < MINIMUM_VIABLE_HEADER_COUNT) {
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
  },

  /**
   * Find the deepest (highest number) header level currently included
   */
  findDeepestIncludedLevel(includedIndices: Set<number>, sections: Section[]): number {
    let deepestLevel = 0;
    includedIndices.forEach(idx => {
      if (sections[idx].level > deepestLevel) {
        deepestLevel = sections[idx].level;
      }
    });
    return deepestLevel;
  },

  /**
   * Phase 2: Greedy Filling
   * If below max_headers after Phase 1, fill remaining slots by:
   * 1. Finding the deepest level currently included
   * 2. Identifying parent sections at that level
   * 3. Sorting sections by total character count (largest first)
   * 4. Adding complete child groups that fit within limit
   */
  applyPhase2GreedyFilling(
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
  },

  /**
   * Group children at nextLevel by their parent sections at parentLevel
   * Returns array of { parentIdx, childIndices[] }
   * Optimized using pre-indexed sections by level to avoid O(n*m) scanning
   */
  groupChildrenByParent(
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

    // Pre-index sections at childLevel for O(1) lookup instead of O(n*m) scanning
    const childIndicesByLevel = this.getLevelIndex(sections, childLevel);

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
  },

  /**
   * Get section index by level for O(1) lookup
   */
  getLevelIndex(sections: Section[], level: number): number[] {
    return this.groupSectionsByLevel(sections).get(level) || [];
  },

  /**
   * Check if childSection is a direct child of parentSection based on ID hierarchy
   * Uses MarkdownParser utilities for consistency and clarity
   */
  isDirectChild(childSection: Section, parentSection: Section): boolean {
    // A direct child's parent ID should match the parent section's ID
    const childParentId = this.getParentSectionId(childSection.id);
    return childParentId === parentSection.id;
  },

  /**
   * Get parent section ID from section ID using consistent parsing
   */
  getParentSectionId(sectionId: string): string {
    const parts = sectionId.split('.');
    return parts.slice(0, -1).join('.');
  },

  /**
   * Sort parent section groups by total character count (largest first)
   * Character count includes the parent section's character_count
   */
  sortParentsByCharacterCount(
    groups: Array<{ parentIdx: number; childIndices: number[] }>,
    sections: Section[]
  ): Array<{ parentIdx: number; childIndices: number[] }> {
    return groups.sort((a, b) => {
      const aCharCount = sections[a.parentIdx].character_count;
      const bCharCount = sections[b.parentIdx].character_count;
      return bCharCount - aCharCount; // Descending order (largest first)
    });
  }
};