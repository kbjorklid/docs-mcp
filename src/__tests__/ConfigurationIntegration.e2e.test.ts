/**
 * Black-box end-to-end tests for configuration integration workflows
 * These tests exercise the MCP server with different configuration scenarios
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

describe('Configuration Integration E2E Tests', () => {
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'list-documentations');

  async function sendRequestToServer(serverProcess: ChildProcess, request: JSONRPCRequest): Promise<JSONRPCResponse> {
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

  async function initializeServer(serverProcess: ChildProcess): Promise<void> {
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

    const initResponse = await sendRequestToServer(serverProcess, initRequest);
    expect(initResponse.error).toBeUndefined();
  }

  describe('Configuration Workflow Integration', () => {
    it('should handle end-to-end workflow with different maxTocDepth settings', async () => {
      // Test with maxTocDepth = 2
      const serverProcess1 = spawn('node', [join(__dirname, '..', '..', 'dist', 'index.js'), '--docs-path', testDocsPath, '--max-toc-depth', '2'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      await sleep(100);
      await initializeServer(serverProcess1);

      try {
        // Step 1: List documentation files
        const listRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'list_documentation_files',
            arguments: {}
          }
        };

        const listResponse = await sendRequestToServer(serverProcess1, listRequest);
        expect(listResponse.error).toBeUndefined();
        expect(listResponse.result).toBeDefined();

        const files = listResponse.result.content[0].text ? JSON.parse(listResponse.result.content[0].text) : listResponse.result.content[0];
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Step 2: Get table of contents with maxTocDepth = 2
        const tocRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'user-guide.md',
              max_depth: 2
            }
          }
        };

        const tocResponse = await sendRequestToServer(serverProcess1, tocRequest);
        expect(tocResponse.error).toBeUndefined();
        expect(tocResponse.result).toBeDefined();

        const sections = tocResponse.result.content[0].text ? JSON.parse(tocResponse.result.content[0].text) : tocResponse.result.content[0];
        expect(Array.isArray(sections)).toBe(true);

        // Step 3: Read specific sections
        if (sections.length > 0) {
          const readRequest: JSONRPCRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'read_sections',
              arguments: {
                filename: 'user-guide.md',
                section_ids: [sections[0].id]
              }
            }
          };

          const readResponse = await sendRequestToServer(serverProcess1, readRequest);
          expect(readResponse.error).toBeUndefined();
          expect(readResponse.result).toBeDefined();

          const content = readResponse.result.content[0].text ? JSON.parse(readResponse.result.content[0].text) : readResponse.result.content[0];
          expect(Array.isArray(content)).toBe(true);
          expect(content.length).toBe(1);
        }
      } finally {
        serverProcess1.kill();
        await sleep(100);
      }
    });

    it('should handle real-world usage scenario with mixed configuration sources', async () => {
      // Test with CLI args overriding environment variables
      const serverProcess = spawn('node', [join(__dirname, '..', '..', 'dist', 'index.js'), '--docs-path', testDocsPath, '--max-toc-depth', '3'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DOCS_PATH: '/should/be/overridden' }
      });

      await sleep(100);
      await initializeServer(serverProcess);

      try {
        // Step 1: List documentation files (should use CLI path, not env)
        const listRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'list_documentation_files',
            arguments: {}
          }
        };

        const listResponse = await sendRequestToServer(serverProcess, listRequest);
        expect(listResponse.error).toBeUndefined();
        expect(listResponse.result).toBeDefined();

        const files = listResponse.result.content[0].text ? JSON.parse(listResponse.result.content[0].text) : listResponse.result.content[0];
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Find a file to work with
        const testFile = files.find((f: any) => f.filename === 'user-guide.md');
        expect(testFile).toBeDefined();

        // Step 2: Get table of contents (should use CLI max-toc-depth)
        const tocRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'user-guide.md'
            }
          }
        };

        const tocResponse = await sendRequestToServer(serverProcess, tocRequest);
        expect(tocResponse.error).toBeUndefined();
        expect(tocResponse.result).toBeDefined();

        const sections = tocResponse.result.content[0].text ? JSON.parse(tocResponse.result.content[0].text) : tocResponse.result.content[0];
        expect(Array.isArray(sections)).toBe(true);

        // Step 3: Read first section
        if (sections.length > 0) {
          const readRequest: JSONRPCRequest = {
            jsonrpc: '2.0',
            id: 6,
            method: 'tools/call',
            params: {
              name: 'read_sections',
              arguments: {
                filename: 'user-guide.md',
                section_ids: [sections[0].id]
              }
            }
          };

          const readResponse = await sendRequestToServer(serverProcess, readRequest);
          expect(readResponse.error).toBeUndefined();
          expect(readResponse.result).toBeDefined();

          const content = readResponse.result.content[0].text ? JSON.parse(readResponse.result.content[0].text) : readResponse.result.content[0];
          expect(Array.isArray(content)).toBe(true);
          expect(content[0].title).toBe(sections[0].id);
        }
      } finally {
        serverProcess.kill();
        await sleep(100);
      }
    });

    it('should maintain consistent tool behavior across configuration changes', async () => {
      // Test that all tools work consistently with different configurations

      // Test with basic configuration
      const basicServer = spawn('node', [join(__dirname, '..', '..', 'dist', 'index.js'), '--docs-path', testDocsPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      await sleep(100);
      await initializeServer(basicServer);

      try {
        // Test all basic tools are available
        const toolsListRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/list',
          params: {}
        };

        const toolsResponse = await sendRequestToServer(basicServer, toolsListRequest);
        expect(toolsResponse.error).toBeUndefined();
        expect(toolsResponse.result).toBeDefined();
        expect(toolsResponse.result.tools).toBeDefined();

        const tools = toolsResponse.result.tools;
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);

        // Verify expected tools are present
        const toolNames = tools.map((tool: any) => tool.name);
        expect(toolNames).toContain('list_documentation_files');
        expect(toolNames).toContain('table_of_contents');
        expect(toolNames).toContain('read_sections');
        expect(toolNames).toContain('search');

        // Test that each tool responds without errors
        for (const toolName of ['list_documentation_files', 'table_of_contents', 'read_sections', 'search']) {
          let toolRequest: JSONRPCRequest;

          if (toolName === 'list_documentation_files') {
            toolRequest = {
              jsonrpc: '2.0',
              id: 8 + toolNames.indexOf(toolName),
              method: 'tools/call',
              params: { name: toolName, arguments: {} }
            };
          } else if (toolName === 'search') {
            toolRequest = {
              jsonrpc: '2.0',
              id: 8 + toolNames.indexOf(toolName),
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: {
                  query: 'test',
                  filename: 'user-guide.md'
                }
              }
            };
          } else {
            toolRequest = {
              jsonrpc: '2.0',
              id: 8 + toolNames.indexOf(toolName),
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: {
                  filename: 'user-guide.md'
                }
              }
            };
          }

          const toolResponse = await sendRequestToServer(basicServer, toolRequest);
          expect(toolResponse.error).toBeUndefined();
          expect(toolResponse.result).toBeDefined();
        }
      } finally {
        basicServer.kill();
        await sleep(100);
      }
    });
  });
});