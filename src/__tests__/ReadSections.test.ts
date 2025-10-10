import * as fs from 'fs';
import * as path from 'path';
import { ReadSections } from '../tools/ReadSections';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';

// Mock the MarkdownParser module
jest.mock('../MarkdownParser');
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

describe('ReadSections', () => {
  let readSections: ReadSections;
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

    readSections = new ReadSections(mockConfig);
  });

  describe('execute', () => {
    it('should return content for valid sections', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Introduction\nContent here\n\n## Getting Started\nMore content',
        metadata: {},
      });

      const sectionMap = new Map([
        ['introduction', { start: 0, end: 1 }],
        ['introduction/getting-started', { start: 2, end: 3 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      mockMarkdownParser.readSectionsFromContent.mockReturnValue([
        {
          title: 'Introduction',
          content: '# Introduction\nContent here',
        },
        {
          title: 'Getting Started',
          content: '## Getting Started\nMore content',
        },
      ]);

      // Execute
      const result = readSections.execute('test.md', ['introduction', 'introduction/getting-started']);

      // Verify
      expect(result.content).toHaveLength(1);
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('Introduction');
      expect(sections[1].title).toBe('Getting Started');
    });

    it('should return error when filename is not provided', () => {
      // Execute
      const result = readSections.execute('', ['section1']);

      // Verify error response
      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe('filename parameter is required');
    });

    it('should return error when section_ids is not provided', () => {
      // Execute
      const result = readSections.execute('test.md', null as any);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe('section_ids parameter must be a non-empty array');
    });

    it('should return error when section_ids is empty array', () => {
      // Execute
      const result = readSections.execute('test.md', []);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe('section_ids parameter must be a non-empty array');
    });

    it('should return error when section_ids is not an array', () => {
      // Execute
      const result = readSections.execute('test.md', 'not-an-array' as any);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      expect(errorResponse.error.message).toBe('section_ids parameter must be a non-empty array');
    });

    it('should handle file not found error', () => {
      // Setup mock
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: false,
        error: 'File not found',
      });

      // Execute
      const result = readSections.execute('nonexistent.md', ['section1']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResponse.error.message).toBe('The specified file was not found');
      expect(errorResponse.error.details.filename).toBe('nonexistent.md');
      expect(errorResponse.error.details.search_path).toBe('./docs');
    });

    it('should handle file too large error', () => {
      // Setup mock
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: false,
        error: 'File too large',
      });

      // Execute
      const result = readSections.execute('large.md', ['section1']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_TOO_LARGE');
      expect(errorResponse.error.message).toBe('File exceeds size limits');
      expect(errorResponse.error.details.filename).toBe('large.md');
      expect(errorResponse.error.details.max_size).toBe(10485760);
    });

    it('should handle section not found error', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Introduction\nContent',
        metadata: {},
      });

      const sectionMap = new Map([
        ['introduction', { start: 0, end: 1 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      // Execute with non-existent section
      const result = readSections.execute('test.md', ['nonexistent']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.message).toBe('One or more requested sections were not found');
      expect(errorResponse.error.details.filename).toBe('test.md');
      expect(errorResponse.error.details.missing_sections).toEqual(['nonexistent']);
    });

    it('should handle multiple missing sections', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Introduction\nContent',
        metadata: {},
      });

      const sectionMap = new Map([
        ['introduction', { start: 0, end: 1 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      // Execute with multiple non-existent sections
      const result = readSections.execute('test.md', ['missing1', 'missing2']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.details.missing_sections).toEqual(['missing1', 'missing2']);
    });

    it('should handle partial section matches', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Section1\nContent1\n\n# Section2\nContent2',
        metadata: {},
      });

      const sectionMap = new Map([
        ['section1', { start: 0, end: 1 }],
        ['section2', { start: 2, end: 3 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      // Execute with one existing and one non-existent section
      const result = readSections.execute('test.md', ['section1', 'missing']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorResponse.error.details.missing_sections).toEqual(['missing']);
    });

    it('should handle generic parsing errors', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
        throw new Error('Generic parse error');
      });

      // Execute
      const result = readSections.execute('test.md', ['section1']);

      // Verify error response
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('PARSE_ERROR');
      expect(errorResponse.error.message).toBe('Error parsing markdown file');
      expect(errorResponse.error.details.filename).toBe('test.md');
    });
  });

  describe('readSections', () => {
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
        sectionMap: new Map([['test', { start: 0, end: 1 }]]),
      });

      mockMarkdownParser.readSectionsFromContent.mockReturnValue([{
        title: 'Test',
        content: '# Test\nContent',
      }]);

      // Execute
      readSections.execute('subdir/test.md', ['test']);

      // Verify validateFile was called with resolved path
      expect(mockMarkdownParser.validateFile).toHaveBeenCalledWith(
        path.resolve('./docs', 'subdir/test.md'),
        10485760
      );
    });

    it('should pass correct parameters to readSectionsFromContent', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 1024 } as fs.Stats,
      });

      const content = '# Section1\nContent1\n\n# Section2\nContent2';
      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content,
        metadata: {},
      });

      const sectionMap = new Map([
        ['section1', { start: 0, end: 1 }],
        ['section2', { start: 2, end: 3 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      mockMarkdownParser.readSectionsFromContent.mockReturnValue([
        { title: 'Section1', content: '# Section1\nContent1' },
      ]);

      // Execute
      readSections.execute('test.md', ['section1']);

      // Verify correct parameters were passed
      expect(mockMarkdownParser.readSectionsFromContent).toHaveBeenCalledWith(
        content,
        ['section1'],
        sectionMap
      );
    });

    it('should handle single section request', () => {
      // Setup mocks
      mockMarkdownParser.validateFile.mockReturnValue({
        valid: true,
        stats: { size: 512 } as fs.Stats,
      });

      mockMarkdownParser.readMarkdownFile.mockReturnValue({
        content: '# Only Section\nContent here',
        metadata: {},
      });

      const sectionMap = new Map([
        ['only-section', { start: 0, end: 1 }],
      ]);

      mockMarkdownParser.parseMarkdownSections.mockReturnValue({
        sections: [],
        sectionMap,
      });

      mockMarkdownParser.readSectionsFromContent.mockReturnValue([{
        title: 'Only Section',
        content: '# Only Section\nContent here',
      }]);

      // Execute
      const result = readSections.execute('single.md', ['only-section']);

      // Verify single section returned
      const sections = JSON.parse(result.content[0].text);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Only Section');
    });


  });
});