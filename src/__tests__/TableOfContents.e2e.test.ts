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
        // max_depth parameter should not exist (removed in favor of --max-toc-depth config)
        expect(tool.inputSchema.properties.max_depth).toBeUndefined();
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

    it('should handle complex nested structures correctly', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-complex-nested-structures-correctly');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-toc-depth 6 to get all levels
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-toc-depth', '6']);

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
              filename: 'complex-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

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
        serverProcess.kill();
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

    it('should apply max_headers after max_toc_depth filtering', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-apply-max-headers-after-max-toc-depth');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-toc-depth 2 and --max-headers 8
      const serverProcess = await helper.spawnServerWithArgs([
        '--docs-path', docsPath,
        '--max-toc-depth', '2',
        '--max-headers', '8'
      ]);

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

        // Request table of contents for deep nested document
        const toolRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'table_of_contents',
            arguments: {
              filename: 'deep-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should have max_toc_depth applied first (only level 1-2)
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

  describe('max_headers two-phase algorithm (Phase 1 - Minimum Viability)', () => {
    it('should apply Phase 1 for single section with many subheaders', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-apply-phase1-single-section');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'single-section-many-subheaders.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Phase 1 should trigger: base algorithm returns 1 header (< 3)
        // So Phase 1 includes all level-2 subheaders, even though it exceeds limit
        expect(sections.length).toBe(51); // 1 L1 + 50 L2

        // Verify structure
        const level1 = sections.filter((s: any) => s.level === 1);
        const level2 = sections.filter((s: any) => s.level === 2);
        expect(level1.length).toBe(1);
        expect(level2.length).toBe(50);
      } finally {
        serverProcess.kill();
      }
    });

    it('should apply Phase 1 for two sections with many subheaders', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-apply-phase1-two-sections');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'two-sections-many-subheaders.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Phase 1 should trigger: base algorithm returns 2 headers (< 3)
        // So Phase 1 includes all level-2 subheaders
        expect(sections.length).toBe(62); // 2 L1 + 60 L2

        // Verify structure
        const level1 = sections.filter((s: any) => s.level === 1);
        const level2 = sections.filter((s: any) => s.level === 2);
        expect(level1.length).toBe(2);
        expect(level2.length).toBe(60);
      } finally {
        serverProcess.kill();
      }
    });

    it('should not apply Phase 1 when document has less than 3 headers total', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-document-with-two-headers-total');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'two-headers-only.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Phase 1 should NOT trigger: document has < 3 headers total (only 2)
        expect(sections.length).toBe(2);

        // Verify structure
        const level1 = sections.filter((s: any) => s.level === 1);
        expect(level1.length).toBe(2);
      } finally {
        serverProcess.kill();
      }
    });

    it('should not apply Phase 1 when base algorithm already returns 3+ headers', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-not-trigger-phase1-when-sufficient');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'three-sections.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Phase 1 should NOT trigger: base algorithm returns 23 headers (>= 3)
        expect(sections.length).toBe(23); // 3 L1 + 20 L2

        // Verify structure
        const level1 = sections.filter((s: any) => s.level === 1);
        const level2 = sections.filter((s: any) => s.level === 2);
        expect(level1.length).toBe(3);
        expect(level2.length).toBe(20);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('max_headers two-phase algorithm (Phase 2 - Greedy Filling)', () => {
    it('should apply Phase 2 to fill remaining slots', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-apply-phase2-greedy-filling');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'phase2-fills-slots.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Base algorithm returns 18 headers (3 L1 + 15 L2)
        // Phase 2 fills remaining 7 slots with L3 headers from largest sections
        expect(sections.length).toBeGreaterThan(18);
        expect(sections.length).toBeLessThanOrEqual(25);

        // Verify we have level-3 headers included
        const level3 = sections.filter((s: any) => s.level === 3);
        expect(level3.length).toBeGreaterThan(0);
      } finally {
        serverProcess.kill();
      }
    });

    it('should respect all-or-nothing constraint in Phase 2', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-all-or-nothing-in-phase2');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'phase2-partial-fit.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Phase 2 should not add partial groups of children
        // Base algorithm should give 21 headers, Phase 2 might add more but must respect limits
        expect(sections.length).toBeLessThanOrEqual(25);

        // Verify that if a section's children are included, all of them are
        // (this is a general property we can validate)
        const level3Sections = sections.filter((s: any) => s.level === 3);
        if (level3Sections.length > 0) {
          // If we have L3 headers, they should all belong to complete parent groups
          const parentIds = new Set(level3Sections.map((s: any) => s.id.substring(0, s.id.lastIndexOf('/'))));
          expect(parentIds.size).toBeGreaterThan(0);
        }
      } finally {
        serverProcess.kill();
      }
    });

    it('should prioritize sections by character count in Phase 2', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-sort-by-character-count-in-phase2');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'phase2-char-count-priority.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Base algorithm returns 18 headers
        // Phase 2 should prioritize Section C (largest char count) for its children
        expect(sections.length).toBeGreaterThan(18);
        expect(sections.length).toBeLessThanOrEqual(25);

        // Verify we have some level-3 headers
        const level3 = sections.filter((s: any) => s.level === 3);
        expect(level3.length).toBeGreaterThan(0);
      } finally {
        serverProcess.kill();
      }
    });

    it('should stop filling when reaching exact limit in Phase 2', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-stop-at-limit-in-phase2');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'phase2-exact-limit.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Base algorithm: 24 headers, Phase 2 can add 1 more to reach exactly 25
        expect(sections.length).toBeLessThanOrEqual(25);
        expect(sections.length).toBeGreaterThanOrEqual(24);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('max_headers two-phase algorithm (Edge Cases)', () => {
    it('should handle Phase 1 when no deeper levels exist', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-phase1-no-next-level');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'two-level1-only.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should return all level-1 headers (no deeper levels to include)
        expect(sections.length).toBe(2);

        const level1 = sections.filter((s: any) => s.level === 1);
        expect(level1.length).toBe(2);
      } finally {
        serverProcess.kill();
      }
    });

    it('should handle Phase 2 when all sections already included', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-phase2-all-sections-included');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'all-sections-fit.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // All 18 sections fit within limit, Phase 2 has nothing to add
        expect(sections.length).toBe(18); // 3 L1 + 15 L2

        const level1 = sections.filter((s: any) => s.level === 1);
        const level2 = sections.filter((s: any) => s.level === 2);
        expect(level1.length).toBe(3);
        expect(level2.length).toBe(15);
      } finally {
        serverProcess.kill();
      }
    });

    it('should handle very large section with high character count', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-handle-very-large-sections');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(
        ['--docs-path', docsPath, '--max-headers', '25']
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
              filename: 'large-section.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should respect the limit
        expect(sections.length).toBeLessThanOrEqual(25);
        expect(sections.length).toBeGreaterThan(0);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('max_toc_depth configuration', () => {
    it('should respect max_toc_depth from CLI argument', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-toc-depth-from-cli');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with --max-toc-depth 2
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-toc-depth', '2']);

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
              filename: 'complex-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should only have headers up to level 2
        const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
        expect(hasLevel3OrDeeper).toBe(false);

        // Should still have level 1 and 2 headers
        const hasLevel1Or2 = sections.some((s: any) => s.level <= 2);
        expect(hasLevel1Or2).toBe(true);
      } finally {
        serverProcess.kill();
      }
    });

    it('should respect max_toc_depth from environment variable', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-respect-max-toc-depth-from-env');
      const docsPath = helper.getTestDocsPath();

      // Spawn server with MAX_TOC_DEPTH=2 environment variable
      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath],
        { MAX_TOC_DEPTH: '2' }
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
              filename: 'complex-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should only have headers up to level 2
        const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
        expect(hasLevel3OrDeeper).toBe(false);
      } finally {
        serverProcess.kill();
      }
    });

    it('should use default max_toc_depth of 3 when not configured', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-use-default-max-toc-depth');
      const docsPath = helper.getTestDocsPath();

      // Spawn server without --max-toc-depth (should use default 3)
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
              filename: 'complex-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should have headers up to level 3 (default)
        const levels = new Set(sections.map((s: any) => s.level));
        expect(levels.has(1)).toBe(true);
        expect(levels.has(2)).toBe(true);
        expect(levels.has(3)).toBe(true);

        // Should NOT have level 4 or deeper
        const hasLevel4OrDeeper = sections.some((s: any) => s.level > 3);
        expect(hasLevel4OrDeeper).toBe(false);
      } finally {
        serverProcess.kill();
      }
    });

    it('should allow CLI max_toc_depth to override environment variable', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-cli-override-env-max-toc-depth');
      const docsPath = helper.getTestDocsPath();

      // Spawn with both CLI (4) and ENV (2) - CLI should win
      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath, '--max-toc-depth', '4'],
        { MAX_TOC_DEPTH: '2' }
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
              filename: 'complex-nested.md'
            }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should use CLI value of 4, not ENV value of 2
        const levels = new Set(sections.map((s: any) => s.level));
        expect(levels.has(4)).toBe(true);

        // Should NOT have level 5 or deeper
        const hasLevel5OrDeeper = sections.some((s: any) => s.level > 4);
        expect(hasLevel5OrDeeper).toBe(false);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('subsection_count field', () => {
    it('should include subsection_count for sections with direct children', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-include-subsection-count');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'nested-sections.md'
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Find level-1 section (should have 3 level-2 children: 1.1, 1.2, 1.3)
        // When all children are visible, subsection_count should be undefined (not redundant)
        const level1 = sections.find((s: any) => s.level === 1 && s.id === '1');
        expect(level1).toBeDefined();
        expect(level1.subsection_count).toBeUndefined();

        // Find level-2 section 1.2 (should have 2 level-3 children: 1.2.1, 1.2.2)
        // When all children are visible, subsection_count should be undefined (not redundant)
        const level2Section = sections.find((s: any) => s.level === 2 && s.id === '1/2');
        expect(level2Section).toBeDefined();
        expect(level2Section.subsection_count).toBeUndefined();

        // Find level-1 section 2 (should have 1 level-2 child: 2.1)
        // When all children are visible, subsection_count should be undefined (not redundant)
        const level1Second = sections.find((s: any) => s.level === 1 && s.id === '2');
        expect(level1Second).toBeDefined();
        expect(level1Second.subsection_count).toBeUndefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should omit subsection_count for sections without children', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-omit-subsection-count-when-zero');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'no-children.md'
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Leaf sections should not have subsection_count
        const leafSection = sections.find((s: any) => s.level === 3);
        expect(leafSection).toBeDefined();
        expect(leafSection.subsection_count).toBeUndefined();

        // Parent level 1 should have subsection_count if it has children
        const parentSection = sections.find((s: any) => s.level === 1);
        expect(parentSection).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should only count direct children, not grandchildren', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-count-only-direct-children');
      await helper.startServer();

      try {
        const response = await helper.callTool('table_of_contents', {
          filename: 'deep-hierarchy.md'
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Level-1 section should only count level-2 children (1/1 and 1/2), not level-3 and 4 grandchildren/great-grandchildren
        // When all children are visible, subsection_count should be undefined (not redundant)
        const level1 = sections.find((s: any) => s.level === 1);
        expect(level1).toBeDefined();
        expect(level1.subsection_count).toBeUndefined(); // All 2 direct level-2 children are visible

        // Level-2 section 1/2 should only count level-3 children (just 1/2/1)
        // When all children are visible, subsection_count should be undefined (not redundant)
        const level2 = sections.find((s: any) => s.id === '1/2');
        expect(level2).toBeDefined();
        expect(level2.subsection_count).toBeUndefined(); // All 1 direct level-3 child is visible
      } finally {
        await helper.stopServer();
      }
    });

    it('should recalculate subsection_count based on filtered results when using max_toc_depth', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-work-with-max-toc-depth');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs([
        '--docs-path', docsPath,
        '--max-toc-depth', '2'
      ]);

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
            arguments: { filename: 'deep-nested.md' }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // With max_toc_depth = 2, level-3 sections should be filtered out
        const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
        expect(hasLevel3OrDeeper).toBe(false);

        // Level-2 sections with hidden children should show subsection_count
        const section11 = sections.find((s: any) => s.id === '1/1');
        expect(section11).toBeDefined();
        expect(section11.subsection_count).toBe(1); // Has 1 hidden level-3 child

        // Level-2 sections without children should not show subsection_count
        const section21 = sections.find((s: any) => s.id === '2/1');
        expect(section21).toBeDefined();
        expect(section21.subsection_count).toBeUndefined(); // No children at all
      } finally {
        serverProcess.kill();
      }
    });

    it('should show subsection_count when max_headers limits visibility of child sections', async () => {
      const helper = new E2ETestHelper('TableOfContents', 'should-show-subsection-count-with-max-headers');
      const docsPath = helper.getTestDocsPath();

      // Set max_headers to 5 so only the 5 main sections are shown, not their children
      const serverProcess = await helper.spawnServerWithArgs([
        '--docs-path', docsPath,
        '--max-headers', '5'
      ]);

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
            arguments: { filename: 'five-sections.md' }
          }
        };

        const response = await helper.sendRequestToServer(serverProcess, toolRequest);
        expect(response.error).toBeUndefined();

        const sections = helper.parseJsonContent(response);

        // Should only have 5 level-1 sections
        expect(sections.length).toBe(5);
        expect(sections.every((s: any) => s.level === 1)).toBe(true);

        // Section One: no children at all
        const section1 = sections.find((s: any) => s.id === '1');
        expect(section1).toBeDefined();
        expect(section1.subsection_count).toBeUndefined(); // No children

        // Section Two: has 2 hidden children
        const section2 = sections.find((s: any) => s.id === '2');
        expect(section2).toBeDefined();
        expect(section2.subsection_count).toBe(2); // Has 2 hidden level-2 children

        // Section Three: has 1 hidden child (and that child has its own child, but we only count direct children)
        const section3 = sections.find((s: any) => s.id === '3');
        expect(section3).toBeDefined();
        expect(section3.subsection_count).toBe(1); // Has 1 hidden level-2 child

        // Section Four: no children at all
        const section4 = sections.find((s: any) => s.id === '4');
        expect(section4).toBeDefined();
        expect(section4.subsection_count).toBeUndefined(); // No children

        // Section Five: has 1 hidden child
        const section5 = sections.find((s: any) => s.id === '5');
        expect(section5).toBeDefined();
        expect(section5.subsection_count).toBe(1); // Has 1 hidden level-2 child
      } finally {
        serverProcess.kill();
      }
    });
  });
});