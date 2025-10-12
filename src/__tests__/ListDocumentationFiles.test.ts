import * as path from 'path';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';
import { DocumentationConfig } from '../types';

describe('ListDocumentationFiles', () => {
  let listDocumentationFiles: ListDocumentationFiles;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    mockConfig = {
      documentation_path: fixturesPath,
      max_file_size: 10485760,
      exclude_patterns: ['node_modules/**'],
      include_patterns: ['**/*.md'],
    };

    listDocumentationFiles = new ListDocumentationFiles(mockConfig);
  });

  describe('execute', () => {
    it('should return list of documentation files with metadata', async () => {
      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify
      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(files.length).toBeGreaterThan(5); // All fixture files

      // Check test-doc.md has proper metadata
      const testDoc = files.find((f: any) => f.filename === 'test-doc.md');
      expect(testDoc).toEqual({
        filename: 'test-doc.md',
        title: 'Test Document',
        description: 'A test document for testing',
        keywords: ['test', 'documentation'],
        size: expect.any(String),
      });

      // Check no-frontmatter.md uses filename as title
      const noFrontmatter = files.find(
        (f: any) => f.filename === 'no-frontmatter.md'
      );
      expect(noFrontmatter).toEqual({
        filename: 'no-frontmatter.md',
        title: 'no-frontmatter',
        description: undefined,
        keywords: [],
        size: expect.any(String),
      });
    });

    it('should handle file system errors gracefully', async () => {
      // Create config with non-existent path
      const invalidConfig = {
        ...mockConfig,
        documentation_path: '/non/existent/path',
      };
      const invalidListDocumentationFiles = new ListDocumentationFiles(
        invalidConfig
      );

      // Execute
      const result = await invalidListDocumentationFiles.execute();

      // Verify error response - the tool should return an empty array for non-existent paths
      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(Array.isArray(files)).toBe(true);
    });

    it('should handle multiple include patterns', async () => {
      // Setup config with multiple patterns
      const multiPatternConfig = {
        ...mockConfig,
        include_patterns: ['**/*.md', '**/*.txt'],
      };
      const multiPatternListDocumentationFiles = new ListDocumentationFiles(
        multiPatternConfig
      );

      // Execute
      const result = await multiPatternListDocumentationFiles.execute();

      // Verify files are found (should include all .md files)
      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      // All files should be .md files from fixtures
      files.forEach((file: any) => {
        expect(file.filename).toMatch(/\.md$/);
      });
    });

    // Tool Compatibility Tests for refactoring
    describe('Configuration Compatibility', () => {
      it('should work with configuration without auto_index and index_refresh_interval', async () => {
        // Create config without the unused properties (simulating post-refactoring config)
        const refactoredConfig = {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          exclude_patterns: ['node_modules/**'],
          include_patterns: ['**/*.md'],
          max_toc_depth: 5,
          discount_single_top_header: false,
        };

        // Should still work with the tool even without the unused properties
        const refactoredTool = new ListDocumentationFiles(refactoredConfig as any);
        const result = await refactoredTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);
      });

      it('should handle configuration with minimal required properties', async () => {
        const minimalConfig = {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          exclude_patterns: [],
          include_patterns: ['**/*.md'],
        };

        const minimalTool = new ListDocumentationFiles(minimalConfig as any);
        const result = await minimalTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(Array.isArray(files)).toBe(true);
      });

      it('should maintain functionality with current configuration format', async () => {
        // Ensure backward compatibility
        const currentConfig = {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          exclude_patterns: ['node_modules/**'],
          include_patterns: ['**/*.md'],
        };

        const currentTool = new ListDocumentationFiles(currentConfig);
        const result = await currentTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(files.length).toBeGreaterThan(5);
      });

      it('should handle boundary values for configuration parameters', async () => {
        const boundaryConfigs = [
          {
            documentation_path: fixturesPath,
            max_file_size: 0, // Minimum - no files should pass
            exclude_patterns: [],
            include_patterns: ['**/*.md'],
          },
          {
            documentation_path: fixturesPath,
            max_file_size: 1, // Very small - only tiny files should pass
            exclude_patterns: [],
            include_patterns: ['**/*.md'],
          },
          {
            documentation_path: fixturesPath,
            max_file_size: Number.MAX_SAFE_INTEGER, // Very large - all files should pass
            exclude_patterns: [],
            include_patterns: ['**/*.md'],
          },
        ];

        for (const config of boundaryConfigs) {
          const tool = new ListDocumentationFiles(config as any);
          const result = await tool.execute();

          expect(result.content).toHaveLength(1);
          const files = JSON.parse(result.content[0].text);
          expect(Array.isArray(files)).toBe(true);
          // Files may be empty for very small max_file_size, which is expected
        }
      });

      it('should handle complex pattern configurations', async () => {
        const complexConfig = {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          exclude_patterns: ['**/test-*.md', '**/empty.md'],
          include_patterns: ['**/*.md'],
        };

        const complexTool = new ListDocumentationFiles(complexConfig as any);
        const result = await complexTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(Array.isArray(files)).toBe(true);

        // Verify excluded files are not present
        const testFiles = files.filter((f: any) => f.filename.startsWith('test-'));
        const emptyFiles = files.filter((f: any) => f.filename === 'empty.md');
        expect(testFiles).toHaveLength(0);
        expect(emptyFiles).toHaveLength(0);
      });
    });
  });
});
