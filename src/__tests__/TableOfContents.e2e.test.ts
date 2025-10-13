/**
 * Black-box end-to-end tests for table_of_contents tool
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

describe('table_of_contents E2E Tests', () => {
  let serverProcess: ChildProcess;
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'table-of-contents');

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

  describe('tools/list verification', () => {
    it('should list table_of_contents tool with correct schema', async () => {
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
      const tocTool = tools.find((tool: any) => tool.name === 'table_of_contents');
      expect(tocTool).toBeDefined();
      expect(tocTool.description).toBeDefined();
      expect(tocTool.inputSchema).toBeDefined();
      expect(tocTool.inputSchema.type).toBe('object');

      // Check required parameters
      expect(tocTool.inputSchema.required).toContain('filename');
      expect(tocTool.inputSchema.properties.filename).toBeDefined();
      expect(tocTool.inputSchema.properties.max_depth).toBeDefined();
    });
  });

  describe('table_of_contents tool functionality', () => {
    it('should generate table of contents for simple headers', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md'
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

      // Parse the JSON content - it's the sections array directly
      const sections = JSON.parse(content.text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);

      // Check top-level header
      const topLevelHeader = sections.find((s: any) => s.level === 1);
      expect(topLevelHeader).toBeDefined();
      expect(topLevelHeader.title).toBe('Simple Headers');
      expect(topLevelHeader.id).toBeDefined();

      // Check second-level headers
      const level2Headers = sections.filter((s: any) => s.level === 2);
      expect(level2Headers.length).toBe(3); // Introduction, Main Features, Conclusion

      // Check third-level headers
      const level3Headers = sections.filter((s: any) => s.level === 3);
      expect(level3Headers.length).toBe(4); // Getting Started, Feature One, Feature Two, Final Thoughts
    });

    it('should respect max_depth parameter', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md',
            max_depth: 2
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Should only include headers up to level 2
      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);

      // Should still have level 1 and 2 headers
      const hasLevel1Or2 = sections.some((s: any) => s.level <= 2);
      expect(hasLevel1Or2).toBe(true);
    });

    it('should handle complex nested structures correctly', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'complex-nested.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Check that we have headers at all levels (1-6)
      const levels = new Set(sections.map((s: any) => s.level));
      expect(levels.has(1)).toBe(true);
      expect(levels.has(2)).toBe(true);
      expect(levels.has(3)).toBe(true);
      expect(levels.has(4)).toBe(true);
      expect(levels.has(5)).toBe(true);
      expect(levels.has(6)).toBe(true);

      // Check section ID generation
      sections.forEach((section: any) => {
        expect(section.id).toBeDefined();
        expect(typeof section.id).toBe('string');
        expect(section.id.length).toBeGreaterThan(0);
      });

      // Check hierarchical structure
      const topLevelSections = sections.filter((s: any) => s.level === 1);
      expect(topLevelSections.length).toBe(1); // Complex Nested Structure (all others are under it)
    });

    it('should handle files with front matter correctly', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'with-front-matter.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Should have the main document header (not counting front matter)
      const mainHeader = sections.find((s: any) => s.title === 'Document with Front Matter');
      expect(mainHeader).toBeDefined();
      expect(mainHeader.level).toBe(1);

      // Should have other sections
      expect(sections.length).toBeGreaterThan(1);
    });

    it('should handle files with no headers gracefully', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'no-headers.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBe(0);
    });

    it('should handle single header documents', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'single-header.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      expect(sections.length).toBe(1);
      expect(sections[0].level).toBe(1);
      expect(sections[0].title).toBe('Single Header Document');
      expect(sections[0].id).toBeDefined();
    });

    it('should handle headers with special characters', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'special-characters.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Should have headers with various special characters
      const specialHeaders = sections.filter((s: any) =>
        s.title.includes('@') ||
        s.title.includes('#') ||
        s.title.includes('-') ||
        s.title.includes('_') ||
        s.title.includes('"') ||
        s.title.includes("'") ||
        s.title.includes('(') ||
        s.title.includes(')')
      );

      expect(specialHeaders.length).toBeGreaterThan(0);

      // Check that section IDs are properly generated
      sections.forEach((section: any) => {
        expect(section.id).toBeDefined();
        expect(typeof section.id).toBe('string');
      });
    });

    it('should handle max_depth = 0 correctly', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md',
            max_depth: 0
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // max_depth = 0 means no limit, should return all sections
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle max_depth larger than document depth', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md',
            max_depth: 10
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Should include all available sections when max_depth is very large
      expect(sections.length).toBeGreaterThan(0);

      // Should include level 3 headers
      const hasLevel3Headers = sections.some((s: any) => s.level === 3);
      expect(hasLevel3Headers).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent file gracefully', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'non-existent-file.md'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');

      const errorResponse = JSON.parse(content.text);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBeDefined();
      expect(errorResponse.error.message).toBeDefined();
      expect(errorResponse.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should handle missing filename parameter', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {}
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');

      const errorResponse = JSON.parse(content.text);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBeDefined();
    });

    it('should handle negative max_depth parameter gracefully', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md',
            max_depth: -1
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');

      // Server should handle negative values gracefully and return valid results
      const sections = JSON.parse(content.text);
      expect(Array.isArray(sections)).toBe(true);
    });

    it('should handle non-numeric max_depth parameter gracefully', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-headers.md',
            max_depth: 'invalid'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');

      // Server should handle non-numeric values gracefully and return valid results
      const sections = JSON.parse(content.text);
      expect(Array.isArray(sections)).toBe(true);
    });
  });
});