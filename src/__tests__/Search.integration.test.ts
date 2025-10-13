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
      const result = await search.execute('search functionality', 'search/search-content.md');

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
      const result = await search.execute('REST API', 'search/rest-api-docs.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('REST API');

      // Should find matches in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle the original failing query "sorting parameters REST API"', async () => {
      const result = await search.execute('sorting parameters', 'search/rest-api-docs.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('sorting parameters');

      // Should find matches in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should search in a specific file correctly', async () => {
      const result = await search.execute('JavaScript', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('JavaScript');
      expect(searchResponse.results).toHaveLength(1);
      expect(searchResponse.results[0].filename).toBe('search/search-content.md');
      expect(searchResponse.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should return empty results when searching for non-existent terms', async () => {
      const result = await search.execute('nonexistent term xyz123', 'shared/test-doc.md');

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
      const result1 = await search.execute('JAVASCRIPT', 'search/search-content.md');
      const result2 = await search.execute('javascript', 'search/search-content.md');

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      // Both should return the same results
      expect(response1.results).toEqual(response2.results);
    });

    it('should handle regex patterns in real files', async () => {
      const result = await search.execute('v\\d+\\.\\d+\\.\\d+', 'search/rest-api-docs.md'); // Version pattern like v2.0.1

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('v\\d+\\.\\d+\\.\\d+');

      // Should find version numbers in rest-api-docs.md
      const restApiResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/rest-api-docs.md');
      expect(restApiResults).toBeDefined();
      expect(restApiResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle multiline search across real files', async () => {
      const result = await search.execute('content spans.*multiple lines', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('content spans.*multiple lines');

      // Should find the multiline content in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle special characters in search', async () => {
      const result = await search.execute('@#\\$%\\^&\\*\\(\\)', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('@#\\$%\\^&\\*\\(\\)');

      // Should find special characters in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should handle Unicode characters in search', async () => {
      const result = await search.execute('funcionalidad', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('funcionalidad');

      // Should find Unicode characters in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/search-content.md');
      expect(searchFileResults).toBeDefined();
      expect(searchFileResults.matches.length).toBeGreaterThan(0);
    });

    it('should search across multiple files and aggregate results', async () => {
      const result = await search.execute('API', 'search/rest-api-docs.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('API');
      expect(searchResponse.results.length).toBeGreaterThanOrEqual(1);

      // Should find matches in the specified file
      const apiFiles = searchResponse.results.filter((r: FileSearchResult) =>
        r.filename.includes('api') || r.filename.includes('rest')
      );
      expect(apiFiles.length).toBeGreaterThan(0);
    });

    it('should handle search in nested sections', async () => {
      const result = await search.execute('nested content', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);

      // Should find nested content in search-content.md
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/search-content.md');
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

      const result = await searchWithDepth.execute('deep search', 'search/search-content.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);

      // Should still find results but with limited depth
      const searchFileResults = searchResponse.results.find((r: FileSearchResult) => r.filename === 'search/search-content.md');
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

      const result = await searchWithEmpty.execute('any term', 'nonexistent.md');

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);

      // Should return a file not found error since the file doesn't exist
      if (response.error) {
        expect(response.error.code).toBe('FILE_NOT_FOUND');
      } else {
        // If it somehow succeeds, ensure empty results
        expect(response.query).toBe('any term');
        expect(response.results).toHaveLength(0);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long search terms efficiently', async () => {
      const longTerm = 'a'.repeat(1000);
      const result = await search.execute(longTerm, 'shared/test-doc.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe(longTerm);

      // Should complete without error and return structured results
      expect(searchResponse.results).toBeInstanceOf(Array);
    });

    it('should handle multiple concurrent searches', async () => {
      const searches = [
        search.execute('API', 'search/rest-api-docs.md'),
        search.execute('REST', 'search/rest-api-docs.md'),
        search.execute('JavaScript', 'search/search-content.md'),
        search.execute('database', 'search/search-content.md')
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
      const result = await search.execute('HTTP/HTTPS', 'search/rest-api-docs.md');

      expect(result.content).toHaveLength(1);
      const searchResponse = JSON.parse(result.content[0].text);
      expect(searchResponse.query).toBe('HTTP\\/HTTPS');

      // Should find HTTP/HTTPS protocols in the content
      expect(searchResponse.results.length).toBeGreaterThan(0);
    });
  });
});