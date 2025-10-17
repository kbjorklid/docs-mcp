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

        const content = response.result.content[0];
        expect(content.type).toBe('text');

        const errorResponse = JSON.parse(content.text);
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toBeDefined();
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
});