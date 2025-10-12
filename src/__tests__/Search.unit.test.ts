import * as path from 'path';
import { Search } from '../tools/Search';
import { DocumentationConfig } from '../types';

describe('Search Unit Tests', () => {
  let search: Search;
  let config: DocumentationConfig;
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    config = {
      documentationPath: fixturesPath,
      maxTocDepth: 5,
      discountSingleTopHeader: false,
    };

    search = new Search(config);
  });

  describe('Tool Definition', () => {
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

    it('should have proper query parameter definition', () => {
      const definition = Search.getToolDefinition();
      const queryParam = definition.inputSchema.properties.query;

      expect(queryParam.type).toBe('string');
      expect(queryParam.description).toContain('regular expression');
      expect(queryParam.description).toContain('case-insensitive');
    });

    it('should have optional filename parameter', () => {
      const definition = Search.getToolDefinition();
      const filenameParam = definition.inputSchema.properties.filename;

      expect(filenameParam.type).toBe('string');
      expect(filenameParam.description).toContain('optional');
      expect(definition.inputSchema.required).not.toContain('filename');
    });
  });

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
      const result = await search.execute('  search term  ');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('search term');
    });
  });

  describe('Regular Expression Validation', () => {
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

    it('should accept valid regex patterns', async () => {
      const result = await search.execute('\\b[A-Z][a-z]+\\b');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('\\b[A-Z][a-z]+\\b');
    });
  });

  describe('Configuration', () => {
    it('should use provided documentation path', () => {
      const customConfig = {
        documentationPath: '/custom/path',
        maxTocDepth: 3,
        discountSingleTopHeader: true,
      };

      const customSearch = new Search(customConfig);
      // We can't directly test private properties, but we can test that it was initialized
      expect(customSearch).toBeInstanceOf(Search);
    });

    it('should handle default configuration', () => {
      expect(() => new Search(config)).not.toThrow();
    });
  });

  describe('Error Response Format', () => {
    it('should return properly formatted error responses', async () => {
      const result = await search.execute('');

      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(typeof errorResponse.error.code).toBe('string');
      expect(typeof errorResponse.error.message).toBe('string');
    });

    it('should include error details when available', async () => {
      const result = await search.execute('[invalid');

      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);

      expect(errorResponse.error).toHaveProperty('details');
      expect(errorResponse.error.details).toHaveProperty('error');
      expect(typeof errorResponse.error.details.error).toBe('object');
    });
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(search).toBeInstanceOf(Search);
      expect(() => new Search(config)).not.toThrow();
    });

    it('should handle configuration changes', () => {
      const newConfig = { ...config, maxTocDepth: 10 };
      const newSearch = new Search(newConfig);
      expect(newSearch).toBeInstanceOf(Search);
    });
  });
});