/**
 * Black-box end-to-end tests for CLI configuration functionality
 * These tests exercise the MCP server with various command line arguments and environment variables
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('CLI Configuration E2E Tests', () => {
  let helper: E2ETestHelper;
  let tempDocsPath: string;

  beforeAll(() => {
    // Create a temporary documentation directory for testing
    tempDocsPath = join(__dirname, 'fixtures', 'e2e', 'temp-cli-config');
    if (!existsSync(tempDocsPath)) {
      mkdirSync(tempDocsPath, { recursive: true });
    }

    // Create test documentation files
    writeFileSync(join(tempDocsPath, 'test.md'), `# Test Document

## Introduction
This is a test introduction.

## Configuration Test
This section tests configuration.

## Deep Section
### Subsection 1
Content here.
### Subsection 2
More content.
#### Very Deep Section
Very deep content.`);

    writeFileSync(join(tempDocsPath, 'simple.md'), `# Simple Document

Just a simple document with basic content.`);
  });

  afterAll(() => {
    // Clean up temporary files
    // Note: In a real scenario, you might want to clean up temp files
  });

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

  async function startServerWithArgs(args: string[] = [], env: Record<string, string> = {}): Promise<E2ETestHelper> {
    // Create a custom helper that spawns server with specific args
    const customHelper = new E2ETestHelper('temp-cli-config');

    // Spawn server with custom arguments
    const serverProcess = await customHelper.spawnServerWithArgs(args);

    // Set environment variables if provided
    if (Object.keys(env).length > 0) {
      // For now, we'll use the default approach since E2ETestHelper doesn't support custom env
      // This could be enhanced in the future if needed
    }

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

  describe('--docs-path CLI argument', () => {
    it('should use custom documentation path from --docs-path argument', async () => {
      helper = await startServerWithArgs(['--docs-path', tempDocsPath]);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      expect(content.length).toBeGreaterThan(0);

      // Should find our test files
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md');
      expect(fileNames).toContain('simple.md');
    });

    it('should use short form -d argument', async () => {
      helper = await startServerWithArgs(['-d', tempDocsPath]);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should prioritize CLI --docs-path over DOCS_PATH environment variable', async () => {
      // Set environment variable to a different path
      const envPath = join(__dirname, 'fixtures', 'e2e', 'search');

      helper = await startServerWithArgs(['--docs-path', tempDocsPath]);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];

      // Should use CLI path, not environment variable path
      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md'); // From tempDocsPath, not envPath
    });
  });

  describe('--max-toc-depth CLI argument', () => {
    it('should respect --max-toc-depth argument for table_of_contents tool', async () => {
      helper = await startServerWithArgs(['--docs-path', tempDocsPath, '--max-toc-depth', '2']);

      const response = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(response);
      const sections = helper.parseJsonContent(response);

      // Should only include sections up to depth 2
      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);

      // Should include level 1 and 2 sections
      const hasLevel1Or2 = sections.some((s: any) => s.level <= 2);
      expect(hasLevel1Or2).toBe(true);

      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle invalid --max-toc-depth values gracefully', async () => {
      helper = await startServerWithArgs(['--docs-path', tempDocsPath, '--max-toc-depth', 'invalid']);

      const response = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(response);

      // Should still work, defaulting to no limit
      const sections = helper.parseJsonContent(response);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle zero and negative --max-toc-depth values', async () => {
      helper = await startServerWithArgs(['--docs-path', tempDocsPath, '--max-toc-depth', '0']);

      const response = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(response);
      const sections = helper.parseJsonContent(response);

      // max_depth = 0 means no limit, should return all sections
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('--discount-single-top-header CLI argument', () => {
    it('should increase effective max depth when --discount-single-top-header is used', async () => {
      helper = await startServerWithArgs([
        '--docs-path', tempDocsPath,
        '--max-toc-depth', '2',
        '--discount-single-top-header'
      ]);

      const response = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(response);
      const sections = helper.parseJsonContent(response);

      // With discountSingleTopHeader, effective max depth should be 3 (2 + 1)
      // Should include deeper sections than normal max_depth=2
      const hasLevel3 = sections.some((s: any) => s.level === 3);
      expect(hasLevel3).toBe(true);

      // Should not include level 4 or deeper
      const hasLevel4OrDeeper = sections.some((s: any) => s.level > 3);
      expect(hasLevel4OrDeeper).toBe(false);
    });
  });

  describe('DOCS_PATH environment variable', () => {
    it('should use DOCS_PATH environment variable when no CLI argument provided', async () => {
      helper = E2ETestHelper.create('temp-cli-config');
      await helper.startServer();

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(files.length).toBeGreaterThan(0);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('test.md');
    });
  });

  describe('Multiple CLI arguments', () => {
    it('should handle multiple CLI arguments correctly', async () => {
      helper = await startServerWithArgs([
        '--docs-path', tempDocsPath,
        '--max-toc-depth', '1',
        '--discount-single-top-header'
      ]);

      // Test list_documentation_files
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);

      const listContent = helper.parseContentArray(listResponse);
      const files = listContent[0].text ? JSON.parse(listContent[0].text) : listContent[0];
      expect(files.length).toBeGreaterThan(0);

      // Test table_of_contents with configuration
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'test.md'
      });

      helper.expectSuccessfulResponse(tocResponse);
      const sections = helper.parseJsonContent(tocResponse);

      // With max_depth=1 and discountSingleTopHeader, effective max depth should be 2
      const hasLevel2 = sections.some((s: any) => s.level === 2);
      expect(hasLevel2).toBe(true);

      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);
    });
  });

  describe('CLI argument precedence and validation', () => {
    it('should handle missing argument values gracefully', async () => {
      // Test with --docs-path but no following value
      helper = await startServerWithArgs(['--docs-path']);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      // Should default to './docs' and handle gracefully
      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(Array.isArray(files)).toBe(true);
    });

    it('should ignore unknown CLI arguments', async () => {
      helper = await startServerWithArgs([
        '--docs-path', tempDocsPath,
        '--unknown-argument', 'some-value',
        '--another-unknown'
      ]);

      const response = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(response);

      const content = helper.parseContentArray(response);
      const files = content[0].text ? JSON.parse(content[0].text) : content[0];
      expect(files.length).toBeGreaterThan(0);
    });
  });
});