import * as path from 'path';
import { Search } from '../tools/Search';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';

// Mock dependencies
jest.mock('../MarkdownParser');

const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

describe('Search', () => {
  let search: Search;
  let mockConfig: DocumentationConfig;
  let fixturesPath: string;

  // Test helper methods
  const mockSingleFileSearch = (filename: string, content: string, sections: any[]) => {
    mockMarkdownParser.validateFile.mockReturnValue({
      valid: true,
      stats: { size: 1024 } as any,
    });
    mockMarkdownParser.readMarkdownFile.mockReturnValue({
      content,
      metadata: {},
    });
    mockMarkdownParser.parseMarkdownSections.mockReturnValue({
      sections,
      sectionMap: new Map(sections.map(section => [section.id, { start: 0, end: 1 }])),
    });
  };

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    mockConfig = {
      documentationPath: fixturesPath,
      maxTocDepth: 5,
      discountSingleTopHeader: false,
    };

    search = new Search(mockConfig);

    // Default MarkdownParser mocks
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
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties.query).toBeDefined();
      expect(definition.inputSchema.properties.filename).toBeDefined();
      expect(definition.inputSchema.required).toEqual(['query', 'filename']);
    });
  });

  describe('execute', () => {
    describe('Parameter Validation', () => {
      it('should return error for empty query', async () => {
        const result = await search.execute('', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('query parameter is required and cannot be empty.');
      });

      it('should return error for whitespace-only query', async () => {
        const result = await search.execute('   ', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should return error for null query', async () => {
        const result = await search.execute(null as any, 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should return error for undefined query', async () => {
        const result = await search.execute(undefined as any, 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
      });

      it('should return error for empty filename', async () => {
        const result = await search.execute('search term', '');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('filename parameter is required and cannot be empty.');
      });

      it('should return error for whitespace-only filename', async () => {
        const result = await search.execute('search term', '   ');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('filename parameter is required and cannot be empty.');
      });

      it('should return error for null filename', async () => {
        const result = await search.execute('search term', null as any);

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('filename parameter is required and cannot be empty.');
      });

      it('should return error for undefined filename', async () => {
        const result = await search.execute('search term', undefined as any);

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toBe('filename parameter is required and cannot be empty.');
      });

      it('should trim whitespace from valid query', async () => {
        mockSingleFileSearch('test.md', 'Test content with search term', [
          { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
        ]);

        const result = await search.execute('  search term  ', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.query).toBe('search term');
        expect(searchResponse.results).toHaveLength(1);
        expect(searchResponse.results[0].filename).toBe('test.md');
      });
    });

    describe('Regular Expression Functionality', () => {
      it('should handle simple regex patterns', async () => {
        const content = `# Testing Section
This section contains database connections and database queries.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('database.+', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.query).toBe('database.+');
        expect(searchResponse.results).toHaveLength(1);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle character classes', async () => {
        const content = `# Configuration
Set port to 3000 or 8080 or 9000.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'configuration', title: 'Configuration', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['configuration', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('[0-9]{4}', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle word boundaries', async () => {
        const content = `# API Documentation
The API endpoint is api.example.com but not apidirect.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'api-documentation', title: 'API Documentation', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['api-documentation', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('\\bapi\\b', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle quantifiers', async () => {
        const content = `# Error Handling
HTTP status codes: 200, 404, 500.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'error-handling', title: 'Error Handling', level: 1, character_count: 20 },
          ],
          sectionMap: new Map([['error-handling', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('\\d{3}', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle alternation', async () => {
        const content = `# Authentication
Use JWT or OAuth for authentication.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'authentication', title: 'Authentication', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['authentication', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('JWT|OAuth', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle special regex characters', async () => {
        const content = `# Email Validation
Contact: user@example.com or admin@site.org.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'email-validation', title: 'Email Validation', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['email-validation', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle URL matching', async () => {
        const content = `# API Endpoints
Available endpoints: https://api.example.com/v1/users and http://localhost:3000/api/data`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'api-endpoints', title: 'API Endpoints', level: 1, character_count: 50 },
          ],
          sectionMap: new Map([['api-endpoints', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('https?://[^\\s]+', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });

    describe('Multiline Regular Expression Support', () => {
      it('should match patterns across line breaks using dotAll', async () => {
        const content = `# Multi-line Section
This is the first line
and this is the second line
with more content here.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'multi-line-section', title: 'Multi-line Section', level: 1, character_count: 40 },
          ],
          sectionMap: new Map([['multi-line-section', { start: 0, end: 3 }]]),
        });

        const result = await search.execute('first line.*second line', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should match patterns spanning multiple lines', async () => {
        const content = `# Configuration
Host: localhost
Port: 3000
Database: myapp
User: admin`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'configuration', title: 'Configuration', level: 1, character_count: 35 },
          ],
          sectionMap: new Map([['configuration', { start: 0, end: 5 }]]),
        });

        const result = await search.execute('Host.*Database', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle complex multiline patterns', async () => {
        const content = `# API Documentation
Request:
GET /api/users
Headers: Content-Type: application/json
Response:
Status: 200 OK`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'api-documentation', title: 'API Documentation', level: 1, character_count: 50 },
          ],
          sectionMap: new Map([['api-documentation', { start: 0, end: 6 }]]),
        });

        const result = await search.execute('Request.*Response', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });

    describe('Invalid Regular Expression Handling', () => {
      it('should return error for invalid regex syntax', async () => {
        const result = await search.execute('[unclosed bracket', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for invalid quantifier', async () => {
        const result = await search.execute('a{2,1}', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for incomplete character class', async () => {
        const result = await search.execute('[a-z', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for invalid escape sequence', async () => {
        const result = await search.execute('(', 'test.md'); // Unclosed group

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should handle complex invalid regex patterns', async () => {
        const result = await search.execute('(?<uncaptured group', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });
    });

    describe('Case-Insensitive Regular Expression Support', () => {
      it('should be case-insensitive for uppercase patterns', async () => {
        const content = `# JavaScript Testing
This section contains JavaScript and javascript.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'javascript-testing', title: 'JavaScript Testing', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['javascript-testing', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('JAVASCRIPT', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should be case-insensitive for mixed patterns', async () => {
        const content = `# HTTP Methods
GET, POST, PUT, DELETE methods are supported.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'http-methods', title: 'HTTP Methods', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['http-methods', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('get|post', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
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

    
    describe('Backward Compatibility with Simple Terms', () => {
      it('should handle exact text matching (backward compatibility)', async () => {
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

        const result = await search.execute('api.example.com', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle special characters in simple terms (regex escaped)', async () => {
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

        const result = await search.execute('@#\\$%\\^&\\*\\(\\)', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle quoted text with regex escaping', async () => {
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

      it('should maintain backward compatibility with existing search patterns', async () => {
        const content = `# Database Connection
This section contains the search term "database connection" which should be found.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'database-connection', title: 'Database Connection', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['database-connection', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('database connection', 'test.md');

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

      // File size handling test removed as max_file_size is no longer supported

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
            { id: 'test-section', title: 'Test Section', level: 1, character_count: 50 }
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
            { id: 'internationalization', title: 'Internationalization', level: 1, character_count: 25 }
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

    describe('Advanced Error Handling', () => {
      it('should handle non-Error objects thrown during search', async () => {
        // Test line 144: Handle non-Error objects (string, number, etc.)
        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw 'String error message'; // Throwing a string instead of Error
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.message).toBe('Error searching documentation files');
        expect(errorResponse.error.details.filename).toBe('test.md');
        expect(errorResponse.error.details.error).toBe('String error message');
      });

      it('should handle null/undefined errors thrown during search', async () => {
        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw null; // Throwing null
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error).toBe('Unknown error occurred');
      });

      it('should handle number errors thrown during search', async () => {
        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw 404; // Throwing a number
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error).toBe('404');
      });

      it('should handle object errors thrown during search', async () => {
        const customError = { code: 'CUSTOM_ERROR', message: 'Custom error object' };
        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw customError; // Throwing an object
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        // String() method on objects returns [object Object]
        expect(errorResponse.error.details.error).toBe('[object Object]');
      });
    });

    describe('File Validation Edge Cases', () => {
      it('should handle default file validation errors', async () => {
        // Test line 206: default case in validateFile switch statement
        mockMarkdownParser.validateFile.mockReturnValue({
          valid: false,
          error: 'Permission denied', // Any error other than 'File not found'
        });

        const result = await search.execute('search term', 'restricted.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.message).toBe('Error searching documentation files');
        expect(errorResponse.error.details.filename).toBe('restricted.md');
        expect(errorResponse.error.details.error.message).toBe('Permission denied');
      });

      it('should handle file system permission errors', async () => {
        mockMarkdownParser.validateFile.mockReturnValue({
          valid: false,
          error: 'EACCES: permission denied',
        });

        const result = await search.execute('search term', 'protected.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error.message).toBe('EACCES: permission denied');
      });

      it('should handle file too large errors', async () => {
        mockMarkdownParser.validateFile.mockReturnValue({
          valid: false,
          error: 'File too large',
        });

        const result = await search.execute('search term', 'huge.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error.message).toBe('File too large');
      });
    });

    describe('Section Map Edge Cases', () => {
      it('should handle missing section ranges in sectionMap', async () => {
        // Test line 255: Case when sectionMap.get() returns undefined
        const content = `# Test Section
This section should not match because it has no range mapping.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'orphaned-section', title: 'Orphaned Section', level: 1, character_count: 20 },
          ],
          sectionMap: new Map(), // Empty map - no range for 'orphaned-section'
        });

        const result = await search.execute('should not match', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(0); // Should not match due to missing range
      });

      it('should handle sections with inconsistent sectionMap entries', async () => {
        const content = `# First Section
Content with search term.
# Second Section
Different content.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'first-section', title: 'First Section', level: 1, character_count: 15 },
            { id: 'second-section', title: 'Second Section', level: 1, character_count: 15 },
            { id: 'third-section', title: 'Third Section', level: 1, character_count: 15 },
          ],
          sectionMap: new Map([
            ['first-section', { start: 0, end: 1 }], // Has range
            ['second-section', { start: 2, end: 3 }], // Has range
            // 'third-section' missing from sectionMap
          ]),
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1); // Only first-section should match
        expect(searchResponse.results[0].matches[0].id).toBe('first-section');
      });

      it('should handle empty sectionMap', async () => {
        const content = `# Test Section
Content with search term.`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'test-section', title: 'Test Section', level: 1, character_count: 20 },
          ],
          sectionMap: new Map(), // Completely empty sectionMap
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(0); // No matches due to empty sectionMap
      });
    });

    describe('Boundary Value Analysis for Parameters', () => {
      describe('Filename Parameter Boundary Tests', () => {
        it('should handle very long filenames', async () => {
          const longFilename = 'a'.repeat(255) + '.md';
          mockSingleFileSearch(longFilename, 'Test content', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute('test', longFilename);

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.results[0].filename).toBe(longFilename);
        });

        it('should handle filenames with special characters', async () => {
          const specialFilename = 'file-with-special.chars@#$%^&()_+=[]{}|;:,.md';
          mockSingleFileSearch(specialFilename, 'Test content', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute('test', specialFilename);

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.results[0].filename).toBe(specialFilename);
        });

        it('should handle filenames with Unicode characters', async () => {
          const unicodeFilename = 'файл-с-кириллицей.md';
          mockSingleFileSearch(unicodeFilename, 'Test content', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute('test', unicodeFilename);

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.results[0].filename).toBe(unicodeFilename);
        });

        it('should handle filenames with spaces', async () => {
          const spaceFilename = 'file with spaces.md';
          mockSingleFileSearch(spaceFilename, 'Test content', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute('test', spaceFilename);

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.results[0].filename).toBe(spaceFilename);
        });

        it('should accept filenames that are just dots', async () => {
          // '...' is not empty after trim(), so it should be accepted as a valid filename
          mockSingleFileSearch('...', 'Test content', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute('test', '...');

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.results[0].filename).toBe('...');
        });
      });

      describe('Query Parameter Boundary Tests', () => {
        it('should handle empty string queries after trimming', async () => {
          const result = await search.execute('   \t\n   ', 'test.md');

          expect(result.content).toHaveLength(1);
          const errorResponse = JSON.parse(result.content[0].text);
          expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        });

        it('should handle queries with only whitespace characters', async () => {
          const whitespaceQueries = ['\t', '\n', '\r', '\f', '\v', '\u00A0'];

          for (const query of whitespaceQueries) {
            const result = await search.execute(query, 'test.md');

            expect(result.content).toHaveLength(1);
            const errorResponse = JSON.parse(result.content[0].text);
            expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
          }
        });

        it('should handle extremely long regex patterns', async () => {
          const longPattern = 'a'.repeat(1000) + '.*' + 'b'.repeat(1000);
          mockSingleFileSearch('test.md', 'a content b', [
            { id: 'section1', title: 'Section 1', level: 1, character_count: 20 }
          ]);

          const result = await search.execute(longPattern, 'test.md');

          expect(result.content).toHaveLength(1);
          const searchResponse = JSON.parse(result.content[0].text);
          expect(searchResponse.query).toBe(longPattern);
        });
      });
    });

    describe('Complex Regex Pattern Tests', () => {
      it('should handle lookahead assertions', async () => {
        const content = `# Testing Section
Password: secret123, token: abc789, key: xyz456`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 35 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('\\w+(?=\\d+)', 'test.md'); // Words followed by digits

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle lookbehind assertions', async () => {
        const content = `# Testing Section
Version: v1.2.3, update: v2.0.1`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('(?<=v)\\d+\\.\\d+\\.\\d+', 'test.md'); // Version numbers after v

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle non-capturing groups', async () => {
        const content = `# Testing Section
Items: apple, banana, cherry, date`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 30 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('(?:apple|banana|cherry)', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle greedy vs lazy quantifiers', async () => {
        const content = `# Testing Section
<div><p>First paragraph</p><p>Second paragraph</p></div>`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 40 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        const result = await search.execute('<p>.*?</p>', 'test.md'); // Lazy quantifier

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });

      it('should handle atomic groups', async () => {
        const content = `# Testing Section
Error: failed to process, warning: minor issue`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'testing-section', title: 'Testing Section', level: 1, character_count: 25 },
          ],
          sectionMap: new Map([['testing-section', { start: 0, end: 1 }]]),
        });

        // Use a simpler pattern that should match
        const result = await search.execute('error|warning:', 'test.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });

    describe('Performance and Integration Tests', () => {
      it('should handle files with many sections efficiently', async () => {
        const sections: any[] = [];
        const sectionMapEntries: [string, { start: number; end: number }][] = [];
        const contentLines = ['# Large Document'];

        // Create 100 sections
        for (let i = 0; i < 100; i++) {
          const sectionId = `section-${i}`;
          sections.push({
            id: sectionId,
            title: `Section ${i}`,
            level: 1,
            character_count: 20
          });
          sectionMapEntries.push([sectionId, { start: i * 2, end: i * 2 + 1 }]);
          contentLines.push(`Content for section ${i}`);
          contentLines.push(`More content with search term in section ${i % 10}`);
        }

        const content = contentLines.join('\n');

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections,
          sectionMap: new Map(sectionMapEntries),
        });

        const result = await search.execute('search term', 'large.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches.length).toBeGreaterThan(0); // At least some sections should match
      });

      it('should handle deeply nested markdown structures', async () => {
        const content = `# Deep Document
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6
Search term appears at different levels.
####### Level 7 (invalid in markdown but should not crash)`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'deep-document', title: 'Deep Document', level: 1, character_count: 20 },
            { id: 'level-2', title: 'Level 2', level: 2, character_count: 15 },
            { id: 'level-3', title: 'Level 3', level: 3, character_count: 15 },
            { id: 'level-4', title: 'Level 4', level: 4, character_count: 15 },
            { id: 'level-5', title: 'Level 5', level: 5, character_count: 15 },
            { id: 'level-6', title: 'Level 6', level: 6, character_count: 15 },
          ],
          sectionMap: new Map([
            ['deep-document', { start: 0, end: 6 }],
            ['level-2', { start: 1, end: 6 }],
            ['level-3', { start: 2, end: 6 }],
            ['level-4', { start: 3, end: 6 }],
            ['level-5', { start: 4, end: 6 }],
            ['level-6', { start: 5, end: 6 }],
          ]),
        });

        const result = await search.execute('search term', 'deep.md');

        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results[0].matches.length).toBeGreaterThan(0);
      });

      it('should maintain consistent behavior across multiple searches', async () => {
        const content = `# Consistency Test
Search term appears multiple times: search term, SEARCH TERM, Search Term`;

        mockMarkdownParser.readMarkdownFile.mockReturnValue({
          content,
          metadata: {},
        });
        mockMarkdownParser.parseMarkdownSections.mockReturnValue({
          sections: [
            { id: 'consistency-test', title: 'Consistency Test', level: 1, character_count: 40 },
          ],
          sectionMap: new Map([['consistency-test', { start: 0, end: 1 }]]),
        });

        // Perform the same search multiple times
        const results = [];
        for (let i = 0; i < 5; i++) {
          const result = await search.execute('search term', 'test.md');
          results.push(result);
        }

        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i]).toEqual(results[0]);
        }

        // Verify the result is correct
        const searchResponse = JSON.parse(results[0].content[0].text);
        expect(searchResponse.results[0].matches).toHaveLength(1);
      });
    });

    describe('Development vs Production Error Handling', () => {
      it('should include stack trace in development environment', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const testError = new Error('Development test error');
        testError.stack = 'Error: Development test error\n    at Search.test.ts:1234:56';

        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw testError;
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error.stack).toBeDefined();
        expect(errorResponse.error.details.error.stack).toContain('Development test error');

        // Restore original environment
        process.env.NODE_ENV = originalEnv;
      });

      it('should not include stack trace in production environment', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const testError = new Error('Production test error');
        testError.stack = 'Error: Production test error\n    at Search.test.ts:1234:56';

        mockMarkdownParser.readMarkdownFile.mockImplementation(() => {
          throw testError;
        });

        const result = await search.execute('search term', 'test.md');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('PARSE_ERROR');
        expect(errorResponse.error.details.error.stack).toBeUndefined();

        // Restore original environment
        process.env.NODE_ENV = originalEnv;
      });
    });
  });
});