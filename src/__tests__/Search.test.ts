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
      max_toc_depth: 5,
      discount_single_top_header: false,
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
      expect(definition.description).toContain('regular expressions');
      expect(definition.description).toContain('multiline matching');
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
        const result = await search.execute('[unclosed bracket');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for invalid quantifier', async () => {
        const result = await search.execute('a{2,1}');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for incomplete character class', async () => {
        const result = await search.execute('[a-z');

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should return error for invalid escape sequence', async () => {
        const result = await search.execute('('); // Unclosed group

        expect(result.content).toHaveLength(1);
        const errorResponse = JSON.parse(result.content[0].text);
        expect(errorResponse.error.code).toBe('INVALID_PARAMETER');
        expect(errorResponse.error.message).toContain('Invalid regular expression');
      });

      it('should handle complex invalid regex patterns', async () => {
        const result = await search.execute('(?<uncaptured group');

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