import * as path from 'path';
import { TableOfContents } from '../tools/TableOfContents';
import { DocumentationConfig } from '../types';

describe('TableOfContents', () => {
  let tableOfContents: TableOfContents;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    mockConfig = {
      documentation_path: fixturesPath,
      max_toc_depth: 5,
      discount_single_top_header: false,
    };

    tableOfContents = new TableOfContents(mockConfig);
  });

  describe('execute', () => {
    it('should return table of contents for valid file', () => {
      // Execute with test-doc.md
      const result = tableOfContents.execute('test-doc.md');

      // Verify
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(5); // Introduction, Getting Started, Installation, Configuration, Advanced Topics

      expect(sections[0]).toEqual({
        id: 'introduction',
        title: 'Introduction',
        level: 1,
        character_count: expect.any(Number),
      });

      expect(sections[1]).toEqual({
        id: 'getting-started',
        title: 'Getting Started',
        level: 1,
        character_count: expect.any(Number),
      });
    });

    it('should return error when filename is not provided', () => {
      // Execute
      const result = tableOfContents.execute('');

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe(
        'filename parameter is required. Use the list_documentation_files tool to see available files.'
      );
    });

    it('should return error when filename is null', () => {
      // Execute
      const result = tableOfContents.execute(null as any);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
    });

    it('should handle file not found error with helpful message', () => {
      // Execute with non-existent file
      const result = tableOfContents.execute('nonexistent.md');

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "File 'nonexistent.md' not found. Use the list_documentation_files tool to see available files."
      );
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
    });

    it('should handle empty sections', () => {
      // Execute with file that has no headers
      const result = tableOfContents.execute('empty-sections.md');

      // Verify empty sections array
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(0);
    });

    it('should provide guidance about list_documentation_files tool in error message', () => {
      // Execute with non-existent file
      const result = tableOfContents.execute('missing-file.md');

      // Verify error response contains guidance
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResponse.error.message).toContain(
        'list_documentation_files tool'
      );
      expect(errorResponse.error.message).toContain('see available files');
    });
  });

  describe('getTableOfContents', () => {
    it('should handle nested sections correctly', () => {
      // Execute with nested-sections.md
      const result = tableOfContents.execute('nested-sections.md');

      // Verify nested structure
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBeGreaterThan(0);

      // Check for nested section IDs
      const nestedSection = sections.find((s: any) => s.id.includes('/'));
      expect(nestedSection).toBeDefined();
      expect(nestedSection.level).toBeGreaterThan(1);
    });

    it('should handle file without frontmatter', () => {
      // Execute with no-frontmatter.md
      const result = tableOfContents.execute('no-frontmatter.md');

      // Verify sections are parsed correctly
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections[0].title).toBe('Simple Document');
    });
  });

  describe('max depth functionality', () => {
    it('should return all sections when no max depth is specified', () => {
      // Execute with multi-level-headers.md without max depth
      const result = tableOfContents.execute('multi-level-headers.md');

      // Verify all sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(10); // All headers from level 1 to 5

      // Check that we have sections from all levels
      const levels = sections.map((s: any) => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
      expect(levels).toContain(5);
    });

    it('should return only level 1 and 2 sections when max_depth is 2', () => {
      // Execute with max_depth: 2
      const result = tableOfContents.execute('multi-level-headers.md', 2);

      // Verify only level 1 and 2 sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(4); // Main title + 3 sections

      // Check that all sections are level 1 or 2
      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
        expect(section.level).toBeGreaterThanOrEqual(1);
      });

      // Verify specific sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Main Title');
      expect(titles).toContain('Section 1');
      expect(titles).toContain('Section 2');
      expect(titles).toContain('Section 3');

      // Verify deeper sections are excluded
      expect(titles).not.toContain('Subsection 1.1');
      expect(titles).not.toContain('Sub-subsection 1.1.1');
    });

    it('should return only level 1, 2, and 3 sections when max_depth is 3', () => {
      // Execute with max_depth: 3
      const result = tableOfContents.execute('multi-level-headers.md', 3);

      // Verify only level 1, 2, and 3 sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(7); // Main title + 3 sections + 3 subsections

      // Check that all sections are level 1, 2, or 3
      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
        expect(section.level).toBeGreaterThanOrEqual(1);
      });

      // Verify specific sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Main Title');
      expect(titles).toContain('Section 1');
      expect(titles).toContain('Section 2');
      expect(titles).toContain('Section 3');
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 1.2');
      expect(titles).toContain('Subsection 2.1');

      // Verify deeper sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });

    it('should return only level 1 sections when max_depth is 1', () => {
      // Execute with max_depth: 1
      const result = tableOfContents.execute('multi-level-headers.md', 1);

      // Verify only level 1 sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1); // Only Main Title

      // Check that the section is level 1
      expect(sections[0].level).toBe(1);
      expect(sections[0].title).toBe('Main Title');
    });

    it('should handle max_depth larger than actual header levels', () => {
      // Execute with max_depth: 10 (larger than any header in the file)
      const result = tableOfContents.execute('multi-level-headers.md', 10);

      // Verify all sections are returned (same as no max depth)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(10); // All sections
    });

    it('should respect config-level max_toc_depth when no parameter is provided', () => {
      // Create config with max_toc_depth
      const configWithMaxDepth = {
        ...mockConfig,
        max_toc_depth: 2,
      };
      const tocWithConfig = new TableOfContents(configWithMaxDepth);

      // Execute without max_depth parameter
      const result = tocWithConfig.execute('multi-level-headers.md');

      // Verify only level 1 and 2 sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(4); // Main title + 3 sections

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
      });
    });

    it('should prioritize parameter max_depth over config max_toc_depth', () => {
      // Create config with max_toc_depth: 2
      const configWithMaxDepth = {
        ...mockConfig,
        max_toc_depth: 2,
      };
      const tocWithConfig = new TableOfContents(configWithMaxDepth);

      // Execute with max_depth: 3 parameter (should override config)
      const result = tocWithConfig.execute('multi-level-headers.md', 3);

      // Verify level 1, 2, and 3 sections are returned (parameter takes precedence)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(7); // Main title + 3 sections + 3 subsections

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
      });
    });

    it('should handle edge case max_depth of 0 by returning all sections (disabled)', () => {
      // Execute with max_depth: 0 (disabled)
      const result = tableOfContents.execute('multi-level-headers.md', 0);

      // Verify all sections are returned (same as no max depth)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(10); // All sections (0 means disabled)

      // Verify we have sections from all levels
      const levels = sections.map((s: any) => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
      expect(levels).toContain(5);
    });

    it('should respect config-level max_toc_depth when set to 0 (disabled)', () => {
      // Create config with max_toc_depth: 0 (disabled)
      const configWithZeroDepth = {
        ...mockConfig,
        max_toc_depth: 0,
      };
      const tocWithZeroConfig = new TableOfContents(configWithZeroDepth);

      // Execute without max_depth parameter
      const result = tocWithZeroConfig.execute('multi-level-headers.md');

      // Verify all sections are returned (0 in config means disabled)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(10); // All sections

      // Verify we have sections from all levels
      const levels = sections.map((s: any) => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
      expect(levels).toContain(5);
    });

    it('should work correctly with simple documents when max_depth is specified', () => {
      // Execute with simple document and max_depth
      const result = tableOfContents.execute('test-doc.md', 1);

      // Verify only level 1 sections are returned
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(3); // Introduction, Getting Started, Advanced Topics

      sections.forEach((section: any) => {
        expect(section.level).toBe(1);
      });
    });
  });

  describe('discount_single_top_header functionality', () => {
    it('should not affect max depth when discount_single_top_header is disabled (default)', () => {
      // Create config with discount_single_top_header: false (default)
      const configWithoutDiscount = {
        ...mockConfig,
        discount_single_top_header: false,
      };
      const tocWithoutDiscount = new TableOfContents(configWithoutDiscount);

      // Execute with single-top-header.md and max_depth: 2
      const result = tocWithoutDiscount.execute('single-top-header.md', 2);

      // Verify effective max depth is 2 (no discount applied)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(4); // Main title + 3 sections (levels 1 and 2)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
      });

      // Verify specific sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Main Title');
      expect(titles).toContain('Section 1');
      expect(titles).toContain('Section 2');
      expect(titles).toContain('Section 3');

      // Verify deeper sections are excluded
      expect(titles).not.toContain('Subsection 1.1');
      expect(titles).not.toContain('Subsection 2.1');
    });

    it('should increase effective max depth by 1 when discount_single_top_header is enabled and document has single top header', () => {
      // Create config with discount_single_top_header: true
      const configWithDiscount = {
        ...mockConfig,
        discount_single_top_header: true,
      };
      const tocWithDiscount = new TableOfContents(configWithDiscount);

      // Execute with single-top-header.md and max_depth: 2
      const result = tocWithDiscount.execute('single-top-header.md', 2);

      // Verify effective max depth is 3 (2 + 1 discount)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(6); // Main title + 3 sections + 2 subsections (levels 1, 2, and 3 due to discount)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
      });

      // Verify level 3 sections are included (only possible with discount)
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Main Title');
      expect(titles).toContain('Section 1');
      expect(titles).toContain('Section 2');
      expect(titles).toContain('Section 3');
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 2.1');

      // Verify level 4 sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });

    it('should increase effective max depth by 1 when discount_single_top_header is enabled and document has no top headers', () => {
      // Create config with discount_single_top_header: true
      const configWithDiscount = {
        ...mockConfig,
        discount_single_top_header: true,
      };
      const tocWithDiscount = new TableOfContents(configWithDiscount);

      // Execute with no-top-headers.md and max_depth: 2
      const result = tocWithDiscount.execute('no-top-headers.md', 2);

      // Verify effective max depth is 3 (2 + 1 discount)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(4); // 2 sections + 2 subsections (levels 2 and 3, but effectively 1 and 2 with discount)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
      });

      // Verify specific sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Section 1');
      expect(titles).toContain('Section 2');
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 2.1');

      // Verify level 4 sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });

    it('should not affect max depth when discount_single_top_header is enabled but document has multiple top headers', () => {
      // Create config with discount_single_top_header: true
      const configWithDiscount = {
        ...mockConfig,
        discount_single_top_header: true,
      };
      const tocWithDiscount = new TableOfContents(configWithDiscount);

      // Execute with multi-top-headers.md and max_depth: 2
      const result = tocWithDiscount.execute('multi-top-headers.md', 2);

      // Verify effective max depth is 2 (no discount applied due to multiple top headers)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(5); // 3 top sections + 2 subsections (levels 1 and 2 only)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
      });

      // Verify specific sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('First Top Section');
      expect(titles).toContain('Second Top Section');
      expect(titles).toContain('Third Top Section');
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 2.1');

      // Verify level 3 sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });

    it('should not affect behavior when max_depth is undefined even with discount_single_top_header enabled', () => {
      // Create config with discount_single_top_header: true
      const configWithDiscount = {
        ...mockConfig,
        discount_single_top_header: true,
      };
      const tocWithDiscount = new TableOfContents(configWithDiscount);

      // Execute with single-top-header.md without max_depth parameter
      const result = tocWithDiscount.execute('single-top-header.md');

      // Verify all sections are returned (no max depth limit)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(8); // All sections in the file

      // Verify we have sections from all levels
      const levels = sections.map((s: any) => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
    });

    it('should not affect behavior when max_depth is 0 (disabled) even with discount_single_top_header enabled', () => {
      // Create config with discount_single_top_header: true
      const configWithDiscount = {
        ...mockConfig,
        discount_single_top_header: true,
      };
      const tocWithDiscount = new TableOfContents(configWithDiscount);

      // Execute with single-top-header.md with max_depth: 0 (disabled)
      const result = tocWithDiscount.execute('single-top-header.md', 0);

      // Verify all sections are returned (max depth disabled)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(8); // All sections

      // Verify we have sections from all levels
      const levels = sections.map((s: any) => s.level);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
    });

    it('should work correctly with config-level max_toc_depth and discount_single_top_header', () => {
      // Create config with both max_toc_depth and discount_single_top_header
      const configWithBoth = {
        ...mockConfig,
        max_toc_depth: 2,
        discount_single_top_header: true,
      };
      const tocWithBoth = new TableOfContents(configWithBoth);

      // Execute with single-top-header.md without max_depth parameter
      const result = tocWithBoth.execute('single-top-header.md');

      // Verify effective max depth is 3 (config 2 + 1 discount)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(6); // Main title + 3 sections + 2 subsections (levels 1, 2, and 3)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
      });

      // Verify level 3 sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 2.1');

      // Verify level 4 sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });

    it('should prioritize parameter max_depth over config when discount_single_top_header is enabled', () => {
      // Create config with max_toc_depth and discount_single_top_header
      const configWithBoth = {
        ...mockConfig,
        max_toc_depth: 1,
        discount_single_top_header: true,
      };
      const tocWithBoth = new TableOfContents(configWithBoth);

      // Execute with single-top-header.md with max_depth: 2 parameter
      const result = tocWithBoth.execute('single-top-header.md', 2);

      // Verify effective max depth is 3 (parameter 2 + 1 discount, not config 1 + 1)
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(6); // Main title + 3 sections + 2 subsections (levels 1, 2, and 3)

      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(3);
      });

      // Verify level 3 sections are included
      const titles = sections.map((s: any) => s.title);
      expect(titles).toContain('Subsection 1.1');
      expect(titles).toContain('Subsection 2.1');

      // Verify level 4 sections are excluded
      expect(titles).not.toContain('Sub-subsection 1.1.1');
      expect(titles).not.toContain('Sub-subsection 2.1.1');
    });
  });

  // Configuration Compatibility Tests for refactoring
  describe('Configuration Compatibility', () => {
    it('should work with new configuration without pattern fields', () => {
      // Create config without pattern fields (post-refactoring config)
      const refactoredConfig = {
        documentation_path: fixturesPath,
        max_toc_depth: 5,
        discount_single_top_header: false,
      };

      const refactoredTool = new TableOfContents(refactoredConfig);
      const result = refactoredTool.execute('test-doc.md');

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle configuration with minimal required properties', () => {
      const minimalConfig = {
        documentation_path: fixturesPath,
      };

      const minimalTool = new TableOfContents(minimalConfig);
      const result = minimalTool.execute('test-doc.md');

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(Array.isArray(sections)).toBe(true);
    });

    it('should maintain backward compatibility with old configuration format', () => {
      // Ensure backward compatibility with configs that still have pattern fields
      const legacyConfig = {
        documentation_path: fixturesPath,
        exclude_patterns: ['node_modules/**'],
        include_patterns: ['**/*.md'],
      } as any;

      const legacyTool = new TableOfContents(legacyConfig);
      const result = legacyTool.execute('test-doc.md');

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBe(5); // All sections from test-doc.md
    });

    it('should respect discount_single_top_header configuration in refactored config', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
        discount_single_top_header: true,
      };

      const refactoredTool = new TableOfContents(refactoredConfig);
      const result = refactoredTool.execute('single-top-header.md', 2);

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBeGreaterThan(4); // Should include level 3 due to discount
    });

    it('should respect max_toc_depth configuration in refactored config', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
        max_toc_depth: 2,
      };

      const refactoredTool = new TableOfContents(refactoredConfig);
      const result = refactoredTool.execute('multi-level-headers.md');

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBe(4); // Should be limited to max_toc_depth
      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
      });
    });

    it('should handle boundary values for configuration parameters', () => {
      const boundaryConfigs = [
        {
          documentation_path: fixturesPath,
        },
        {
          documentation_path: fixturesPath,
        },
        {
          documentation_path: fixturesPath,
        },
      ];

      boundaryConfigs.forEach((config) => {
        const tool = new TableOfContents(config);

        // Should handle files correctly
        const result = tool.execute('test-doc.md');
        expect(result.content).toHaveLength(1);

        // Parse response to check if it's valid JSON
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      });
    });

    it('should handle error cases with refactored configuration', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
      };

      const refactoredTool = new TableOfContents(refactoredConfig);

      // Test file not found
      const result = refactoredTool.execute('nonexistent.md');
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');

      // Test invalid filename parameter
      const invalidResult = refactoredTool.execute('');
      expect(invalidResult.content).toHaveLength(1);
      const invalidErrorResponse = JSON.parse(invalidResult.content[0].text);
      expect(invalidErrorResponse.error.code).toBe('INVALID_PARAMETER');
    });
  });
});
