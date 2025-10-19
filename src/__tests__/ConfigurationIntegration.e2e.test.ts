/**
 * Black-box end-to-end tests for configuration integration workflows
 * These tests exercise the MCP server with different configuration scenarios
 */

import { ChildProcess } from 'child_process';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('Configuration Integration E2E Tests', () => {
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
    it('should handle end-to-end workflow with tool parameters', async () => {
      // Use isolated test directory for this specific test case
      const isolatedHelper = new E2ETestHelper('ConfigurationIntegration', 'should-handle-end-to-end-workflow-with-different-max-toc-depth-settings');
      const isolatedDocsPath = isolatedHelper.getTestDocsPath();

      // Start server with docs path
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', isolatedDocsPath]);

      try {
        // Step 1: List documentation files
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Step 2: Get table of contents (uses default max-toc-depth of 3)
        const tocResponse = await helper.callTool('table_of_contents', {
          filename: 'user-guide.md'
        });

        helper.expectSuccessfulResponse(tocResponse);
        const sections = helper.parseJsonContent(tocResponse);
        expect(Array.isArray(sections)).toBe(true);

        // Verify default max toc depth is respected - should only have level 1-3 headers
        const sectionLevels = sections.map((section: any) => section.level);
        expect(sectionLevels.every((level: number) => level <= 3)).toBe(true);

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

    it('should handle real-world usage scenario with CLI configuration', async () => {
      // Use isolated test directory for this specific test case
      const isolatedHelper = new E2ETestHelper('ConfigurationIntegration', 'should-handle-real-world-usage-scenario-with-mixed-configuration-sources');
      const isolatedDocsPath = isolatedHelper.getTestDocsPath();

      // Test with CLI docs path
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', isolatedDocsPath]);

      try {
        // Step 1: List documentation files (should use CLI path)
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);

        // Find a file to work with
        const testFile = files.find((f: any) => f.filename === 'user-guide.md');
        expect(testFile).toBeDefined();

        // Step 2: Get table of contents
        const tocResponse = await helper.callTool('table_of_contents', {
          filename: 'user-guide.md'
        });

        helper.expectSuccessfulResponse(tocResponse);
        const sections = helper.parseJsonContent(tocResponse);
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBeGreaterThan(0);

        // Step 3: Read first section
        if (sections.length > 0) {
          const readResponse = await helper.callTool('read_sections', {
            filename: 'user-guide.md',
            section_ids: [sections[0].id]
          });

          helper.expectSuccessfulResponse(readResponse);
          const content = helper.parseJsonContent(readResponse);
          expect(Array.isArray(content)).toBe(true);
          expect(content[0]).toBeDefined();
          expect(content[0].title).toBeTruthy();
          expect(content[0].content).toBeTruthy();
        }
      } finally {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should maintain consistent tool behavior across configuration changes', async () => {
      // Use isolated test directory for this specific test case
      const isolatedHelper = new E2ETestHelper('ConfigurationIntegration', 'should-maintain-consistent-tool-behavior-across-configuration-changes');
      const isolatedDocsPath = isolatedHelper.getTestDocsPath();

      // Test that all tools work consistently with different configurations
      const { helper, serverProcess } = await startServerWithArgs(['--docs-path', isolatedDocsPath]);

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

          // Additional verification for specific tools
          if (toolName === 'list_documentation_files') {
            const files = helper.parseJsonContent(toolResponse);
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files.some((file: any) => file.filename === 'user-guide.md')).toBe(true);
          } else if (toolName === 'table_of_contents') {
            const sections = helper.parseJsonContent(toolResponse);
            expect(Array.isArray(sections)).toBe(true);
            expect(sections.length).toBeGreaterThan(0);
          } else if (toolName === 'search') {
            const searchResult = helper.parseJsonContent(toolResponse);
            expect(searchResult.query).toBe('test');
            expect(searchResult.results).toBeDefined();
            expect(Array.isArray(searchResult.results)).toBe(true);
          } else if (toolName === 'read_sections') {
            // First get TOC to get a valid section ID
            const tocResponse = await helper.callTool('table_of_contents', {
              filename: 'user-guide.md'
            });
            const sections = helper.parseJsonContent(tocResponse);
            if (sections.length > 0) {
              const readResponse = await helper.callTool('read_sections', {
                filename: 'user-guide.md',
                section_ids: [sections[0].id]
              });
              const content = helper.parseJsonContent(readResponse);
              expect(Array.isArray(content)).toBe(true);
              expect(content.length).toBeGreaterThan(0);
            }
          }
        }
      } finally {
        serverProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  });
});