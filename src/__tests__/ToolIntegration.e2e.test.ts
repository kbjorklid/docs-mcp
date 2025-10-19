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
      const tocData = helper.parseJsonContent(tocResponse);
        const sections = tocData.sections;
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
      const tocData = helper.parseJsonContent(tocResponse);
        const sections = tocData.sections;
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
      const tocData = helper.parseJsonContent(tocResponse);
        const sections = tocData.sections;

      // Should only include sections up to depth 3 (default)
      const hasLevel4OrDeeper = sections.some((s: any) => s.level > 3);
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
});