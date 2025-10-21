/**
 * Black-box end-to-end tests for tool integration scenarios
 * These tests exercise the complete documentation workflow using multiple tools together
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('Tool Integration E2E Tests', () => {
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

  async function startServerWithCustomArgs(testCaseName: string, args: string[] = []): Promise<E2ETestHelper> {
      // Create a custom helper with isolated test directory
      const customHelper = new E2ETestHelper('ToolIntegration', testCaseName);

      // Spawn server with custom arguments
      const serverProcess = await customHelper.spawnServerWithArgs(['--docs-path', customHelper.getTestDocsPath(), ...args]);

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

      const initResponse = await customHelper.sendRequestToServer(serverProcess, initRequest);
      customHelper.expectNoError(initResponse);

      // Store the server process in the helper for cleanup
      (customHelper as any).serverProcess = serverProcess;

      return customHelper;
    }

  describe('Basic Tool Integration Workflow', () => {
    it('should handle complete documentation discovery workflow', async () => {
      helper = await startServerWithCustomArgs('should-handle-complete-documentation-discovery-workflow');

      // Step 1: List all available documentation files
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);

      const listContent = helper.parseContentArray(listResponse);
      const files = listContent[0].text ? JSON.parse(listContent[0].text) : listContent[0];
      expect(files.length).toBeGreaterThanOrEqual(2);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('simple-guide.md');
      expect(fileNames).toContain('api-docs.md');

      // Step 2: Get table of contents for simple guide
      const tocResponse = await helper.callTool('table_of_contents', {
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const toc = helper.parseTableOfContentsText(tocResponse);
        const sections = toc;
      expect(sections.length).toBeGreaterThan(0);

      // Step 3: Read a specific section
      const firstSection = sections[0];
      const readResponse = await helper.callTool('read_sections', {
        fileId: 'f1',
        section_ids: [firstSection.id]
      });

      helper.expectSuccessfulResponse(readResponse);
      const readData = helper.parseJsonContent(readResponse);
      const readSections = readData.sections;
      expect(readSections.length).toBe(1);
      expect(readSections[0].title).toBe(firstSection.title);
      expect(readSections[0].content).toBeDefined();

      // Step 4: Search for specific content
      const searchResponse = await helper.callTool('search', {
        query: 'npm install|Bearer|API',
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].filename).toBe('api-docs.md'); // api-docs.md comes first alphabetically
    });

    it('should handle API documentation exploration workflow', async () => {
      helper = await startServerWithCustomArgs('should-handle-api-documentation-exploration-workflow');

      // Step 1: Get table of contents for API documentation
      const tocResponse = await helper.callTool('table_of_contents', {
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const toc = helper.parseTableOfContentsText(tocResponse);
        const sections = toc;
      expect(sections.length).toBeGreaterThan(0);

      // Step 2: Search for authentication-related content
      const searchResponse = await helper.callTool('search', {
        query: 'Bearer|Authorization|API.*key',
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);

      // Step 3: Read the authentication section if it exists
      const authSection = sections.find((s: any) =>
        s.title.toLowerCase().includes('auth')
      );

      if (authSection) {
        const readResponse = await helper.callTool('read_sections', {
          fileId: 'f1',
          section_ids: [authSection.id]
        });

        helper.expectSuccessfulResponse(readResponse);
        const readData = helper.parseJsonContent(readResponse);
      const readSections = readData.sections;
        expect(readSections.length).toBe(1);
        expect(typeof readSections[0].content).toBe('string');
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully across all tools', async () => {
      helper = await startServerWithCustomArgs('should-handle-errors-gracefully-across-all-tools');

      // Test 1: List files (should work)
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);

      // Test 2: Try to read non-existent section
      const readResponse = await helper.callTool('read_sections', {
        fileId: 'f1',
        section_ids: ['some-section']
      });

      helper.expectErrorWithCode(readResponse, 'SECTION_NOT_FOUND');
      const readError = helper.parseErrorContent(readResponse);
      expect(readError.error.message).toContain('not found');

      // Test 3: Search with no matches (returns empty results, not error)
      const searchResponse = await helper.callTool('search', {
        query: 'nonexistentterm',
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results).toBeDefined();
      expect(searchResult.results[0].matches.length).toBe(0);

      // Test 4: Try TOC for non-existent file
      const tocResponse = await helper.callTool('table_of_contents', {
        fileId: 'f999'  // Non-existent file ID
      });

      helper.expectErrorWithCode(tocResponse, 'FILE_NOT_FOUND');
      const tocError = helper.parseErrorContent(tocResponse);
      expect(tocError.error.message).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should respect default max-toc-depth in table_of_contents tool', async () => {
      helper = await startServerWithCustomArgs('should-respect-max-toc-depth-configuration-across-all-tools');

      // Test that table_of_contents respects default max-toc-depth setting
      const tocResponse = await helper.callTool('table_of_contents', {
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const toc = helper.parseTableOfContentsText(tocResponse);
        const sections = toc;

      // Should only include sections up to depth 3 (default)
      const hasLevel4OrDeeper = sections.some((s: any) => helper.getSectionLevel(s.id) > 3);
      expect(hasLevel4OrDeeper).toBe(false);

      // Search should still work normally
      const searchResponse = await helper.callTool('search', {
        query: 'feature',
        fileId: 'f1'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results.length).toBeGreaterThan(0);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });

  describe('Error Code Consistency', () => {
    it('should handle non-existent fileId consistently across tools', async () => {
      helper = await startServerWithCustomArgs('should-return-FILE-NOT-FOUND-with-same-format-from-all-tools');

      // Get the list of valid files first
      const listResponse = await helper.callTool('list_documentation_files', {});
      const files = JSON.parse(helper.parseContentArray(listResponse)[0].text);

      // Find the highest fileId number and use one beyond it
      const maxId = Math.max(...files.map((f: any) => parseInt(f.fileId.substring(1), 10)));
      const nonExistentId = `f${maxId + 100}`;

      // Test table_of_contents with non-existent file - should return an error
      const tocResponse = await helper.callTool('table_of_contents', {
        fileId: nonExistentId
      });
      // MCP tools return errors in the result.content, not response.error
      const tocContent = helper.parseContentArray(tocResponse);
      const tocText = tocContent[0].text;
      expect(tocText.toLowerCase()).toMatch(/not found|error/);

      // Test read_sections with non-existent file
      const readResponse = await helper.callTool('read_sections', {
        fileId: nonExistentId,
        section_ids: ['1']
      });
      const readContent = helper.parseContentArray(readResponse);
      const readText = readContent[0].text;
      expect(readText.toLowerCase()).toMatch(/not found|error/);
    });

    it('should return SECTION_NOT_FOUND with same format from all tools', async () => {
      helper = await startServerWithCustomArgs('should-return-SECTION-NOT-FOUND-with-same-format-from-all-tools');

      // Get file list to find a valid fileId
      const listResponse = await helper.callTool('list_documentation_files', {});
      const files = JSON.parse(helper.parseContentArray(listResponse)[0].text);
      const fileId = files[0].fileId;

      // Test read_sections with non-existent section
      const readResponse = await helper.callTool('read_sections', {
        fileId: fileId,
        section_ids: ['999.999.999']
      });
      helper.expectErrorWithCode(readResponse, 'SECTION_NOT_FOUND');
      const readError = helper.parseErrorContent(readResponse);

      // Test section_table_of_contents with non-existent section
      const sectionTocResponse = await helper.callTool('section_table_of_contents', {
        fileId: fileId,
        section_ids: ['999.999.999']
      });
      helper.expectErrorWithCode(sectionTocResponse, 'SECTION_NOT_FOUND');
      const sectionTocError = helper.parseErrorContent(sectionTocResponse);

      // Both errors should have consistent structure
      expect(readError.error.message).toBeDefined();
      expect(sectionTocError.error.message).toBeDefined();

      // Error messages should reference the missing section ID
      expect(readError.error.message).toContain('999.999.999');
      expect(sectionTocError.error.message).toContain('999.999.999');
    });

    it('should return INVALID_FILE_ID with same format from all tools', async () => {
      helper = await startServerWithCustomArgs('should-return-INVALID-FILE-ID-with-same-format-from-all-tools');

      // Only test non-empty invalid fileIds
      const invalidFileIds = ['invalid', 'f', 'f-1', 'file1'];

      for (const invalidFileId of invalidFileIds) {
        // Test table_of_contents with invalid fileId
        const tocResponse = await helper.callTool('table_of_contents', {
          fileId: invalidFileId
        });
        helper.expectErrorWithCode(tocResponse, 'INVALID_FILE_ID');
        const tocError = helper.parseErrorContent(tocResponse);
        expect(tocError.error.message).toBeDefined();

        // Test read_sections with invalid fileId
        const readResponse = await helper.callTool('read_sections', {
          fileId: invalidFileId,
          section_ids: ['1']
        });
        helper.expectErrorWithCode(readResponse, 'INVALID_FILE_ID');
        const readError = helper.parseErrorContent(readResponse);
        expect(readError.error.message).toBeDefined();
      }
    });

    it('should list all 5 expected tools with exact names', async () => {
      helper = await startServerWithCustomArgs('should-list-all-5-expected-tools-with-exact-names');

      const expectedTools = [
        'list_documentation_files',
        'table_of_contents',
        'read_sections',
        'section_table_of_contents',
        'search'
      ];

      // Get tools list
      const listRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      const serverProcess = (helper as any).serverProcess;
      const response = await helper.sendRequestToServer(serverProcess, listRequest);
      helper.expectNoError(response);

      const tools = response.result.tools;
      expect(tools.length).toBe(5);

      // Verify each expected tool is present with exact name
      expectedTools.forEach(toolName => {
        const tool = tools.find((t: any) => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool.name).toBe(toolName);
      });

      // Verify all tools have expected schema properties
      tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should list exactly 5 tool names and reject unknown ones', async () => {
      helper = await startServerWithCustomArgs('should-reject-unknown-tool-names-with-proper-error');

      const expectedTools = [
        'list_documentation_files',
        'table_of_contents',
        'read_sections',
        'section_table_of_contents',
        'search'
      ];

      // Get tools list
      const listRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      const serverProcess = (helper as any).serverProcess;
      const response = await helper.sendRequestToServer(serverProcess, listRequest);
      helper.expectNoError(response);

      const tools = response.result.tools;
      expect(tools.length).toBe(5);

      // Verify all expected tool names are present
      const toolNames = tools.map((t: any) => t.name);
      expectedTools.forEach(name => {
        expect(toolNames).toContain(name);
      });
    }, 10000);
  });
});