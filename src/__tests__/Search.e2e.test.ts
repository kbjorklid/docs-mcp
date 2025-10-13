/**
 * Black-box end-to-end tests for search tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

describe('Search E2E Tests', () => {
  let serverProcess: ChildProcess;
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'search');

  beforeAll(async () => {
    // Spawn the MCP server process
    serverProcess = spawn('node', [join(__dirname, '..', '..', 'dist', 'index.js'), '--docs-path', testDocsPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DOCS_PATH: testDocsPath }
    });

    // Wait a moment for the server to start
    await sleep(100);

    // Ensure the server is ready by sending a simple ping
    const initRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    const initResponse = await sendRequest(initRequest);
    expect(initResponse.error).toBeUndefined();
  }, 10000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await sleep(100);
    }
  });

  async function sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      if (!serverProcess.stdin || !serverProcess.stdout) {
        reject(new Error('Server process not properly initialized'));
        return;
      }

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();

        // Try to parse complete JSON-RPC response
        try {
          const lines = responseData.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              serverProcess.stdout?.removeListener('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Not yet a complete JSON response, continue accumulating
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        serverProcess.stdout?.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  describe('search tool', () => {
    it('should be available in tools/list', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);

      const tools = response.result.tools;
      const searchTool = tools.find((tool: any) => tool.name === 'search');
      expect(searchTool).toBeDefined();
      expect(searchTool.description).toBeDefined();
      expect(searchTool.inputSchema).toBeDefined();
      expect(searchTool.inputSchema.type).toBe('object');
      expect(searchTool.inputSchema.required).toContain('query');
      expect(searchTool.inputSchema.required).toContain('filename');
    });

    it('should search for basic text patterns in a single file', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'authentication',
            filename: 'api-documentation.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);

      const content = response.result.content[0];
      expect(content.type).toBe('text');

      const searchResult = JSON.parse(content.text);
      expect(searchResult.query).toBe('authentication');
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
      expect(searchResult.results.length).toBe(1);
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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response1 = await sendRequest(request1);
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

      const response2 = await sendRequest(request2);
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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

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

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      const content = response.result.content[0];
      const searchResult = JSON.parse(content.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });
});