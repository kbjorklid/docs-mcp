/**
 * Black-box end-to-end tests for CLI configuration functionality
 * These tests exercise the MCP server with various command line arguments and environment variables
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

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

describe('CLI Configuration E2E Tests', () => {
  let serverProcess: ChildProcess;
  let tempDocsPath: string;

  beforeAll(() => {
    // Create a temporary documentation directory for testing
    tempDocsPath = join(__dirname, 'fixtures', 'e2e', 'temp-cli-config');
    if (!existsSync(tempDocsPath)) {
      mkdirSync(tempDocsPath, { recursive: true });
    }

    // Create test documentation files
    writeFileSync(join(tempDocsPath, 'test.md'), `# Test Document

## Introduction
This is a test introduction.

## Configuration Test
This section tests configuration.

## Deep Section
### Subsection 1
Content here.
### Subsection 2
More content.
#### Very Deep Section
Very deep content.`);

    writeFileSync(join(tempDocsPath, 'simple.md'), `# Simple Document

Just a simple document with basic content.`);
  });

  afterAll(() => {
    // Clean up temporary files
    // Note: In a real scenario, you might want to clean up temp files
  });

  afterEach(async () => {
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

  async function startServer(args: string[] = [], env: Record<string, string> = {}): Promise<void> {
    const serverArgs = [
      join(__dirname, '..', '..', 'dist', 'index.js'),
      ...args
    ];

    serverProcess = spawn('node', serverArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    });

    // Wait a moment for the server to start
    await sleep(100);

    // Ensure the server is ready by sending initialization
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
  }

  describe('--docs-path CLI argument', () => {
    it('should use custom documentation path from --docs-path argument', async () => {
      await startServer(['--docs-path', tempDocsPath]);

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

      const content = response.result.content[0];
      const files = JSON.parse(content.text);
      expect(files.length).toBeGreaterThan(0);

      // Should find our test files
      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md');
      expect(fileNames).toContain('simple.md');
    });

    it('should use short form -d argument', async () => {
      await startServer(['-d', tempDocsPath]);

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

      const content = response.result.content[0];
      const files = JSON.parse(content.text);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should prioritize CLI --docs-path over DOCS_PATH environment variable', async () => {
      // Set environment variable to a different path
      const envPath = join(__dirname, 'fixtures', 'e2e', 'search');

      await startServer(
        ['--docs-path', tempDocsPath],
        { DOCS_PATH: envPath }
      );

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

      const content = response.result.content[0];
      const files = JSON.parse(content.text);

      // Should use CLI path, not environment variable path
      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md'); // From tempDocsPath, not envPath
    });
  });

  describe('--max-toc-depth CLI argument', () => {
    it('should respect --max-toc-depth argument for table_of_contents tool', async () => {
      await startServer(['--docs-path', tempDocsPath, '--max-toc-depth', '2']);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'test.md'
          }
        }
      };

      const response = await sendRequest(request);
      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // Should only include sections up to depth 2
      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);

      // Should include level 1 and 2 sections
      const hasLevel1Or2 = sections.some((s: any) => s.level <= 2);
      expect(hasLevel1Or2).toBe(true);

      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle invalid --max-toc-depth values gracefully', async () => {
      await startServer(['--docs-path', tempDocsPath, '--max-toc-depth', 'invalid']);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'test.md'
          }
        }
      };

      const response = await sendRequest(request);
      expect(response.error).toBeUndefined();

      // Should still work, defaulting to no limit
      const content = response.result.content[0];
      const sections = JSON.parse(content.text);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle zero and negative --max-toc-depth values', async () => {
      await startServer(['--docs-path', tempDocsPath, '--max-toc-depth', '0']);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'test.md'
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
  });

  describe('--discount-single-top-header CLI argument', () => {
    it('should increase effective max depth when --discount-single-top-header is used', async () => {
      await startServer([
        '--docs-path', tempDocsPath,
        '--max-toc-depth', '2',
        '--discount-single-top-header'
      ]);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'test.md'
          }
        }
      };

      const response = await sendRequest(request);
      expect(response.error).toBeUndefined();

      const content = response.result.content[0];
      const sections = JSON.parse(content.text);

      // With discountSingleTopHeader, effective max depth should be 3 (2 + 1)
      // Should include deeper sections than normal max_depth=2
      const hasLevel3 = sections.some((s: any) => s.level === 3);
      expect(hasLevel3).toBe(true);

      // Should not include level 4 or deeper
      const hasLevel4OrDeeper = sections.some((s: any) => s.level > 3);
      expect(hasLevel4OrDeeper).toBe(false);
    });
  });

  describe('DOCS_PATH environment variable', () => {
    it('should use DOCS_PATH environment variable when no CLI argument provided', async () => {
      await startServer([], { DOCS_PATH: tempDocsPath });

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

      const content = response.result.content[0];
      const files = JSON.parse(content.text);
      expect(files.length).toBeGreaterThan(0);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md');
    });
  });

  describe('Multiple CLI arguments', () => {
    it('should handle multiple CLI arguments correctly', async () => {
      await startServer([
        '--docs-path', tempDocsPath,
        '--max-toc-depth', '1',
        '--discount-single-top-header'
      ]);

      // Test list_documentation_files
      const listRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_documentation_files',
          arguments: {}
        }
      };

      const listResponse = await sendRequest(listRequest);
      expect(listResponse.error).toBeUndefined();

      const listContent = listResponse.result.content[0];
      const files = JSON.parse(listContent.text);
      expect(files.length).toBeGreaterThan(0);

      // Test table_of_contents with configuration
      const tocRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'test.md'
          }
        }
      };

      const tocResponse = await sendRequest(tocRequest);
      expect(tocResponse.error).toBeUndefined();

      const tocContent = tocResponse.result.content[0];
      const sections = JSON.parse(tocContent.text);

      // With max_depth=1 and discountSingleTopHeader, effective max depth should be 2
      const hasLevel2 = sections.some((s: any) => s.level === 2);
      expect(hasLevel2).toBe(true);

      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);
    });
  });

  describe('CLI argument precedence and validation', () => {
    it('should handle missing argument values gracefully', async () => {
      // Test with --docs-path but no following value
      await startServer(['--docs-path']);

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

      // Should default to './docs' and handle gracefully
      const content = response.result.content[0];
      const files = JSON.parse(content.text);
      expect(Array.isArray(files)).toBe(true);
    });

    it('should ignore unknown CLI arguments', async () => {
      await startServer([
        '--docs-path', tempDocsPath,
        '--unknown-argument', 'some-value',
        '--another-unknown'
      ]);

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

      const content = response.result.content[0];
      const files = JSON.parse(content.text);
      expect(files.length).toBeGreaterThan(0);
    });
  });
});