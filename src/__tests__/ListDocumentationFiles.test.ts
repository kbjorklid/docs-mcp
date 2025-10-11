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
      auto_index: true,
      index_refresh_interval: 300,
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
      expect(files).toHaveLength(4); // All fixture files
      
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
      const noFrontmatter = files.find((f: any) => f.filename === 'no-frontmatter.md');
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
      const invalidListDocumentationFiles = new ListDocumentationFiles(invalidConfig);

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
      const multiPatternListDocumentationFiles = new ListDocumentationFiles(multiPatternConfig);

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
  });
});