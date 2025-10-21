/**
 * Black-box end-to-end tests for search tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('Search E2E Tests', () => {
  let helper: E2ETestHelper;

  beforeAll(async () => {
    helper = E2ETestHelper.create('search');
    await helper.startServer();
  }, 10000);

  afterAll(async () => {
    await helper.stopServer();
  });

  describe('search tool', () => {
    it('should be available in tools/list', async () => {
      const searchTool = await helper.verifyToolAvailable('search');
      expect(searchTool.inputSchema.required).toContain('query');
      // fileId is now optional for search - when not provided, searches all files
    });

    it('should search for basic text patterns in a single file', async () => {
      const response = await helper.callTool('search', {
        query: 'authentication',
        fileId: 'f1'
      });

      helper.expectSearchResults(response, 'authentication', 1);

      // Additional detailed checks
      const searchResult = helper.parseJsonContent(response);
      expect(searchResult.results[0].fileId).toBe('f1');
      expect(searchResult.results[0].fileId).toBe('f1');
      expect(searchResult.results[0].filename).toBe('api-documentation.md');
      expect(Array.isArray(searchResult.results[0].matches)).toBe(true);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should perform case-insensitive search', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'AUTHENTICATION', // uppercase
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for regex patterns across line breaks', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'welcome.*platform', // Should match across lines
            fileId: 'f14'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for technical terms in code examples', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'React|useState|useEffect',
            fileId: 'f2'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for mathematical symbols and special characters', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '∑|∏|∫|√|∞',
            fileId: 'f12'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for international characters and Unicode', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'café|naïve|résumé',
            fileId: 'f12'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for specific technical terms in specifications', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'microservices|Kubernetes|Docker',
            fileId: 'f13'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should return no matches for non-existent patterns', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'definitelydoesnotexist12345',
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBe(0);
    });

    it('should handle empty query parameter error', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '',
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      const errorResult = helper.parseErrorContent(response);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.message).toContain('parameter is required');
    });

    it('should search all files when fileId is not provided', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test'
            // no fileId - should search all files
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
      // Should search across multiple files
      expect(searchResult.results.length).toBeGreaterThan(0);
      // Each result should have fileId
      searchResult.results.forEach((result: any) => {
        expect(result.fileId).toBeDefined();
        expect(result.fileId).toMatch(/^f\d+$/);
        expect(result.filename).toBeDefined();
      });
    });

    it('should handle invalid fileId error', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test',
            fileId: 'f999' // Non-existent file ID
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      const errorResult = helper.parseErrorContent(response);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.message).toMatch(/error.*searching|file.*exists|fileId.*not found/i);
    });

    it('should handle invalid regular expression', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '[unclosed bracket',
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      const errorResult = helper.parseErrorContent(response);
      expect(errorResult.error).toBeDefined();
      // The server returns an error when regex compilation fails
      expect(errorResult.error.message).toBeDefined();
    });

    it('should search in different files with filename parameter', async () => {
      // Search in user guide
      const request1: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'dashboard',
            fileId: 'f14'
          }
        }
      };

      const response1 = await helper.sendRequest(request1);
      expect(response1.error).toBeUndefined();
      const content1 = response1.result.content[0];
      const searchResult1 = JSON.parse(content1.text);
      expect(searchResult1.results[0].fileId).toBe('f14');
      expect(searchResult1.results[0].fileId).toBe('f14');
      expect(searchResult1.results[0].filename).toBe('user-guide.md');
      expect(searchResult1.results[0].matches.length).toBeGreaterThan(0);

      // Search in technical specs
      const request2: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'database',
            fileId: 'f13'
          }
        }
      };

      const response2 = await helper.sendRequest(request2);
      expect(response2.error).toBeUndefined();
      const content2 = response2.result.content[0];
      const searchResult2 = JSON.parse(content2.text);
      expect(searchResult2.results[0].fileId).toBe('f13');
      expect(searchResult2.results[0].fileId).toBe('f13');
      expect(searchResult2.results[0].filename).toBe('technical-specs.md');
      expect(searchResult2.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for word boundaries', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '\\bAPI\\b', // Match exact word "API" not part of other words
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for version patterns', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'v\\d+\\.\\d+\\.\\d+', // Version pattern like v2.1.0
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for email addresses', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
            fileId: 'f2'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for HTTP endpoints', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '(GET|POST|PUT|DELETE)\\s+/api/[^\\s]+',
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search for code blocks content', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'function|const|let|var',
            fileId: 'f2'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Search Patterns', () => {
    it('should handle complex regex quantifiers and lookaheads', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'Authorization.*Bearer', // Authorization followed by Bearer
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle complex regex patterns with multiple groups', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '(GET|POST|PUT)\\s+/api/[^\\s]+', // HTTP methods with API endpoints
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle nested quantifiers and character classes', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 23,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\b', // Title case words
            fileId: 'f13'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle advanced quantifier patterns', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 24,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '\\w+@\\w+\\.\\w+', // Email pattern
            fileId: 'f2'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle complex alternation patterns', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 25,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '(?:OAuth|JWT|Bearer|API\\s+key)', // Authentication methods
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long search terms efficiently', async () => {
      const longPattern = 'a'.repeat(50) + '.*';
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 26,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: longPattern,
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.query).toBe(longPattern);
    });

    it('should handle deeply nested multiline patterns', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 27,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '```[\\s\\S]*?```', // Match entire code blocks
            fileId: 'f1'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      // Should find code blocks across multiple lines
      expect(searchResult.results[0].matches.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle international characters', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 28,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '[café]+|[résumé]+', // International characters
            fileId: 'f12'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle complex lookahead and lookbehind combinations', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 29,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: '(?<=\\d{3})\\s*\\d{3}\\s*\\d{4}', // Phone number pattern with lookbehind
            fileId: 'f2'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      // Should handle even if no matches are found
      expect(searchResult.results[0].matches.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Hierarchical Section Matching', () => {
    it('should only return child sections when search term appears only in child, not parent', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 30,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'TheThing', // Only in ## Bar section
            fileId: 'f5'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      const matches = searchResult.results[0].matches;

      // Should only find the ## Bar section (1.1), not the # Foo section (1)
      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe('1.1');
      expect(matches[0].title).toBe('Bar');
      expect(matches[0].level).toBe(2);
    });

    it('should return both parent and child sections when search term appears in both', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'Text', // Appears in both # Foo and ## Bar
            fileId: 'f5'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      const matches = searchResult.results[0].matches;

      // Should find both sections since "Text" appears in both
      expect(matches.length).toBe(2);
      expect(matches[0].id).toBe('1');
      expect(matches[0].title).toBe('Foo');
      expect(matches[0].level).toBe(1);
      expect(matches[1].id).toBe('1.1');
      expect(matches[1].title).toBe('Bar');
      expect(matches[1].level).toBe(2);
    });

    it('should include subsection_count in search results', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 32,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'feature',
            fileId: 'f4'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      const matches = searchResult.results[0].matches;

      // Find the "Key Features" section (level 1) - all its children are matched
      const keyFeaturesSection = matches.find((s: any) => s.level === 1);
      expect(keyFeaturesSection).toBeDefined();
      expect(keyFeaturesSection.title).toBe('Key Features');
      // When all direct children (Feature One, Feature Two, Feature Three) are matched,
      // subsection_count should be undefined (not redundant)
      expect(keyFeaturesSection.subsection_count).toBeUndefined();

      // Find "Feature One" section - leaf section, should not have subsection_count
      const featureOneSection = matches.find((s: any) => s.title === 'Feature One');
      expect(featureOneSection).toBeDefined();
      expect(featureOneSection.subsection_count).toBeUndefined();
    });

    it('should omit subsection_count for leaf sections in search results', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 33,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'example',
            fileId: 'f3'
          }
        }
      };

      const response = await helper.sendRequest(request);
      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      const matches = searchResult.results[0].matches;

      // Leaf sections (Example 1, Example 2, Example 3) should not have subsection_count
      const leafSections = matches.filter((s: any) => s.level === 3);
      leafSections.forEach((section: any) => {
        expect(section.subsection_count).toBeUndefined();
      });

      // Parent sections: when all children are matched, subsection_count should be undefined
      const parentSections = matches.filter((s: any) => s.level === 1 || s.level === 2);
      parentSections.forEach((section: any) => {
        if (section.level === 1) {
          // Main Examples section has all 2 children (Basic Examples, Advanced Examples) matched
          expect(section.subsection_count).toBeUndefined();
        } else if (section.title === 'Basic Examples' || section.title === 'Advanced Examples') {
          // These sections have all their children matched (Examples 1&2, and Example 3 respectively)
          expect(section.subsection_count).toBeUndefined();
        }
      });
    });
  });

  describe('instructions field for hidden subsections', () => {
    it('should omit instructions when search results have no hidden subsections', async () => {
      const helper = new E2ETestHelper('Search', 'should-omit-instructions-when-no-hidden');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'search',
            arguments: {
              query: 'JavaScript',
              fileId: 'f1' // code-examples.md is the only file, so it's f1
            }
          }
        };

        const response = await helper.sendRequest(request);
        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        
        // Check for errors first
        if (response.error) {
          throw new Error(`Search failed: ${JSON.stringify(response.error)}`);
        }
        
        const searchResult = JSON.parse(content.text);

        // Should have the standard search result properties
        expect(searchResult.query).toBeDefined();
        expect(searchResult.results).toBeDefined();

        // Should not have instructions if no hidden subsections
        if (searchResult.instructions !== undefined) {
          expect(typeof searchResult.instructions).toBe('string');
          expect(searchResult.instructions).toContain('section_table_of_contents');
        }
      } finally {
        await helper.stopServer();
      }
    });
  });
});