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
      // api-reference.md with title "API Reference" has a redundant title, so it should be removed
      expect(apiReferenceFile.title).toBeUndefined();

      // Check file ID
      expect(apiReferenceFile.fileId).toBe('f1'); // api-reference.md is 1st alphabetically

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
      });

      await helper.stopServer();
    });

    it('should return consistent fileId format across multiple calls', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-return-consistent-fileId-format-across-multiple-calls');
      await helper.startServer();

      // Call list_documentation_files twice
      const response1 = await helper.callTool('list_documentation_files', {});
      const response2 = await helper.callTool('list_documentation_files', {});

      helper.expectSuccessfulResponse(response1);
      helper.expectSuccessfulResponse(response2);

      // Parse both responses
      const content1 = helper.parseContentArray(response1);
      const files1 = content1[0].text ? JSON.parse(content1[0].text) : content1[0];

      const content2 = helper.parseContentArray(response2);
      const files2 = content2[0].text ? JSON.parse(content2[0].text) : content2[0];

      // Verify same number of files
      expect(files1.length).toBe(files2.length);

      // Verify each file has the same fileId in both responses
      files1.forEach((file1: any) => {
        const file2 = files2.find((f: any) => f.filename === file1.filename);
        expect(file2).toBeDefined();
        expect(file1.fileId).toBe(file2.fileId);
      });

      await helper.stopServer();
    });

    it('should maintain fileId stability across server restarts', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-maintain-fileId-stability-across-server-restarts');

      // First server instance
      await helper.startServer();
      const response1 = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response1);
      const content1 = helper.parseContentArray(response1);
      const files1 = content1[0].text ? JSON.parse(content1[0].text) : content1[0];
      await helper.stopServer();

      // Second server instance (restart)
      await helper.startServer();
      const response2 = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response2);
      const content2 = helper.parseContentArray(response2);
      const files2 = content2[0].text ? JSON.parse(content2[0].text) : content2[0];
      await helper.stopServer();

      // Verify same files have same fileIds after restart
      expect(files1.length).toBe(files2.length);
      files1.forEach((file1: any) => {
        const file2 = files2.find((f: any) => f.filename === file1.filename);
        expect(file2).toBeDefined();
        expect(file1.fileId).toBe(file2.fileId);
      });
    });

    it('should generate sequential fileIds starting from f1', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-generate-sequential-fileIds-starting-from-f1');
      await helper.startServer();

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];

      // Sort files by fileId to check sequential order
      const sortedFiles = [...files].sort((a: any, b: any) => {
        const aNum = parseInt(a.fileId.substring(1), 10);
        const bNum = parseInt(b.fileId.substring(1), 10);
        return aNum - bNum;
      });

      // Verify first file has f1, second has f2, etc.
      sortedFiles.forEach((file: any, index: number) => {
        expect(file.fileId).toBe(`f${index + 1}`);
      });

      await helper.stopServer();
    });

    it('should remove redundant titles from response', async () => {
      const helper = new E2ETestHelper('ListDocumentationFiles', 'should-remove-redundant-titles');
      await helper.startServer();

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];

      // Find files by filename
      const apiConventionsFile = files.find((f: any) => f.filename === 'api-conventions.md');
      const restConventionsFile = files.find((f: any) => f.filename === 'REST_CONVENTIONS.md');
      const setupFile = files.find((f: any) => f.filename === 'setup.md');

      expect(apiConventionsFile).toBeDefined();
      expect(restConventionsFile).toBeDefined();
      expect(setupFile).toBeDefined();

      // api-conventions.md with title "API Conventions" should have title removed (redundant)
      expect(apiConventionsFile.title).toBeUndefined();

      // REST_CONVENTIONS.md with title "REST Conventions" should have title removed (redundant)
      expect(restConventionsFile.title).toBeUndefined();

      // setup.md with title "Complete Installation Guide" should keep title (not redundant)
      expect(setupFile.title).toBe('Complete Installation Guide');

      await helper.stopServer();
    });
  });
});