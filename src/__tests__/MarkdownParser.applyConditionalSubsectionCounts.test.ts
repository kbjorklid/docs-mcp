import { MarkdownParser } from '../MarkdownParser';
import { Section } from '../types';

describe('MarkdownParser.applyConditionalSubsectionCounts', () => {
  describe('Core Behavior - Identical Output to Original', () => {
    it('should delete subsection_count when all direct children are visible', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 2 },
        { id: '1/1', title: 'Child 1', level: 2, character_count: 50 },
        { id: '1/2', title: 'Child 2', level: 2, character_count: 50 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // When all 2 children are visible, subsection_count should be deleted
      expect(sections[0].subsection_count).toBeUndefined();
    });

    it('should keep subsection_count when some direct children are missing', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 3 },
        { id: '1/1', title: 'Child 1', level: 2, character_count: 50 },
        // Child 1/2 missing (filtered out)
        { id: '1/3', title: 'Child 3', level: 2, character_count: 50 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // Only 2 of 3 children visible, keep subsection_count to show 1 is hidden
      expect(sections[0].subsection_count).toBe(3);
    });

    it('should keep subsection_count when no direct children are visible', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 2 },
        // All children filtered out
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // No children visible (0 of 2), keep subsection_count
      expect(sections[0].subsection_count).toBe(2);
    });

    it('should not modify sections without subsection_count (leaf sections)', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100 },
        { id: '1/1', title: 'Leaf Child', level: 2, character_count: 50 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // Leaf sections should remain unchanged
      expect(sections[0].subsection_count).toBeUndefined();
      expect(sections[1].subsection_count).toBeUndefined();
    });

    it('should not count grandchildren as direct children', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 2 },
        { id: '1/1', title: 'Child 1', level: 2, character_count: 50 },
        { id: '1/2', title: 'Child 2', level: 2, character_count: 50, subsection_count: 1 },
        { id: '1/2/1', title: 'Grandchild', level: 3, character_count: 25 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // Parent has 2 direct children visible → delete subsection_count
      expect(sections[0].subsection_count).toBeUndefined();

      // Child 2 has 1 direct child visible → delete subsection_count
      expect(sections[2].subsection_count).toBeUndefined();
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle empty sections array', () => {
      const sections: Section[] = [];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      expect(sections).toHaveLength(0);
    });

    it('should handle single section without children', () => {
      const sections: Section[] = [
        { id: '1', title: 'Only Section', level: 1, character_count: 100 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      expect(sections[0].subsection_count).toBeUndefined();
    });

    it('should handle subsection_count of zero gracefully', () => {
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 0 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // subsection_count of 0 should be skipped
      expect(sections[0].subsection_count).toBe(0);
    });

    it('should handle non-sequential section IDs correctly', () => {
      // Sections might be filtered, leaving gaps in numbering
      const sections: Section[] = [
        { id: '1', title: 'Parent', level: 1, character_count: 100, subsection_count: 5 },
        { id: '1/2', title: 'Child 2', level: 2, character_count: 50 },
        { id: '1/4', title: 'Child 4', level: 2, character_count: 50 },
        // Children 1, 3, 5 are missing
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // Only 2 of 5 children visible, keep subsection_count
      expect(sections[0].subsection_count).toBe(5);
    });

    it('should handle multiple top-level sections independently', () => {
      const sections: Section[] = [
        { id: '1', title: 'Section 1', level: 1, character_count: 100, subsection_count: 2 },
        { id: '1/1', title: 'Child 1.1', level: 2, character_count: 50 },
        { id: '1/2', title: 'Child 1.2', level: 2, character_count: 50 },

        { id: '2', title: 'Section 2', level: 1, character_count: 100, subsection_count: 2 },
        { id: '2/1', title: 'Child 2.1', level: 2, character_count: 50 },
        // Child 2/2 missing
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // Section 1: all children visible → delete subsection_count
      expect(sections[0].subsection_count).toBeUndefined();

      // Section 2: only 1 of 2 children visible → keep subsection_count
      expect(sections[3].subsection_count).toBe(2);
    });

    it('should handle deeply nested hierarchies (6 levels)', () => {
      const sections: Section[] = [
        { id: '1', title: 'L1', level: 1, character_count: 100, subsection_count: 1 },
        { id: '1/1', title: 'L2', level: 2, character_count: 90, subsection_count: 1 },
        { id: '1/1/1', title: 'L3', level: 3, character_count: 80, subsection_count: 1 },
        { id: '1/1/1/1', title: 'L4', level: 4, character_count: 70, subsection_count: 1 },
        { id: '1/1/1/1/1', title: 'L5', level: 5, character_count: 60, subsection_count: 1 },
        { id: '1/1/1/1/1/1', title: 'L6', level: 6, character_count: 50 },
      ];

      MarkdownParser.applyConditionalSubsectionCounts(sections);

      // All levels should have their subsection_count deleted (all children visible)
      expect(sections[0].subsection_count).toBeUndefined();
      expect(sections[1].subsection_count).toBeUndefined();
      expect(sections[2].subsection_count).toBeUndefined();
      expect(sections[3].subsection_count).toBeUndefined();
      expect(sections[4].subsection_count).toBeUndefined();
      expect(sections[5].subsection_count).toBeUndefined();
    });
  });

  describe('Integration with Filtering Scenarios', () => {
    it('should work correctly after max_toc_depth filtering', () => {
      // Simulates TableOfContents filtering by max_toc_depth
      const allSections: Section[] = [
        { id: '1', title: 'L1', level: 1, character_count: 100, subsection_count: 2 },
        { id: '1/1', title: 'L2-1', level: 2, character_count: 50, subsection_count: 1 },
        { id: '1/2', title: 'L2-2', level: 2, character_count: 50 },
        { id: '1/1/1', title: 'L3', level: 3, character_count: 25 },
      ];

      // Simulate max_toc_depth = 2 (filter out level 3)
      const filtered = allSections.filter(s => s.level <= 2);

      // Recalculate subsection counts for filtered sections
      MarkdownParser.calculateSubsectionCountsForSections(filtered, true);

      // Apply conditional logic
      MarkdownParser.applyConditionalSubsectionCounts(filtered);

      // L1 has 2 children visible → delete subsection_count
      expect(filtered[0].subsection_count).toBeUndefined();

      // L2-1 has no children visible (child filtered) → subsection_count should be undefined
      expect(filtered[1].subsection_count).toBeUndefined();
    });

    it('should work correctly with search result filtering (partial matches)', () => {
      // Simulates Search.ts filtering (only matched sections included)
      const allSections: Section[] = [
        { id: '1', title: 'Features', level: 1, character_count: 100, subsection_count: 3 },
        { id: '1/1', title: 'Feature One', level: 2, character_count: 33 },
        // 1/2 not matched
        { id: '1/3', title: 'Feature Three', level: 2, character_count: 33 },
      ];

      // Apply conditional logic (simulating search results)
      MarkdownParser.applyConditionalSubsectionCounts(allSections);

      // Only 2 of 3 children visible → keep subsection_count
      expect(allSections[0].subsection_count).toBe(3);
    });
  });

  describe('Regression Tests - No Behavior Change', () => {
    it('should produce identical results to original implementation (multiple scenarios)', () => {
      const testCases = [
        {
          name: 'All children visible',
          input: [
            { id: '1', title: 'P', level: 1, character_count: 100, subsection_count: 2 },
            { id: '1/1', title: 'C1', level: 2, character_count: 50 },
            { id: '1/2', title: 'C2', level: 2, character_count: 50 },
          ],
          expectedSubsectionCounts: [undefined, undefined, undefined],
        },
        {
          name: 'Some children missing',
          input: [
            { id: '1', title: 'P', level: 1, character_count: 100, subsection_count: 3 },
            { id: '1/1', title: 'C1', level: 2, character_count: 50 },
          ],
          expectedSubsectionCounts: [3, undefined],
        },
        {
          name: 'Mixed visibility levels',
          input: [
            { id: '1', title: 'L1', level: 1, character_count: 100, subsection_count: 1 },
            { id: '1/1', title: 'L2', level: 2, character_count: 90, subsection_count: 1 },
            { id: '1/1/1', title: 'L3', level: 3, character_count: 80 },
          ],
          expectedSubsectionCounts: [undefined, undefined, undefined],
        },
      ];

      testCases.forEach(({ name, input, expectedSubsectionCounts }) => {
        const sections = JSON.parse(JSON.stringify(input)); // Deep copy
        MarkdownParser.applyConditionalSubsectionCounts(sections);

        sections.forEach((section: Section, index: number) => {
          expect(section.subsection_count).toBe(expectedSubsectionCounts[index]);
        });
      });
    });
  });

  describe('Performance and Large Data Sets', () => {
    it('should handle large number of sections efficiently', () => {
      // Create 1000 sections with various parent-child relationships
      const sections: Section[] = [];

      // 100 level-1 sections, each with 9 level-2 children
      for (let i = 1; i <= 100; i++) {
        sections.push({
          id: `${i}`,
          title: `Section ${i}`,
          level: 1,
          character_count: 1000,
          subsection_count: 9,
        });

        for (let j = 1; j <= 9; j++) {
          sections.push({
            id: `${i}/${j}`,
            title: `Subsection ${i}.${j}`,
            level: 2,
            character_count: 100,
          });
        }
      }

      const startTime = Date.now();
      MarkdownParser.applyConditionalSubsectionCounts(sections);
      const duration = Date.now() - startTime;

      // Should complete in under 100ms for 1000 sections (O(n) should be very fast)
      expect(duration).toBeLessThan(100);

      // Verify correctness: all level-1 sections should have subsection_count deleted
      // because all 9 children are visible
      const level1Sections = sections.filter(s => s.level === 1);
      level1Sections.forEach(section => {
        expect(section.subsection_count).toBeUndefined();
      });
    });
  });
});
