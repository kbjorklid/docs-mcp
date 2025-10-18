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
        filename: 'simple-guide.md'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const sections = helper.parseJsonContent(tocResponse);
      expect(sections.length).toBeGreaterThan(0);

      // Step 3: Read a specific section
      const firstSection = sections[0];
      const readResponse = await helper.callTool('read_sections', {
        filename: 'simple-guide.md',
        section_ids: [firstSection.id]
      });

      helper.expectSuccessfulResponse(readResponse);
      const readSections = helper.parseJsonContent(readResponse);
      expect(readSections.length).toBe(1);
      expect(readSections[0].title).toBe(firstSection.title);
      expect(readSections[0].content).toBeDefined();

      // Step 4: Search for specific content
      const searchResponse = await helper.callTool('search', {
        query: 'npm install|Bearer|API',
        filename: 'simple-guide.md'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].filename).toBe('simple-guide.md');
    });

    it('should handle API documentation exploration workflow', async () => {
      helper = await startServerWithCustomArgs('should-handle-api-documentation-exploration-workflow');

      // Step 1: Get table of contents for API documentation
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'api-docs.md'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const sections = helper.parseJsonContent(tocResponse);
      expect(sections.length).toBeGreaterThan(0);

      // Step 2: Search for authentication-related content
      const searchResponse = await helper.callTool('search', {
        query: 'Bearer|Authorization|API.*key',
        filename: 'api-docs.md'
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
          filename: 'api-docs.md',
          section_ids: [authSection.id]
        });

        helper.expectSuccessfulResponse(readResponse);
        const readSections = helper.parseJsonContent(readResponse);
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

      // Test 2: Try to read non-existent file
      const readResponse = await helper.callTool('read_sections', {
        filename: 'non-existent.md',
        section_ids: ['some-section']
      });

      helper.expectSuccessfulResponse(readResponse);
      const readError = helper.parseErrorContent(readResponse);
      expect(readError.error.message).toContain('not found');

      // Test 3: Try to search in non-existent file
      const searchResponse = await helper.callTool('search', {
        query: 'test',
        filename: 'non-existent.md'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchError = helper.parseErrorContent(searchResponse);
      expect(searchError.error.message).toContain('not found');

      // Test 4: Try TOC for non-existent file
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'non-existent.md'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const tocError = helper.parseErrorContent(tocResponse);
      expect(tocError.error.message).toContain('not found');
    });
  });

  describe('Configuration Integration', () => {
    it('should respect max-depth parameter in table_of_contents tool', async () => {
      helper = await startServerWithCustomArgs('should-respect-max-depth-configuration-across-all-tools');

      // Test that table_of_contents respects max_depth parameter
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'simple-guide.md',
        max_depth: 2
      });

      helper.expectSuccessfulResponse(tocResponse);
      const sections = helper.parseJsonContent(tocResponse);

      // Should only include sections up to depth 2
      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);

      // Search should still work normally regardless of max_depth
      const searchResponse = await helper.callTool('search', {
        query: 'installation',
        filename: 'simple-guide.md'
      });

      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });
});