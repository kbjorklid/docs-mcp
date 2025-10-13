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

describe('ListDocumentationFiles Edge Cases', () => {
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

    // Mock glob to return fixture files
    mockGlob.mockResolvedValue([
      'shared/test-doc.md',
      'shared/no-frontmatter.md',
      'table-of-contents/nested-sections.md',
    ]);

    listDocumentationFiles = new ListDocumentationFiles(mockConfig);
  });

  describe('Edge Cases Not Covered by E2E Tests', () => {
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

    it('should handle legacy configuration patterns gracefully', async () => {
      // Test that legacy configurations are handled without breaking
      const legacyConfig = {
        documentationPath: fixturesPath,
        maxTocDepth: 5,
        discountSingleTopHeader: false,
        // These legacy fields should be ignored
        exclude_patterns: ['node_modules/**'] as any,
        include_patterns: ['**/*.md', '**/*.txt'] as any,
      };

      const legacyListDocumentationFiles = new ListDocumentationFiles(legacyConfig);
      const result = await legacyListDocumentationFiles.execute();

      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);

      // Should still only return .md files due to hardcoded pattern
      files.forEach((file: any) => {
        expect(file.filename).toMatch(/\.md$/);
      });
    });

    it('should handle configuration compatibility after refactoring', async () => {
      // Test that simplified configuration works correctly
      const simpleConfig = {
        documentationPath: fixturesPath,
      };

      const simpleTool = new ListDocumentationFiles(simpleConfig);
      const result = await simpleTool.execute();

      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });
  });
});