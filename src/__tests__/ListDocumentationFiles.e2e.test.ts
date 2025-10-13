/**
 * Black-box end-to-end tests for list_documentations tool
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

describe('list_documentations E2E Tests', () => {
  let serverProcess: ChildProcess;
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'list-documentations');

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

  describe('list_documentations tool', () => {
    it('should list all available documentation files with metadata', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_documentation_files',
          arguments: {}
        }
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);

      const content = response.result.content;
      expect(content.length).toBeGreaterThan(0);

      // Find the files we created in our test fixtures
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(Array.isArray(files)).toBe(true);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('user-guide.md');
      expect(fileNames).toContain('api-reference.md');
      expect(fileNames).toContain('README.md');

      // Check that metadata is properly included
      const apiReferenceFile = files.find((file: any) => file.filename === 'api-reference.md');
      expect(apiReferenceFile).toBeDefined();
      expect(apiReferenceFile.title).toBe('API Reference');

      // Check file size information
      expect(apiReferenceFile.size).toBeDefined();
      expect(typeof apiReferenceFile.size).toBe('string');
      expect(apiReferenceFile.size).toMatch(/\d+(kb|b)$/);
    });

    it('should handle tools/list request to verify the tool is available', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);

      const tools = response.result.tools;
      const listDocsTool = tools.find((tool: any) => tool.name === 'list_documentation_files');
      expect(listDocsTool).toBeDefined();
      expect(listDocsTool.description).toBeDefined();
      expect(listDocsTool.inputSchema).toBeDefined();
      expect(listDocsTool.inputSchema.type).toBe('object');
    });
  });
});