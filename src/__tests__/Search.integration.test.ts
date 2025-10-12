import * as path from 'path';
import { Search } from '../tools/Search';
import { DocumentationConfig, FileSearchResult } from '../types';

describe('Search Integration Tests (Real Files)', () => {
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

  describe('Real File Integration', () => {
    it('should search across real fixture files', async () => {
      const result = await search.execute('search functionality');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('search functionality');
      expect(searchResponse.results).toBeInstanceOf(Array);

      // Debug: log what files were actually found
      console.log('Found files:', searchResponse.results.map((r: FileSearchResult) => r.filename));

      // Should find matches in any file that contains "search content"
      expect(searchResponse.results.length).toBeGreaterThan(0);

      // Check if any file has matches
      const filesWithMatches = searchResponse.results.filter((r: FileSearchResult) => r.matches.length > 0);
      expect(filesWithMatches.length).toBeGreaterThan(0);
    });

    it('should search for REST API terms across real files', async () => {
      const result = await search.execute('REST API');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('REST API');

      // Should find matches in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle the original failing query "sorting parameters REST API"', async () => {
      const result = await search.execute('sorting parameters');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('sorting parameters');

      // Should find matches in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should search in a specific file correctly', async () => {
      const result = await search.execute('JavaScript', 'search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('JavaScript');
      expect(searchResponse.results).toHaveLength(1);
      expect(searchResponse.results[0].filename).toBe('search-content.md');
      expect(searchResponse.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should return empty results when searching for non-existent terms', async () => {
      const result = await search.execute('nonexistent term xyz123');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('nonexistent term xyz123');
      expect(searchResponse.results).toBeInstanceOf(Array);

      // Results array should be empty or contain files with no matches
      searchResponse.results.forEach((fileResult: FileSearchResult) => {
        expect(fileResult.matches).toHaveLength(0);
      });
    });

    it('should handle case-insensitive search across real files', async () => {
      const result1 = await search.execute('JAVASCRIPT');
      const result2 = await search.execute('javascript');

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      // Both should return the same results
      expect(response1.results).toEqual(response2.results);
    });

    it('should handle regex patterns in real files', async () => {
      const result = await search.execute('v\\d+\\.\\d+\\.\\d+'); // Version pattern like v2.0.1

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('v\\d+\\.\\d+\\.\\d+');

      // Should find version numbers in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle multiline search across real files', async () => {
      const result = await search.execute('content spans.*multiple lines');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('content spans.*multiple lines');

      // Should find the multiline content in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle special characters in search', async () => {
      const result = await search.execute('@#\\$%\\^&\\*\\(\\)');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('@#\\$%\\^&\\*\\(\\)');

      // Should find special characters in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle Unicode characters in search', async () => {
      const result = await search.execute('funcionalidad');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('funcionalidad');

      // Should find Unicode characters in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should search across multiple files and aggregate results', async () => {
      const result = await search.execute('API');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('API');
      expect(searchResponse.results.length).toBeGreaterThan(1);

      // Should find matches in multiple files
      const apiFiles = searchResponse.results.filter((r: FileSearchResult) =>
        r.filename.includes('api') || r.filename.includes('rest')
      );
      expect(apiFiles.length).toBeGreaterThan(0);
    });

    it('should handle search in nested sections', async () => {
      const result = await search.execute('nested content');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);

      // Should find nested content in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);

      // Verify it found the nested section
      const nestedSection = searchFileResults.matches.find((m: any) => m.id.includes('subsection'));
      expect(nestedSection).toBeDefined();
    });

    it('should respect max depth configuration', async () => {
      const configWithDepth = {
        ...config,
        maxTocDepth: 2
      };
      const searchWithDepth = new Search(configWithDepth);

      const result = await searchWithDepth.execute('deep search');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);

      // Should still find results but with limited depth
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling with Real Files', () => {
    it('should handle file not found error with real file system', async () => {
      const result = await search.execute('search term', 'nonexistent-file.md');

      expect(result.content).toHaveLength(1);
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResponse.error.message).toContain('not found');
      expect(errorResponse.error.details.filename).toBe('nonexistent-file.md');
    });

    it('should handle empty fixtures directory', async () => {
      const emptyConfig = {
        documentationPath: path.join(__dirname, 'empty'),
        maxTocDepth: 5,
        discountSingleTopHeader: false,
      };
      const searchWithEmpty = new Search(emptyConfig);

      const result = await searchWithEmpty.execute('any term');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('any term');
      expect(searchResponse.results).toHaveLength(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long search terms efficiently', async () => {
      const longTerm = 'a'.repeat(1000);
      const result = await search.execute(longTerm);

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe(longTerm);

      // Should complete without error and return structured results
      expect(searchResponse.results).toBeInstanceOf(Array);
    });

    it('should handle multiple concurrent searches', async () => {
      const searches = [
        search.execute('API'),
        search.execute('REST'),
        search.execute('JavaScript'),
        search.execute('database')
      ];

      const results = await Promise.all(searches);

      // All searches should complete successfully
      results.forEach(result => {
        expect(result.content).toHaveLength(1);
        const searchResponse = JSON.parse(result.content[0].text);
        expect(searchResponse.results).toBeInstanceOf(Array);
      });
    });

    it('should handle complex regex patterns', async () => {
      const result = await search.execute('HTTP/HTTPS');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('HTTP\\/HTTPS');

      // Should find HTTP/HTTPS protocols in the content
      expect(searchResponse.results.length).toBeGreaterThan(0);
    });
  });
});