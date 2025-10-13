/**
 * Black-box end-to-end tests for tool integration scenarios
 * These tests exercise the complete documentation workflow using multiple tools together
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const sleep = promisify(setTimeout);

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

describe('Tool Integration E2E Tests', () => {
  let serverProcess: ChildProcess;
  let tempDocsPath: string;

  beforeAll(() => {
    // Create a temporary documentation directory for integration testing
    tempDocsPath = join(__dirname, 'fixtures', 'e2e', 'temp-integration');
    if (!existsSync(tempDocsPath)) {
      mkdirSync(tempDocsPath, { recursive: true });
    }

    // Create simple test documentation files
    writeFileSync(join(tempDocsPath, 'simple-guide.md'), `# Simple Guide

## Getting Started
This is a simple getting started section with basic information.

### Installation
Install the software with this command:
\`\`\`bash
npm install
\`\`\`

### Configuration
Configure the application by editing the config file.

## Usage
Basic usage instructions go here.

### Commands
Common commands include:
- npm start
- npm test

## Advanced Topics
Advanced configuration and usage patterns.`);

    writeFileSync(join(tempDocsPath, 'api-docs.md'), `# API Documentation

## Overview
This API provides endpoints for managing resources.

## Authentication
All requests require authentication using Bearer tokens.

### API Key Authentication
Include your API key in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### Users Endpoint
\`\`\`
GET /api/users
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns a list of users.

### Projects Endpoint
\`\`\`
POST /api/projects
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

Creates a new project.

## Error Handling
The API returns standard HTTP status codes and error messages.`);
  });

  afterAll(() => {
    // Clean up temporary files
    // Note: In a real scenario, you might want to clean up temp files
  });

  afterEach(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await sleep(100);
    }
  });

  async function sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      if (!serverProcess.stdin || !serverProcess.stdout) {
        reject(new Error('Server process not properly initialized'));
        return;
      }

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();

        // Try to parse complete JSON-RPC response
        try {
          const lines = responseData.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              serverProcess.stdout?.removeListener('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Not yet a complete JSON response, continue accumulating
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 10 seconds for integration tests
      setTimeout(() => {
        serverProcess.stdout?.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  async function startServer(args: string[] = []): Promise<void> {
    const serverArgs = [
      join(__dirname, '..', '..', 'dist', 'index.js'),
      '--docs-path', tempDocsPath,
      ...args
    ];

    serverProcess = spawn('node', serverArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Wait a moment for the server to start
    await sleep(100);

    // Ensure the server is ready by sending initialization
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

    const initResponse = await sendRequest(initRequest);
    expect(initResponse.error).toBeUndefined();
  }

  describe('Basic Tool Integration Workflow', () => {
    beforeEach(async () => {
      await startServer();
    });

    it('should handle complete documentation discovery workflow', async () => {
      // Step 1: List all available documentation files
      const listRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_documentation_files',
          arguments: {}
        }
      };

      const listResponse = await sendRequest(listRequest);
      expect(listResponse.error).toBeUndefined();

      const listContent = listResponse.result.content[0];
      const files = JSON.parse(listContent.text);
      expect(files.length).toBeGreaterThanOrEqual(2);

      const fileNames = files.map((file: any) => file.filename);
      expect(fileNames).toContain('simple-guide.md');
      expect(fileNames).toContain('api-docs.md');

      // Step 2: Get table of contents for simple guide
      const tocRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-guide.md'
          }
        }
      };

      const tocResponse = await sendRequest(tocRequest);
      expect(tocResponse.error).toBeUndefined();

      const tocContent = tocResponse.result.content[0];
      const sections = JSON.parse(tocContent.text);
      expect(sections.length).toBeGreaterThan(0);

      // Step 3: Read a specific section
      const firstSection = sections[0];
      const readRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'simple-guide.md',
            section_ids: [firstSection.id]
          }
        }
      };

      const readResponse = await sendRequest(readRequest);
      expect(readResponse.error).toBeUndefined();

      const readContent = readResponse.result.content[0];
      const readSections = JSON.parse(readContent.text);
      expect(readSections.length).toBe(1);
      expect(readSections[0].title).toBe(firstSection.id);
      expect(readSections[0].content).toBeDefined();

      // Step 4: Search for specific content
      const searchRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'npm install|Bearer|API',
            filename: 'simple-guide.md'
          }
        }
      };

      const searchResponse = await sendRequest(searchRequest);
      expect(searchResponse.error).toBeUndefined();

      const searchContent = searchResponse.result.content[0];
      const searchResult = JSON.parse(searchContent.text);
      expect(searchResult.results[0].filename).toBe('simple-guide.md');
    });

    it('should handle API documentation exploration workflow', async () => {
      // Step 1: Get table of contents for API documentation
      const tocRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'api-docs.md'
          }
        }
      };

      const tocResponse = await sendRequest(tocRequest);
      expect(tocResponse.error).toBeUndefined();

      const tocContent = tocResponse.result.content[0];
      const sections = JSON.parse(tocContent.text);
      expect(sections.length).toBeGreaterThan(0);

      // Step 2: Search for authentication-related content
      const searchRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'Bearer|Authorization|API.*key',
            filename: 'api-docs.md'
          }
        }
      };

      const searchResponse = await sendRequest(searchRequest);
      expect(searchResponse.error).toBeUndefined();

      const searchContent = searchResponse.result.content[0];
      const searchResult = JSON.parse(searchContent.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);

      // Step 3: Read the authentication section if it exists
      const authSection = sections.find((s: any) =>
        s.title.toLowerCase().includes('auth')
      );

      if (authSection) {
        const readRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              filename: 'api-docs.md',
              section_ids: [authSection.id]
            }
          }
        };

        const readResponse = await sendRequest(readRequest);
        expect(readResponse.error).toBeUndefined();

        const readContent = readResponse.result.content[0];
        const readSections = JSON.parse(readContent.text);
        expect(readSections.length).toBe(1);
        expect(typeof readSections[0].content).toBe('string');
      }
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      await startServer();
    });

    it('should handle errors gracefully across all tools', async () => {
      // Test 1: List files (should work)
      const listRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_documentation_files',
          arguments: {}
        }
      };

      const listResponse = await sendRequest(listRequest);
      expect(listResponse.error).toBeUndefined();

      // Test 2: Try to read non-existent file
      const readRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'non-existent.md',
            section_ids: ['some-section']
          }
        }
      };

      const readResponse = await sendRequest(readRequest);
      expect(readResponse.error).toBeUndefined();
      expect(readResponse.result.content[0].type).toBe('text');

      const readContent = readResponse.result.content[0];
      const readError = JSON.parse(readContent.text);
      expect(readError.error.code).toBe('FILE_NOT_FOUND');

      // Test 3: Try to search in non-existent file
      const searchRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test',
            filename: 'non-existent.md'
          }
        }
      };

      const searchResponse = await sendRequest(searchRequest);
      expect(searchResponse.error).toBeUndefined();
      expect(searchResponse.result.content[0].type).toBe('text');

      const searchContent = searchResponse.result.content[0];
      const searchError = JSON.parse(searchContent.text);
      expect(searchError.error.code).toBe('FILE_NOT_FOUND');

      // Test 4: Try TOC for non-existent file
      const tocRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'non-existent.md'
          }
        }
      };

      const tocResponse = await sendRequest(tocRequest);
      expect(tocResponse.error).toBeUndefined();
      expect(tocResponse.result.content[0].type).toBe('text');

      const tocContent = tocResponse.result.content[0];
      const tocError = JSON.parse(tocContent.text);
      expect(tocError.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Configuration Integration', () => {
    it('should respect max-depth configuration across all tools', async () => {
      await startServer(['--max-toc-depth', '2']);

      // Test that table_of_contents respects max depth
      const tocRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'table_of_contents',
          arguments: {
            filename: 'simple-guide.md'
          }
        }
      };

      const tocResponse = await sendRequest(tocRequest);
      expect(tocResponse.error).toBeUndefined();

      const tocContent = tocResponse.result.content[0];
      const sections = JSON.parse(tocContent.text);

      // Should only include sections up to depth 2
      const hasLevel3OrDeeper = sections.some((s: any) => s.level > 2);
      expect(hasLevel3OrDeeper).toBe(false);

      // Search should still work normally regardless of max-depth
      const searchRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'installation',
            filename: 'simple-guide.md'
          }
        }
      };

      const searchResponse = await sendRequest(searchRequest);
      expect(searchResponse.error).toBeUndefined();

      const searchContent = searchResponse.result.content[0];
      const searchResult = JSON.parse(searchContent.text);
      expect(searchResult.results[0].matches.length).toBeGreaterThan(0);
    });
  });
});