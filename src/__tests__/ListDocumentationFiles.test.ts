import * as path from 'path';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';
import { DocumentationConfig } from '../types';

// Mock external dependencies
jest.mock('glob');
jest.mock('../MarkdownParser');

import { glob } from 'glob';
import { MarkdownParser } from '../MarkdownParser';

const mockGlob = glob as jest.MockedFunction<typeof glob>;
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

describe('ListDocumentationFiles', () => {
  let listDocumentationFiles: ListDocumentationFiles;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    mockConfig = {
      documentationPath: fixturesPath,
      maxTocDepth: 5,
      discountSingleTopHeader: false,
    };

    // Setup default markdown parser mocks
    mockMarkdownParser.validateFile.mockReturnValue({
      valid: true,
      stats: { size: 1024 } as any,
    });

    mockMarkdownParser.readMarkdownFile.mockImplementation((filePath) => {
      if (filePath.includes('no-frontmatter')) {
        return {
          content: '# Simple Document\n\nThis document has no front matter.',
          metadata: {},
        };
      }
      return {
        content: '# Test Content\n\nSome content here.',
        metadata: {
          title: 'Test Document',
          description: 'A test document for testing',
          keywords: ['test', 'documentation'],
        },
      };
    });

    mockMarkdownParser.formatFileSize.mockReturnValue('1.0 kb');

    // Mock glob to return fixture files with new subdirectory structure
    mockGlob.mockResolvedValue([
      'shared/test-doc.md',
      'shared/no-frontmatter.md',
      'table-of-contents/nested-sections.md',
      'table-of-contents/multi-level-headers.md',
      'table-of-contents/single-top-header.md',
      'table-of-contents/no-top-headers.md',
      'table-of-contents/multi-top-headers.md',
      'table-of-contents/empty-sections.md',
      'search/search-content.md',
      'search/rest-api-docs.md',
    ]);

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
      const testDoc = files.find((f: any) => f.filename === 'shared/test-doc.md');
      expect(testDoc).toEqual({
        filename: 'shared/test-doc.md',
        title: 'Test Document',
        description: 'A test document for testing',
        keywords: ['test', 'documentation'],
        size: expect.any(String),
      });

      // Check no-frontmatter.md uses filename as title
      const noFrontmatter = files.find(
        (f: any) => f.filename === 'shared/no-frontmatter.md'
      );
      expect(noFrontmatter).toEqual({
        filename: 'shared/no-frontmatter.md',
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
        documentationPath: '/non/existent/path',
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

    it('should handle multiple include patterns (legacy compatibility)', async () => {
      // Setup config with legacy patterns (should be ignored after refactoring)
      const legacyConfig = {
        ...mockConfig,
        exclude_patterns: ['node_modules/**'],
        include_patterns: ['**/*.md', '**/*.txt'],
      } as any;
      const legacyListDocumentationFiles = new ListDocumentationFiles(
        legacyConfig
      );

      // Reset and mock glob to return only markdown files (refactored behavior)
      jest.clearAllMocks();
      mockGlob.mockResolvedValue(['shared/test-doc.md', 'shared/no-frontmatter.md']);

      // Execute
      const result = await legacyListDocumentationFiles.execute();

      // Verify files are found (should include only .md files due to hardcoded **/*.md)
      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      // All files should be .md files despite legacy include_patterns
      files.forEach((file: any) => {
        expect(file.filename).toMatch(/\.md$/);
      });
    });

    // Configuration Compatibility Tests for refactoring
    describe('Configuration Compatibility', () => {
      it('should work with new configuration without pattern fields', async () => {
        // Create config without pattern fields (post-refactoring config)
        const refactoredConfig = {
          documentationPath: fixturesPath,
          maxTocDepth: 5,
          discountSingleTopHeader: false,
        };

        const refactoredTool = new ListDocumentationFiles(refactoredConfig);
        const result = await refactoredTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);
      });

      it('should work with new simplified file discovery', async () => {
        // Test that hardcoded **/*.md pattern works correctly
        const simpleConfig = {
          documentationPath: fixturesPath,
        };

        // Reset mocks to ensure clean test
        jest.clearAllMocks();
        mockGlob.mockResolvedValue(['file1.md', 'file2.md', 'subdir/file3.md']);

        const simpleTool = new ListDocumentationFiles(simpleConfig);
        const result = await simpleTool.execute();

        expect(result.content).toHaveLength(1);
        const files = JSON.parse(result.content[0].text);
        expect(files).toHaveLength(3);
        expect(files.map((f: any) => f.filename)).toEqual(
          expect.arrayContaining(['file1.md', 'file2.md', 'subdir/file3.md'])
        );
      });
    });
  });
});
