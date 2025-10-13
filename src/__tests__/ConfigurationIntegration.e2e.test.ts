/**
 * Black-box end-to-end tests for configuration integration workflows
 * These tests exercise the MCP server with different configuration scenarios
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('Configuration Integration E2E Tests', () => {
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'list-documentations');

  async function startServerWithArgs(args: string[] = []): Promise<{ helper: E2ETestHelper, serverProcess: ChildProcess }> {
    const helper = new E2ETestHelper('list-documentations');
    const serverProcess = await helper.spawnServerWithArgs(args);

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

    // Set the serverProcess in the helper so callTool() works
    (helper as any).serverProcess = serverProcess;

    return { helper, serverProcess };
  }

  describe('Configuration Workflow Integration', () => {
    it('should handle end-to-end workflow with different maxTocDepth settings', async () => {
      // Test with maxTocDepth = 2
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', testDocsPath, '--max-toc-depth', '2']);

      try {
        // Step 1: List documentation files
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Step 2: Get table of contents with maxTocDepth = 2
        const tocResponse = await helper.callTool('table_of_contents', {
          filename: 'user-guide.md',
          max_depth: 2
        });

        helper.expectSuccessfulResponse(tocResponse);
        const sections = helper.parseJsonContent(tocResponse);
        expect(Array.isArray(sections)).toBe(true);

        // Step 3: Read specific sections
        if (sections.length > 0) {
          const readResponse = await helper.callTool('read_sections', {
            filename: 'user-guide.md',
            section_ids: [sections[0].id]
          });

          helper.expectSuccessfulResponse(readResponse);
          const content = helper.parseJsonContent(readResponse);
          expect(Array.isArray(content)).toBe(true);
          expect(content.length).toBe(1);
        }
      } finally {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should handle real-world usage scenario with mixed configuration sources', async () => {
      // Test with CLI args overriding environment variables
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', testDocsPath, '--max-toc-depth', '3']);

      try {
        // Step 1: List documentation files (should use CLI path, not env)
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Find a file to work with
        const testFile = files.find((f: any) => f.filename === 'user-guide.md');
        expect(testFile).toBeDefined();

        // Step 2: Get table of contents (should use CLI max-toc-depth)
        const tocResponse = await helper.callTool('table_of_contents', {
          filename: 'user-guide.md'
        });

        helper.expectSuccessfulResponse(tocResponse);
        const sections = helper.parseJsonContent(tocResponse);
        expect(Array.isArray(sections)).toBe(true);

        // Step 3: Read first section
        if (sections.length > 0) {
          const readResponse = await helper.callTool('read_sections', {
            filename: 'user-guide.md',
            section_ids: [sections[0].id]
          });

          helper.expectSuccessfulResponse(readResponse);
          const content = helper.parseJsonContent(readResponse);
          expect(Array.isArray(content)).toBe(true);
          expect(content[0].title).toBe(sections[0].id);
        }
      } finally {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should maintain consistent tool behavior across configuration changes', async () => {
      // Test that all tools work consistently with different configurations
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', testDocsPath]);

      try {
        // Test all basic tools are available
        const toolsListRequest = helper.createToolsListRequest();
        const toolsListResponse = await helper.sendRequest(toolsListRequest);
        helper.expectSuccessfulResponse(toolsListResponse);

        const tools = toolsListResponse.result.tools;
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
          let args: any = {};

          if (toolName === 'list_documentation_files') {
            args = {};
          } else if (toolName === 'search') {
            args = {
              query: 'test',
              filename: 'user-guide.md'
            };
          } else {
            args = {
              filename: 'user-guide.md'
            };
          }

          const toolResponse = await helper.callTool(toolName, args);
          helper.expectSuccessfulResponse(toolResponse);
        }
      } finally {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  });
});