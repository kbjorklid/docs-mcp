import * as path from 'path';
import { Search } from '../tools/Search';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';

// Mock dependencies
jest.mock('../MarkdownParser');
jest.mock('../tools/ListDocumentationFiles');

const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;
const mockListDocumentationFiles = ListDocumentationFiles as jest.MockedClass<typeof ListDocumentationFiles>;

describe('Search', () => {
  let search: Search;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;
  let mockListDocsInstance: jest.Mocked<ListDocumentationFiles>;

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

    search = new Search(mockConfig);

    // Mock ListDocumentationFiles instance
    mockListDocsInstance = {
      execute: jest.fn(),
    } as any;
    mockListDocumentationFiles.mockImplementation(() => mockListDocsInstance);

    // Mock MarkdownParser static methods
    mockMarkdownParser.validateFile.mockReturnValue({
      valid: true,
      stats: { size: 1024 } as any,
    });
    mockMarkdownParser.readMarkdownFile.mockReturnValue({
      content: '',
      metadata: {},
    });
    mockMarkdownParser.parseMarkdownSections.mockReturnValue({
      sections: [],
      sectionMap: new Map(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = Search.getToolDefinition();

      expect(definition.name).toBe('search');
      expect(definition.description).toContain('exact text matches');
      expect(definition.description).toContain('simple exact phrase searches');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties.query).toBeDefined();
      expect(definition.inputSchema.properties.filename).toBeDefined();
      expect(definition.inputSchema.required).toEqual(['query']);
    });
  });

  describe('execute', () => {
    describe('Parameter Validation', () => {
      it('should return error for empty query', async () => {
        const result = await search.execute('');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('query parameter is required and cannot be empty.');
      });

      it('should return error for whitespace-only query', async () => {
        const result = await search.execute('   ');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should return error for null query', async () => {
        const result = await search.execute(null as any);

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should return error for undefined query', async () => {
        const result = await search.execute(undefined as any);

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should trim whitespace from valid query', async () => {
        // Setup mock for multi-file search
        mockListDocsInstance.execute.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                files: [
                  { path: 'test.md', filename: 'test.md', title: 'Test File' },
                ],
              }),
            },
          ],
        });

        // Mock file content that contains the search term
        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content: 'Test content with search term',
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 10 },
          ],
          sectionMap: new Map([['section1', { start: 0, end: 0 }]]),
        });

        const result = await search.execute('  search term  ');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.query).toBe('search term');
        expect(searchResponse.results).toHaveLength(1);
        expect(searchResponse.results[0].filename).toBe('test.md');
      });
    });

    describe('Single File Search', () => {
      it('should return matches when content contains search term', async () => {
        const content = `# Test Section
This section contains the search term "database connection" which should be found.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'test-section', title: 'Test Section', level: 1, character_count: 20 },
          ],
          sectionMap: new Map([['test-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('database connection', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.query).toBe('database connection');
        expect(searchResponse.results).toHaveLength(1);
        expect(searchResponse.results[0].filename).toBe('test.md');
        expect(searchResponse.results[0].matches).toHaveLength(1);
        expect(searchResponse.results[0].matches[0].id).toBe('test-section');
      });

      it('should return matches when header contains search term', async () => {
        const content = `# Search Testing Section
This is the content of the section.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'search-testing-section', title: 'Search Testing Section', level: 1, character_count: 15 },
          ],
          sectionMap: new Map([['search-testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('search testing', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
        expect(searchResponse.results[0].matches[0].title).toBe('Search Testing Section');
      });

      it('should be case-insensitive', async () => {
        const content = `# JavaScript Testing
This section contains the term JavaScript.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'javascript-testing', title: 'JavaScript Testing', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['javascript-testing', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('javascript', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should return multiple matches in same file', async () => {
        const content = `# First Section
This section contains the search term.
# Second Section
This section also contains the search term.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'first-section', title: 'First Section', level: 1, character_count: 15 },
            { id: 'second-section', title: 'Second Section', level: 1, character_count: 15 },
          ],
          sectionMap: new Map([
            ['first-section', { start: 0, end: 1 }],
            ['second-section', { start: 2, end: 3 }],
          ]),
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(2);
      });

      it('should return empty results when no matches found', async () => {
        const content = `# Test Section
This section does not contain the search term.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'test-section', title: 'Test Section', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['test-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('nonexistent term', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results).toHaveLength(1);
        expect(searchResponse.results[0].matches).toHaveLength(0);
      });
    });

    describe('Multiple Files Search', () => {
      it('should search across all files when filename not specified', async () => {
        // Mock ListDocumentationFiles response
        mockListDocsInstance.execute.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                files: [
                  { path: 'file1.md', filename: 'file1.md', title: 'File 1' },
                  { path: 'file2.md', filename: 'file2.md', title: 'File 2' },
                ],
              }),
            },
          ],
        });

        // Mock file 1 content (contains search term)
        mockMarkdownParser.readMarkdownFile.mockReturnValueOnce({
          content: '# Section 1\nThis contains search term.',
          metadata: {},
        }).mockReturnValueOnce({
          content: '# Section 2\nThis does not contain it.',
          metadata: {},
        });

        mockMarkdownParser.parseMarkdownSections.mockReturnValueOnce({
          sections: [{ id: 'section1', title: 'Section 1', level: 1, character_count: 15 }],
          sectionMap: new Map([['section1', { start: 0, end: 1 }]]),
        }).mockReturnValueOnce({
          sections: [{ id: 'section2', title: 'Section 2', level: 1, character_count: 20 }],
          sectionMap: new Map([['section2', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('search term');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results).toHaveLength(1); // Only file 1 has matches
        expect(searchResponse.results[0].filename).toBe('file1.md');
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should skip files that cannot be processed and continue', async () => {
        // Mock ListDocumentationFiles response
        mockListDocsInstance.execute.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                files: [
                  { path: 'valid.md', filename: 'valid.md', title: 'Valid File' },
                  { path: 'invalid.md', filename: 'invalid.md', title: 'Invalid File' },
                ],
              }),
            },
          ],
        });

        // Mock valid file
        mockMarkdownParser.readMarkdownFile.mockReturnValueOnce({
          content: '# Valid Section\nThis contains search term.',
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValueOnce({
          sections: [{ id: 'valid-section', title: 'Valid Section', level: 1, character_count: 15 }],
          sectionMap: new Map([['valid-section', { start: 0, end: 1 }]]),
        });

        // Mock invalid file (simulate error)
        mockMarkdownParser.readMarkdownFile.mockImplementationOnce(() => {
          throw new Error('File read error');
        });

        const result = await search.execute('search term');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results).toHaveLength(1); // Only valid file
        expect(searchResponse.results[0].filename).toBe('valid.md');
      });
    });

    describe('Special Characters and Technical Terms', () => {
      it('should handle search terms with special characters', async () => {
        const content = `# API Documentation
The API endpoint is https://api.example.com/v1.0 with authentication token xyz123.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'api-documentation', title: 'API Documentation', level: 1, character_count: 40 },
          ],
          sectionMap: new Map([['api-documentation', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('https://api.example.com/v1.0', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle search terms with symbols', async () => {
        const content = `# Configuration
Use @#$%^&*() symbols in your configuration.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'configuration', title: 'Configuration', level: 1, character_count: 20 },
          ],
          sectionMap: new Map([['configuration', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('@#$%^&*()', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle quoted search terms', async () => {
        const content = `# Examples
Use "quoted text" in your documentation.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'examples', title: 'Examples', level: 1, character_count: 15 },
          ],
          sectionMap: new Map([['examples', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('"quoted text"', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle file not found error', async () => {
        mockMarkdownParser.validateFile.mockReturnValue({
          valid: false,
          error: 'File not found',
        });

        const result = await search.execute('search term', 'nonexistent.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
        expect(errorResponse.error.message).toContain('not found');
        expect(errorResponse.error.details.filename).toBe('nonexistent.md');
      });

      it('should handle file too large error', async () => {
        mockMarkdownParser.validateFile.mockReturnValue({
          valid: false,
          error: 'File too large',
        });

        const result = await search.execute('search term', 'large.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('FILE_TOO_LARGE');
        expect(errorResponse.error.message).toBe('File \'large.md\' exceeds size limit');
      });

      it('should handle general parse errors', async () => {
        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw new Error('General parse error');
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.message).toBe('Error searching documentation files');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long search terms', async () => {
        const longTerm = 'a'.repeat(1000);
        const content = `# Test Section
This contains a very long search term: ${longTerm}`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'test-section', title: 'Test Section', level: 1, character_count: 50 },
          ],
          sectionMap: new Map([['test-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute(longTerm, 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle Unicode characters in search terms', async () => {
        const content = `# Internationalization
Testing with café, naïve, and 中文 characters.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'internationalization', title: 'Internationalization', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['internationalization', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('café', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle search across line breaks', async () => {
        const content = `# Multi-line Content
This content spans
multiple lines with the search term.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'multi-line-content', title: 'Multi-line Content', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['multi-line-content', { start: 0, end: 2 }]]),
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });
  });
});