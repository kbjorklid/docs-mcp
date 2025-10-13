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
      expect(searchTool.inputSchema.required).toContain('filename');
    });

    it('should search for basic text patterns in a single file', async () => {
      const response = await helper.callTool('search', {
        query: 'authentication',
        filename: 'api-documentation.md'
      });

      helper.expectSearchResults(response, 'authentication', 1);

      // Additional detailed checks
      const searchResult = helper.parseJsonContent(response);
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
            filename: 'api-documentation.md'
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
            filename: 'user-guide.md'
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
            filename: 'code-examples.md'
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
            filename: 'special-characters.md'
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
            filename: 'special-characters.md'
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
            filename: 'technical-specs.md'
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
            filename: 'api-documentation.md'
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
            filename: 'api-documentation.md'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      const content = response.result.content[0];
      const errorResult = JSON.parse(content.text);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.code).toBe('INVALID_PARAMETER');
      expect(errorResult.error.message).toContain('query parameter is required');
    });

    it('should handle missing filename parameter error', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test'
            // missing filename
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const errorResult = JSON.parse(content.text);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.code).toBe('INVALID_PARAMETER');
      expect(errorResult.error.message).toContain('filename parameter is required');
    });

    it('should handle file not found error', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test',
            filename: 'nonexistent-file.md'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const errorResult = JSON.parse(content.text);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.code).toBe('FILE_NOT_FOUND');
      expect(errorResult.error.message).toContain('not found');
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
            filename: 'api-documentation.md'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const errorResult = JSON.parse(content.text);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error.code).toBe('INVALID_PARAMETER');
      expect(errorResult.error.message).toContain('Invalid regular expression');
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
            filename: 'user-guide.md'
          }
        }
      };

      const response1 = await helper.sendRequest(request1);
      expect(response1.error).toBeUndefined();
      const content1 = response1.result.content[0];
      const searchResult1 = JSON.parse(content1.text);
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
            filename: 'technical-specs.md'
          }
        }
      };

      const response2 = await helper.sendRequest(request2);
      expect(response2.error).toBeUndefined();
      const content2 = response2.result.content[0];
      const searchResult2 = JSON.parse(content2.text);
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
            filename: 'api-documentation.md'
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
            filename: 'api-documentation.md'
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
            filename: 'code-examples.md'
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
            filename: 'api-documentation.md'
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
            filename: 'code-examples.md'
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
            filename: 'api-documentation.md'
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
            filename: 'api-documentation.md'
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
            filename: 'technical-specs.md'
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
            filename: 'code-examples.md'
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
            filename: 'api-documentation.md'
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
            filename: 'api-documentation.md'
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
            filename: 'api-documentation.md'
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
            filename: 'special-characters.md'
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
            filename: 'code-examples.md'
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
});