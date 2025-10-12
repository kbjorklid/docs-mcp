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
      documentation_path: fixturesPath,
      max_toc_depth: 5,
      discount_single_top_header: false,
    };

    readSections = new ReadSections(mockConfig);
  });

  describe('execute', () => {
    it('should return content for valid sections', () => {
      // Execute with test-doc.md and known sections
      const result = readSections.execute('test-doc.md', [
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
      const result = readSections.execute('test-doc.md', ['nonexistent']);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [nonexistent] not found in 'test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.filename).toBe('test-doc.md');
      expect(errorResponse.error.details.missing_sections).toEqual([
        'nonexistent',
      ]);
    });

    it('should handle multiple missing sections', () => {
      // Execute with multiple non-existent sections
      const result = readSections.execute('test-doc.md', [
        'missing1',
        'missing2',
      ]);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [missing1, missing2] not found in 'test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.missing_sections).toEqual([
        'missing1',
        'missing2',
      ]);
    });

    it('should handle partial section matches', () => {
      // Execute with one existing and one non-existent section
      const result = readSections.execute('test-doc.md', [
        'introduction',
        'missing',
      ]);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe(
        "Sections [missing] not found in 'test-doc.md'. Use the table_of_contents tool to see available sections."
      );
      expect(errorResponse.error.details.missing_sections).toEqual(['missing']);
    });

    it('should provide guidance about table_of_contents tool in error message', () => {
      // Execute with non-existent section
      const result = readSections.execute('test-doc.md', ['unknown-section']);

      // Verify error response contains guidance
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toContain('table_of_contents tool');
      expect(errorResponse.error.message).toContain('see available sections');
    });
  });

  describe('readSections', () => {
    it('should handle single section request', () => {
      // Execute with single section
      const result = readSections.execute('test-doc.md', ['introduction']);

      // Verify single section returned
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('introduction');
      expect(sections[0].content).toContain('This is the introduction section');
    });

    it('should handle nested sections', () => {
      // Execute with nested-sections.md
      const result = readSections.execute('nested-sections.md', [
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
      const result = readSections.execute('no-frontmatter.md', [
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
        documentation_path: fixturesPath,
        max_toc_depth: 5,
        discount_single_top_header: false,
      };

      const refactoredTool = new ReadSections(refactoredConfig);
      const result = refactoredTool.execute('test-doc.md', ['introduction']);

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('introduction');
    });

    it('should handle configuration with minimal required properties', () => {
      const minimalConfig = {
        documentation_path: fixturesPath,
      };

      const minimalTool = new ReadSections(minimalConfig);
      const result = minimalTool.execute('test-doc.md', ['introduction']);

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections[0].title).toBe('introduction');
    });

    it('should maintain backward compatibility with old configuration format', () => {
      // Ensure backward compatibility with configs that still have pattern fields
      const legacyConfig = {
        documentation_path: fixturesPath,
        exclude_patterns: ['node_modules/**'],
        include_patterns: ['**/*.md'],
      } as any;

      const legacyTool = new ReadSections(legacyConfig);
      const result = legacyTool.execute('test-doc.md', ['introduction', 'getting-started']);

      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections.length).toBe(2);
      expect(sections[0].title).toBe('introduction');
      expect(sections[1].title).toBe('getting-started');
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
        const tool = new ReadSections(config);

        // Should handle files correctly
        const result = tool.execute('test-doc.md', ['introduction']);
        expect(result.content).toHaveLength(1);

        // Parse response to check if it's valid JSON
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      });
    });

    it('should handle error cases with refactored configuration', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
      };

      const refactoredTool = new ReadSections(refactoredConfig);

      // Test file not found
      const result = refactoredTool.execute('nonexistent.md', ['section1']);
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');

      // Test invalid filename parameter
      const invalidResult = refactoredTool.execute('', ['section1']);
      expect(invalidResult.content).toHaveLength(1);
      const invalidErrorResponse = JSON.parse(invalidResult.content[0].text);
      expect(invalidErrorResponse.error.code).toBe('INVALID_PARAMETER');

      // Test invalid section_ids parameter
      const invalidSectionResult = refactoredTool.execute('test-doc.md', []);
      expect(invalidSectionResult.content).toHaveLength(1);
      const invalidSectionErrorResponse = JSON.parse(invalidSectionResult.content[0].text);
      expect(invalidSectionErrorResponse.error.code).toBe('INVALID_PARAMETER');
    });

    it('should handle section not found errors with refactored configuration', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
      };

      const refactoredTool = new ReadSections(refactoredConfig);

      // Test single missing section
      const singleMissingResult = refactoredTool.execute('test-doc.md', ['nonexistent']);
      expect(singleMissingResult.content).toHaveLength(1);
      const singleMissingError = JSON.parse(singleMissingResult.content[0].text);
      expect(singleMissingError.error.code).toBe('SECTION_NOT_FOUND');
      expect(singleMissingError.error.details.missing_sections).toEqual(['nonexistent']);

      // Test multiple missing sections
      const multipleMissingResult = refactoredTool.execute('test-doc.md', ['missing1', 'missing2']);
      expect(multipleMissingResult.content).toHaveLength(1);
      const multipleMissingError = JSON.parse(multipleMissingResult.content[0].text);
      expect(multipleMissingError.error.code).toBe('SECTION_NOT_FOUND');
      expect(multipleMissingError.error.details.missing_sections).toEqual(['missing1', 'missing2']);
    });

    it('should handle complex section requests with refactored configuration', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
      };

      const refactoredTool = new ReadSections(refactoredConfig);

      // Test nested sections
      const nestedResult = refactoredTool.execute('nested-sections.md', ['main-section/subsection-one']);
      expect(nestedResult.content).toHaveLength(1);
      const nestedSections = JSON.parse(nestedResult.content[0].text);
      expect(nestedSections[0].title).toBe('main-section/subsection-one');

      // Test file without frontmatter
      const noFrontmatterResult = refactoredTool.execute('no-frontmatter.md', ['simple-document']);
      expect(noFrontmatterResult.content).toHaveLength(1);
      const noFrontmatterSections = JSON.parse(noFrontmatterResult.content[0].text);
      expect(noFrontmatterSections[0].title).toBe('simple-document');
    });

    it('should maintain error detail structure with refactored configuration', () => {
      const refactoredConfig = {
        documentation_path: fixturesPath,
      };

      const refactoredTool = new ReadSections(refactoredConfig);

      const result = refactoredTool.execute('nonexistent.md', ['section1']);
      const errorResponse = JSON.parse(result.content[0].text);

      // Verify error detail structure is maintained
      expect(errorResponse.error.details).toBeDefined();
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
      expect(errorResponse.error.details.search_path).toBe(fixturesPath);
    });
  });
});
