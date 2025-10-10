import * as fs from 'fs';
import * as path from 'path';
import { TableOfContents } from '../tools/TableOfContents';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';

// Mock the MarkdownParser module
jest.mock('../MarkdownParser');
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

describe('TableOfContents', () => {
  let tableOfContents: TableOfContents;
  let mockConfig: DocumentationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      documentation_path: './docs',
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
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Introduction\nContent here\n\n## Getting Started\nMore content',
        metadata: {},
      });

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [
          {
            id: 'introduction',
            title: 'Introduction',
            level: 1,
            character_count: 15,
          },
          {
            id: 'introduction/getting-started',
            title: 'Getting Started',
            level: 2,
            character_count: 12,
          },
        ],
        sectionMap: new Map(),
      });

      // Execute
      const result = tableOfContents.execute('test.md');

      // Verify
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('Introduction');
      expect(sections[1].title).toBe('Getting Started');
    });

    it('should return error when filename is not provided', () => {
      // Execute
      const result = tableOfContents.execute('');

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe('filename parameter is required');
    });

    it('should return error when filename is null', () => {
      // Execute
      const result = tableOfContents.execute(null as any);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
    });

    it('should handle file not found error', () => {
      // Setup mock
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: false,
        error: 'File not found',
      });

      // Execute
      const result = tableOfContents.execute('nonexistent.md');

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('PARSE_ERROR');
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
    });

    it('should handle file too large error', () => {
      // Setup mock
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: false,
        error: 'File too large',
      });

      // Execute
      const result = tableOfContents.execute('large.md');

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('PARSE_ERROR');
      expect(errorResponse.error.details.filename).toBe('large.md');
    });

    it('should handle parsing errors', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Execute
      const result = tableOfContents.execute('invalid.md');

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('PARSE_ERROR');
      expect(errorResponse.error.details.filename).toBe('invalid.md');
    });

    it('should handle empty sections', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 10 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: 'Just some text without headers',
        metadata: {},
      });

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap: new Map(),
      });

      // Execute
      const result = tableOfContents.execute('no-headers.md');

      // Verify empty sections array
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(0);
    });
  });

  describe('getTableOfContents', () => {
    it('should resolve file path correctly', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Test\nContent',
        metadata: {},
      });

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [{ id: 'test', title: 'Test', level: 1, character_count: 7 }],
        sectionMap: new Map(),
      });

      // Execute
      tableOfContents.execute('subdir/test.md');

      // Verify validateFile was called with resolved path
      expect(mockMarkdownParser.validateFile).toHaveBeenCalledWith(
        path.resolve('./docs', 'subdir/test.md'),
        10485760
      );
    });

    it('should handle nested sections correctly', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 2048 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Main\n## Sub1\n### SubSub\n## Sub2',
        metadata: {},
      });

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [
          { id: 'main', title: 'Main', level: 1, character_count: 25 },
          { id: 'main/sub1', title: 'Sub1', level: 2, character_count: 8 },
          { id: 'main/sub1/subsub', title: 'SubSub', level: 3, character_count: 7 },
          { id: 'main/sub2', title: 'Sub2', level: 2, character_count: 5 },
        ],
        sectionMap: new Map(),
      });

      // Execute
      const result = tableOfContents.execute('nested.md');

      // Verify nested structure
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(4);
      expect(sections[0].id).toBe('main');
      expect(sections[1].id).toBe('main/sub1');
      expect(sections[2].id).toBe('main/sub1/subsub');
      expect(sections[3].id).toBe('main/sub2');
    });
  });
});