/**
 * Black-box end-to-end tests for list_documentations tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('list_documentations E2E Tests', () => {
  describe('list_documentations tool', () => {
    it('should list all available documentation files with metadata', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-list-all-available-documentation-files-with-metadata');
      await helper.startServer();
      const response = await helper.callTool('list_documentation_files', {});

      helper.expectFileList(response, ['user-guide.md', 'api-reference.md', 'README.md']);

      // Check that metadata is properly included
      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      const apiReferenceFile = files.find((file: any) => file.filename === 'api-reference.md');
      expect(apiReferenceFile).toBeDefined();
      expect(apiReferenceFile.title).toBe('API Reference');

      // Check file ID and source directory
      expect(apiReferenceFile.fileId).toBe('f1'); // api-reference.md is 1st alphabetically
      expect(apiReferenceFile.sourceDirectory).toBeDefined();

      // Check file size information
      expect(apiReferenceFile.size).toBeDefined();
      expect(typeof apiReferenceFile.size).toBe('string');
      expect(apiReferenceFile.size).toMatch(/\d+(kb|b)$/);

      await helper.stopServer();
    });

    it('should handle tools/list request to verify the tool is available', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-handle-tools-list-request-to-verify-the-tool-is-available');
      await helper.startServer();

      await helper.verifyToolAvailable('list_documentation_files');

      await helper.stopServer();
    });

    it('should handle non-existent documentation paths gracefully', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-handle-non-existent-documentation-paths-gracefully');
      const invalidServerProcess = await helper.spawnServerWithArgs(['--docs-path', '/non/existent/path']);

      try {
        const initRequest = helper.createToolsListRequest(10);
        initRequest.method = 'initialize';
        initRequest.params = {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        };

        const initResponse = await helper.sendRequestToServer(invalidServerProcess, initRequest);
        helper.expectNoError(initResponse);

        // Try to list documentation files
        const listResponse = await helper.sendRequestToServer(invalidServerProcess,
          helper.createToolCallRequest('list_documentation_files', {}, 11));

        // Should return an empty array for non-existent paths rather than an error
        helper.expectSuccessfulResponse(listResponse);
        const content = helper.parseContentArray(listResponse);
        const files = content[0].text ? JSON.parse(content[0].text) : content[0];
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBe(0);
      } finally {
        invalidServerProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, 15000);

    it('should handle configuration compatibility correctly', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-handle-configuration-compatibility-correctly');
      await helper.startServer();

      const response = await helper.callTool('list_documentation_files', {});

      helper.expectSuccessfulResponse(response);

      // Verify the response structure is correct with simplified configuration
      const content = helper.parseContentArray(response);
      expect(content.length).toBeGreaterThan(0);

      // Verify files returned are only markdown files
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(Array.isArray(files)).toBe(true);

      files.forEach((file: any) => {
        expect(file.filename).toMatch(/\.md$/);
        expect(file.size).toBeDefined();
        expect(typeof file.size).toBe('string');
        // Verify new File ID fields
        expect(file.fileId).toBeDefined();
        expect(file.fileId).toMatch(/^f[0-9]+$/);
        expect(file.sourceDirectory).toBeDefined();
      });

      await helper.stopServer();
    });
  });
});