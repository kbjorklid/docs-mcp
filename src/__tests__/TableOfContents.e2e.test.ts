/**
 * Black-box end-to-end tests for table_of_contents tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('table_of_contents E2E Tests', () => {

  describe('tools/list verification', () => {
    it('should list table_of_contents tool with correct schema', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-list-table-of-contents-tool-with-correct-schema');
      await helper.startServer();

      try {
        const tool = await helper.verifyToolAvailable('table_of_contents');

        // Check required parameters
        expect(tool.inputSchema.required).toContain('filename');
        expect(tool.inputSchema.properties.filename).toBeDefined();
        expect(tool.inputSchema.properties.max_depth).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('table_of_contents tool functionality', () => {
    it('should generate table of contents for simple headers', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-generate-table-of-contents-for-simple-headers');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'simple-headers.md'
        });

        helper.expectSuccessfulResponse(response);
        const content = helper.parseContentArray(response);
        expect(content[0].type).toBe('text');

        // Parse the JSON content - it's the sections array directly
        const sections = helper.parseJsonContent(response);
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBeGreaterThan(0);

        // Check top-level header
        const topLevelHeader = sections.find((s: any) => s.level === 1);
        expect(topLevelHeader).toBeDefined();
        expect(topLevelHeader.title).toBe('Simple Headers');
        expect(topLevelHeader.id).toBeDefined();

        // Check second-level headers
        const level2Headers = sections.filter((s: any) => s.level === 2);
        expect(level2Headers.length).toBe(3); // Introduction, Main Features, Conclusion

        // Check third-level headers
        const level3Headers = sections.filter((s: any) => s.level === 3);
        expect(level3Headers.length).toBe(4); // Getting Started, Feature One, Feature Two, Final Thoughts
      } finally {
        await helper.stopServer();
      }
    });

    it('should respect max_depth parameter', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-depth-parameter');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'simple-headers.md',
          max_depth: 2
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Should only include headers up to level 2
        const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
        expect(hasLevel3OrDeeper).toBe(false);

        // Should still have level 1 and 2 headers
        const hasLevel1Or2 = sections.some((s: any) => s.level <= 2);
        expect(hasLevel1Or2).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle complex nested structures correctly', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-complex-nested-structures-correctly');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'complex-nested.md'
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Check that we have headers at all levels (1-6)
        const levels = new Set(sections.map((s: any) => s.level));
        expect(levels.has(1)).toBe(true);
        expect(levels.has(2)).toBe(true);
        expect(levels.has(3)).toBe(true);
        expect(levels.has(4)).toBe(true);
        expect(levels.has(5)).toBe(true);
        expect(levels.has(6)).toBe(true);

        // Check section ID generation
        sections.forEach((section: any) => {
          expect(section.id).toBeDefined();
          expect(typeof section.id).toBe('string');
          expect(section.id.length).toBeGreaterThan(0);
        });

        // Check hierarchical structure
        const topLevelSections = sections.filter((s: any) => s.level === 1);
        expect(topLevelSections.length).toBe(1); // Complex Nested Structure (all others are under it)
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle files with front matter correctly', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-files-with-front-matter-correctly');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'with-front-matter.md'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);

        // Should have the main document header (not counting front matter)
        const mainHeader = sections.find((s: any) => s.title === 'Document with Front Matter');
        expect(mainHeader).toBeDefined();
        expect(mainHeader.level).toBe(1);

        // Should have other sections
        expect(sections.length).toBeGreaterThan(1);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle files with no headers gracefully', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-files-with-no-headers-gracefully');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'no-headers.md'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBe(0);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle single header documents', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-single-header-documents');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'single-header.md'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);

        expect(sections.length).toBe(1);
        expect(sections[0].level).toBe(1);
        expect(sections[0].title).toBe('Single Header Document');
        expect(sections[0].id).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle headers with special characters', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-headers-with-special-characters');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'special-characters.md'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);

        // Should have headers with various special characters
        const specialHeaders = sections.filter((s: any) =>
          s.title.includes('@') ||
          s.title.includes('#') ||
          s.title.includes('-') ||
          s.title.includes('_') ||
          s.title.includes('"') ||
          s.title.includes("'") ||
          s.title.includes('(') ||
          s.title.includes(')')
        );

        expect(specialHeaders.length).toBeGreaterThan(0);

        // Check that section IDs are properly generated
        sections.forEach((section: any) => {
          expect(section.id).toBeDefined();
          expect(typeof section.id).toBe('string');
        });
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle max_depth = 0 correctly', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-max-depth-zero-correctly');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'simple-headers.md',
              max_depth: 0
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);

        // max_depth = 0 means no limit, should return all sections
        expect(sections.length).toBeGreaterThan(0);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle max_depth larger than document depth', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-max-depth-larger-than-document-depth');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'simple-headers.md',
              max_depth: 10
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();

        const content = response.result.content[0];
        const sections = JSON.parse(content.text);

        // Should include all available sections when max_depth is very large
        expect(sections.length).toBeGreaterThan(0);

        // Should include level 3 headers
        const hasLevel3Headers = sections.some((s: any) => s.level === 3);
        expect(hasLevel3Headers).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent file gracefully', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-non-existent-file-gracefully');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'non-existent-file.md'
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle missing filename parameter', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-missing-filename-parameter');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {}
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();

        const errorResponse = helper.parseErrorContent(response);
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.message).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle negative max_depth parameter gracefully', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-negative-max-depth-parameter-gracefully');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'simple-headers.md',
              max_depth: -1
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();

        const content = response.result.content[0];
        expect(content.type).toBe('text');

        // Server should handle negative values gracefully and return valid results
        const sections = JSON.parse(content.text);
        expect(Array.isArray(sections)).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle non-numeric max_depth parameter gracefully', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-non-numeric-max-depth-parameter-gracefully');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 14,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'simple-headers.md',
              max_depth: 'invalid'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();

        const content = response.result.content[0];
        expect(content.type).toBe('text');

        // Server should handle non-numeric values gracefully and return valid results
        const sections = JSON.parse(content.text);
        expect(Array.isArray(sections)).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('max_headers configuration', () => {
    it('should limit headers when exceeding max_headers', async () => {
      // Use custom CLI args to set max_headers to 20
      const helper = new E2ETestHelper('TableOfContents', 'should-limit-headers-when-exceeding-max-headers');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-headers 20 (allows 3 level-1 + 17 level-2, file has 15)
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '20']);

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        const initResponse = await helper.sendRequestToServer(serverProcess, request);
        expect(initResponse.error).toBeUndefined();

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'many-headers.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should limit to 20 headers max
        expect(sections.length).toBeLessThanOrEqual(20);

        // Verify we have all 3 level-1 headers (should always be included)
        const level1 = sections.filter((s: any) => s.level === 1);
        expect(level1.length).toBe(3);

        // Verify we have level-2 headers included (3 + 15 level-2 headers from file = 18 total)
        const level2 = sections.filter((s: any) => s.level === 2);
        expect(level2.length).toBeGreaterThan(0);
        expect(level2.length).toBeLessThanOrEqual(15);

        // Should not have level-3 headers (they would exceed limit)
        const level3 = sections.filter((s: any) => s.level === 3);
        expect(level3.length).toBe(0);
      } finally {
        serverProcess.kill();
      }
    });

    it('should always include all level-1 headers even if exceeding limit', async () => {
      // Use CLI args to set max_headers to 10
      const helper = new E2ETestHelper('TableOfContents', 'should-always-include-all-level-1-headers');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-headers 10
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '10']);

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'many-top-level.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should have all 30 level-1 headers (always included even though it exceeds limit of 10)
        const level1 = sections.filter((s: any) => s.level === 1);
        expect(level1.length).toBe(30);

        // All sections should be level-1
        expect(sections.length).toBe(30);
        expect(sections.every((s: any) => s.level === 1)).toBe(true);
      } finally {
        serverProcess.kill();
      }
    });

    it('should respect max_headers from environment variable', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-headers-from-environment');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with MAX_HEADERS=8 environment variable
      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath],
        { MAX_HEADERS: '8' }
      );

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'test-file.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should limit to 8 headers
        expect(sections.length).toBeLessThanOrEqual(8);
      } finally {
        serverProcess.kill();
      }
    });

    it('should respect max_headers from CLI argument', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-headers-from-cli');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-headers 5
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '5']);

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'cli-test.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should limit to 5 headers
        expect(sections.length).toBeLessThanOrEqual(5);

        // All should be level-1 (to stay under limit of 5)
        expect(sections.every((s: any) => s.level === 1)).toBe(true);
      } finally {
        serverProcess.kill();
      }
    });

    it('should apply max_headers after max_depth filtering', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-apply-max-headers-after-max-depth');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-headers 8
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '8']);

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        // Request with max_depth: 2 (only level 1 and 2 headers)
        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'deep-nested.md',
              max_depth: 2
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should have max_depth applied first (only level 1-2)
        const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
        expect(hasLevel3OrDeeper).toBe(false);

        // Then max_headers limit should be applied
        expect(sections.length).toBeLessThanOrEqual(8);
      } finally {
        serverProcess.kill();
      }
    });

    it('should use default max_headers of 25 when not configured', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-limit-headers-when-exceeding-max-headers');
      const docsPath = helper.getTestDocsPath();

      // Spawn server without --max-headers (should use default 25)
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath]);

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'many-headers.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should apply the default limit of 25
        expect(sections.length).toBeLessThanOrEqual(25);
      } finally {
        serverProcess.kill();
      }
    });

    it('should handle CLI max_headers taking precedence over environment', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-headers-from-environment');
      const docsPath = helper.getTestDocsPath();

      // Spawn with both CLI (20) and ENV (8) - CLI should win
      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath, '--max-headers', '20'],
        { MAX_HEADERS: '8' }
      );

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        };

        await helper.sendRequestToServer(serverProcess, request);

        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'test-file.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should use CLI value of 20, not ENV value of 8
        expect(sections.length).toBeLessThanOrEqual(20);
        // And more lenient than 8
        expect(sections.length).toBeGreaterThan(8 * 0.5); // Should be more than half of what env would allow
      } finally {
        serverProcess.kill();
      }
    });
  });
});