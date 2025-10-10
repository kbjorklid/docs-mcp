import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';

// Mock the glob module
jest.mock('glob');
const mockGlob = glob as jest.MockedFunction<typeof glob>;

// Mock the MarkdownParser module
jest.mock('../MarkdownParser');
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

describe('ListDocumentationFiles', () => {
  let listDocumentationFiles: ListDocumentationFiles;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
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
      // Setup mocks
      mockGlob.mockResolvedValue(['test-doc.md', 'no-frontmatter.md']);
      
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile
        .mockReturnValueOnce({
          content: '',
          metadata: {
            title: 'Test Document',
            description: 'A test document',
            keywords: ['test', 'documentation'],
          },
        })
        .mockReturnValueOnce({
          content: '',
          metadata: {},
        });

      mockMarkdownParser.formatFileSize.mockReturnValue('1.0kb');

      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify
      expect(result.content).toHaveLength(1);
      const files = JSON.parse(result.content[0].text);
      expect(files).toHaveLength(2);
      
      expect(files[0]).toEqual({
        filename: 'test-doc.md',
        title: 'Test Document',
        description: 'A test document',
        keywords: ['test', 'documentation'],
        size: '1.0kb',
      });

      expect(files[1]).toEqual({
        filename: 'no-frontmatter.md',
        title: 'no-frontmatter',
        description: undefined,
        keywords: [],
        size: '1.0kb',
      });
    });

    it('should handle file system errors gracefully', async () => {
      // Setup mock to throw error
      mockGlob.mockRejectedValue(new Error('Permission denied'));

      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_SYSTEM_ERROR');
      expect(errorResponse.error.message).toBe('Error accessing documentation files');
    });

    it('should skip invalid files', async () => {
      // Setup mocks
      mockGlob.mockResolvedValue(['valid.md', 'invalid.md', 'large.md']);
      
      mockMarkdownParser.validateFile
        .mockReturnValueOnce({
          valid: true,
          stats: { size: 1024 } as fs.Stats,
        })
        .mockReturnValueOnce({
          valid: false,
          error: 'File not found',
        })
        .mockReturnValueOnce({
          valid: false,
          error: 'File too large',
        });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '',
        metadata: { title: 'Valid Document' },
      });

      mockMarkdownParser.formatFileSize.mockReturnValue('1.0kb');

      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify only valid file is returned
      const files = JSON.parse(result.content[0].text);
      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('valid.md');
    });

    it('should handle multiple include patterns', async () => {
      // Setup config with multiple patterns
      mockConfig.include_patterns = ['docs/**/*.md', 'guides/**/*.md'];
      listDocumentationFiles = new ListDocumentationFiles(mockConfig);

      mockGlob
        .mockResolvedValueOnce(['doc1.md'])
        .mockResolvedValueOnce(['guide1.md']);

      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 512 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '',
        metadata: { title: 'Test' },
      });

      mockMarkdownParser.formatFileSize.mockReturnValue('0.5kb');

      // Execute
      await listDocumentationFiles.execute();

      // Verify glob was called with both patterns
      expect(mockGlob).toHaveBeenCalledTimes(2);
      expect(mockGlob).toHaveBeenNthCalledWith(1, 'docs/**/*.md', expect.any(Object));
      expect(mockGlob).toHaveBeenNthCalledWith(2, 'guides/**/*.md', expect.any(Object));
    });
  });

  describe('processFile', () => {
    it('should normalize path separators', async () => {
      // Setup mocks
      mockGlob.mockResolvedValue(['subdir\\file.md']);
      
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '',
        metadata: { title: 'File Title' },
      });

      mockMarkdownParser.formatFileSize.mockReturnValue('1.0kb');

      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify path is normalized
      const files = JSON.parse(result.content[0].text);
      expect(files[0].filename).toBe('subdir/file.md');
    });

    it('should use filename as title when no title in metadata', async () => {
      // Setup mocks
      mockGlob.mockResolvedValue(['document.md']);
      
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '',
        metadata: {},
      });

      mockMarkdownParser.formatFileSize.mockReturnValue('1.0kb');

      // Execute
      const result = await listDocumentationFiles.execute();

      // Verify title fallback
      const files = JSON.parse(result.content[0].text);
      expect(files[0].title).toBe('document');
    });
  });
});