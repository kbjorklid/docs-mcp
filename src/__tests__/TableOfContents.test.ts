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
      auto_index: true,
      index_refresh_interval: 300,
      max_file_size: 10485760,
      exclude_patterns: ['node_modules/**'],
      include_patterns: ['**/*.md'],
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
});
