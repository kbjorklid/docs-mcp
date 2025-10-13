import * as path from 'path';
import { ReadSections } from '../tools/ReadSections';
import { DocumentationConfig } from '../types';

describe('ReadSections', () => {
  let readSections: ReadSections;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    mockConfig = {
      documentationPath: fixturesPath,
      maxTocDepth: 5,
      discountSingleTopHeader: false,
    };

    readSections = new ReadSections(mockConfig);
  });

  describe('execute', () => {
    it('should return content for valid sections', () => {
      // Execute with test-doc.md and known sections
      const result = readSections.execute('shared/test-doc.md', [
        'introduction',
        'getting-started',
      ]);

      // Verify
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('introduction');
      expect(sections[1].title).toBe('getting-started');
      expect(sections[0].content).toContain('This is the introduction section');
      expect(sections[1].content).toContain(
        'This is the getting started section'
      );
    });

    it('should return error when filename is not provided', () => {
      // Execute
      const result = readSections.execute('', ['section1']);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe(
        'filename parameter is required'
      );
    });

    it('should return error when section_ids is not provided', () => {
      // Execute
      const result = readSections.execute('test.md', null as any);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe(
        'section_ids parameter must be a non-empty array'
      );
    });

    it('should return error when section_ids is empty array', () => {
      // Execute
      const result = readSections.execute('test.md', []);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe(
        'section_ids parameter must be a non-empty array'
      );
    });

    it('should return error when section_ids is not an array', () => {
      // Execute
      const result = readSections.execute('test.md', 'not-an-array' as any);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe(
        'section_ids parameter must be a non-empty array'
      );
    });

    it('should handle file not found error', () => {
      // Execute with non-existent file
      const result = readSections.execute('nonexistent.md', ['section1']);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        'The specified file was not found'
      );
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
      expect(errorResponse.error.details.search_path).toBe(fixturesPath);
    });

    it('should handle section not found error with helpful message', () => {
      // Execute with non-existent section
      const result = readSections.execute('shared/test-doc.md', ['nonexistent']);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [nonexistent] not found in 'shared/test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.filename).toBe('shared/test-doc.md');
      expect(errorResponse.error.details.missing_sections).toEqual([
        'nonexistent',
      ]);
    });

    it('should handle multiple missing sections', () => {
      // Execute with multiple non-existent sections
      const result = readSections.execute('shared/test-doc.md', [
        'missing1',
        'missing2',
      ]);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [missing1, missing2] not found in 'shared/test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.missing_sections).toEqual([
        'missing1',
        'missing2',
      ]);
    });

    it('should handle partial section matches', () => {
      // Execute with one existing and one non-existent section
      const result = readSections.execute('shared/test-doc.md', [
        'introduction',
        'missing',
      ]);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [missing] not found in 'shared/test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.missing_sections).toEqual(['missing']);
    });

  });

  describe('readSections', () => {
    it('should handle single section request', () => {
      // Execute with single section
      const result = readSections.execute('shared/test-doc.md', ['introduction']);

      // Verify single section returned
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('introduction');
      expect(sections[0].content).toContain('This is the introduction section');
    });

    it('should handle nested sections', () => {
      // Execute with nested-sections.md
      const result = readSections.execute('table-of-contents/nested-sections.md', [
        'main-section/subsection-one',
      ]);

      // Verify nested section is returned
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('main-section/subsection-one');
      expect(sections[0].content).toContain('Content for subsection one');
    });

    it('should handle file without frontmatter', () => {
      // Execute with no-frontmatter.md
      const result = readSections.execute('shared/no-frontmatter.md', [
        'simple-document',
      ]);

      // Verify section is returned correctly
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('simple-document');
      expect(sections[0].content).toContain(
        'This document has no front matter'
      );
    });
  });

  // Configuration Compatibility Tests for refactoring
  describe('Configuration Compatibility', () => {
    it('should work with new configuration without pattern fields', () => {
      // Create config without pattern fields (post-refactoring config)
      const refactoredConfig = {
        documentationPath: fixturesPath,
        maxTocDepth: 5,
        discountSingleTopHeader: false,
      };

      const refactoredTool = new ReadSections(refactoredConfig);
      const result = refactoredTool.execute('shared/test-doc.md', ['introduction']);

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('introduction');
    });
  });
});
