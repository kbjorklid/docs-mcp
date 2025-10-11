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
        'filename parameter is required'
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

    it('should handle file not found error', () => {
      // Execute with non-existent file
      const result = tableOfContents.execute('nonexistent.md');

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('PARSE_ERROR');
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
    });

    it('should handle empty sections', () => {
      // Execute with file that has no headers
      const result = tableOfContents.execute('empty-sections.md');

      // Verify empty sections array
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(0);
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
});
