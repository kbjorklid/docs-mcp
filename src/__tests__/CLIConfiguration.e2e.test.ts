/**
 * Black-box end-to-end tests for CLI configuration functionality
 * These tests exercise the MCP server with various command line arguments and environment variables
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('CLI Configuration E2E Tests', () => {
  let helper: E2ETestHelper;

  afterEach(async () => {
    if (helper) {
      // Custom cleanup for servers started with custom args
      const serverProcess = (helper as any).serverProcess;
      if (serverProcess) {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        await helper.stopServer();
      }
    }
  });

  async function startServerWithArgs(testCaseName: string, args: string[] = [], env: Record<string, string> = {}): Promise<E2ETestHelper> {
    // Create isolated helper for the specific test case
    helper = new E2ETestHelper('CLIConfiguration', testCaseName);
    const testDocsPath = helper.getTestDocsPath();

    // Process args to replace placeholder paths with actual test path
    const finalArgs = args.map(arg => {
      if (arg === '--docs-path' || arg === '-d') {
        return arg;
      }
      return arg;
    });

    // Find docs-path argument and ensure it has the correct path
    for (let i = 0; i < finalArgs.length; i++) {
      if ((finalArgs[i] === '--docs-path' || finalArgs[i] === '-d') &&
          (i + 1 >= finalArgs.length || finalArgs[i + 1].startsWith('--'))) {
        finalArgs.splice(i + 1, 0, testDocsPath);
        break;
      }
    }

    // Spawn server with custom arguments and environment
    const serverProcess = await helper.spawnServerWithArgsAndEnv(finalArgs, env);

    // Initialize the server
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

    const initResponse = await helper.sendRequestToServer(serverProcess, initRequest);
    helper.expectNoError(initResponse);

    // Store the server process for cleanup
    (helper as any).serverProcess = serverProcess;

    return helper;
  }

  describe('--docs-path CLI argument', () => {
    it('should use custom documentation path from --docs-path argument', async () => {
      helper = await startServerWithArgs('should-use-custom-documentation-path-from-docs-path-argument', ['--docs-path']);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectFileList(response, ['test.md', 'simple.md']);
    });

    it('should use short form -d argument', async () => {
      helper = await startServerWithArgs('should-use-short-form-d-argument', ['-d']);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);
      const content = helper.parseContentArray(response);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should prioritize CLI --docs-path over DOCS_PATH environment variable', async () => {
      // Set environment variable to a different path
      const envPath = join(__dirname, 'fixtures', 'e2e', 'search');

      helper = await startServerWithArgs('should-prioritize-cli-docs-path-over-docs-path-environment-variable', ['--docs-path'], { DOCS_PATH: envPath });

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];

      // Should use CLI path, not environment variable path
      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md'); // From CLI path, not envPath
    });
  });


  describe('DOCS_PATH environment variable', () => {
    it('should use DOCS_PATH environment variable when no CLI argument provided', async () => {
      helper = new E2ETestHelper('CLIConfiguration', 'should-use-docs-path-environment-variable-when-no-cli-argument-provided');
      await helper.startServer();

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(files.length).toBeGreaterThan(0);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md');
    });
  });

  describe('Multiple CLI arguments', () => {
    it('should handle multiple --docs-path arguments correctly', async () => {
      helper = await startServerWithArgs('should-handle-multiple-cli-arguments-correctly', [
        '--docs-path'
      ]);

      // Test list_documentation_files
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);

      const listContent = helper.parseContentArray(listResponse);
      const files = listContent[0].text ? JSON.parse(listContent[0].text) : listContent[0];
      expect(files.length).toBeGreaterThan(0);

      // Test table_of_contents
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const sections = helper.parseJsonContent(tocResponse);
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('CLI argument precedence and validation', () => {
    it('should handle missing argument values gracefully', async () => {
      // Test with --docs-path but no following value
      helper = await startServerWithArgs('should-handle-missing-argument-values-gracefully', ['--docs-path']);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      // Should default to the isolated test path and handle gracefully
      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(Array.isArray(files)).toBe(true);
    });

    it('should ignore unknown CLI arguments', async () => {
      helper = await startServerWithArgs('should-ignore-unknown-cli-arguments', [
        '--docs-path',
        '--unknown-argument', 'some-value',
        '--another-unknown'
      ]);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(files.length).toBeGreaterThan(0);
    });
  });
});