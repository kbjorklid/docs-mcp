/**
 * Helper class for end-to-end MCP server testing
 * Reduces duplication across e2e test files by providing common server setup,
 * JSON-RPC communication, and assertion utilities.
 */

import { spawn, ChildProcess } from 'child_process';
import { join, resolve } from 'path';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class E2ETestHelper {
  private serverProcess: ChildProcess | null = null;
  private testDocsPath: string;

  constructor(testFixtureDir: string);
  constructor(testClassName: string, testCaseName: string);
  constructor(testFixtureDirOrClassName: string, testCaseName?: string) {
    if (testCaseName !== undefined) {
      // New isolated test directory structure: className/testCaseName
      this.testDocsPath = join(__dirname, '..', 'fixtures', 'e2e', testFixtureDirOrClassName, testCaseName);
    } else {
      // Legacy structure: single directory name
      this.testDocsPath = join(__dirname, '..', 'fixtures', 'e2e', testFixtureDirOrClassName);
    }
  }

  // Method to get the test docs path (useful for external spawn calls)
  getTestDocsPath(): string {
    return this.testDocsPath;
  }

  async startServer(): Promise<void> {
    // Spawn the MCP server process
    const serverPath = resolve(__dirname, '..', '..', '..', 'dist', 'index.js');
    this.serverProcess = spawn('node', [serverPath, '--docs-path', this.testDocsPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DOCS_PATH: this.testDocsPath }
    });

    // Wait a moment for the server to start
    await sleep(100);

    // Initialize the server using the exact same logic as original
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

    const initResponse = await this.sendRequest(initRequest);
    if (initResponse.error) {
      throw new Error(`Server initialization failed: ${JSON.stringify(initResponse.error)}`);
    }
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      await sleep(100);
      this.serverProcess = null;
    }
  }

  // Exact copy of the original sendRequest function
  async sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || !this.serverProcess.stdin || !this.serverProcess.stdout) {
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
              this.serverProcess!.stdout?.removeListener('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Not yet a complete JSON response, continue accumulation
        }
      };

      this.serverProcess.stdout?.on('data', onData);
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        this.serverProcess!.stdout?.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  // Exact copy of the original sendRequestToServer function
  async sendRequestToServer(serverProcess: ChildProcess, request: JSONRPCRequest): Promise<JSONRPCResponse> {
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
          // Not yet a complete JSON response, continue accumulation
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        serverProcess.stdout?.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  async spawnServerWithArgs(args: string[]): Promise<ChildProcess> {
    return this.spawnServerWithArgsAndEnv(args, {});
  }

  async spawnServerWithArgsAndEnv(args: string[], env: Record<string, string> = {}): Promise<ChildProcess> {
    const serverPath = resolve(__dirname, '..', '..', '..', 'dist', 'index.js');
    const serverProcess = spawn('node', [serverPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    });

    await sleep(100);
    return serverProcess;
  }

  // Common request builders
  createToolsListRequest(id?: number): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      method: 'tools/list',
      params: {}
    };
  }

  createToolCallRequest(toolName: string, args: any, id?: number): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
  }

  // Common assertion helpers
  expectNoError(response: JSONRPCResponse): void {
    expect(response.error).toBeUndefined();
  }

  expectSuccessfulResponse(response: JSONRPCResponse): void {
    this.expectNoError(response);
    expect(response.result).toBeDefined();
  }

  expectError(response: JSONRPCResponse, expectedErrorCode?: string): void {
    expect(response.error).toBeDefined();
    if (expectedErrorCode) {
      expect(response.error?.code).toBe(expectedErrorCode);
    }
  }

  // Tool-specific helpers
  async verifyToolAvailable(toolName: string): Promise<any> {
    const request = this.createToolsListRequest();
    const response = await this.sendRequest(request);

    this.expectSuccessfulResponse(response);
    expect(response.result.tools).toBeDefined();
    expect(Array.isArray(response.result.tools)).toBe(true);

    const tool = response.result.tools.find((t: any) => t.name === toolName);
    expect(tool).toBeDefined();
    expect(tool.description).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');

    return tool;
  }

  async callTool(toolName: string, args: any): Promise<JSONRPCResponse> {
    const request = this.createToolCallRequest(toolName, args);
    return await this.sendRequest(request);
  }

  // Response parsing helpers
  parseContentArray(response: JSONRPCResponse): any[] {
    this.expectSuccessfulResponse(response);
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    return response.result.content;
  }

  parseTextContent(response: JSONRPCResponse): string {
    const content = this.parseContentArray(response);
    expect(content.length).toBeGreaterThan(0);
    expect(content[0].type).toBe('text');
    return content[0].text;
  }

  parseJsonContent<T = any>(response: JSONRPCResponse): T {
    const text = this.parseTextContent(response);
    return JSON.parse(text);
  }

  // Error response parsing
  parseErrorContent(response: JSONRPCResponse): any {
    this.expectNoError(response);
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    expect(response.result.content.length).toBeGreaterThan(0);
    expect(response.result.content[0].type).toBe('text');

    const text = response.result.content[0].text;
    const errorData = JSON.parse(text);
    expect(errorData.error).toBeDefined();
    return errorData;
  }

  // Custom server initialization with arguments and environment
  async initializeServerWithArgs(args: string[] = [], env: Record<string, string> = {}): Promise<void> {
    const serverProcess = await this.spawnServerWithArgs(args);

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

    const initResponse = await this.sendRequestToServer(serverProcess, initRequest);
    this.expectNoError(initResponse);

    // Store the server process for cleanup
    this.serverProcess = serverProcess;
  }

  // Create and initialize a helper with custom arguments
  static async createWithArgs(testFixtureDir: string, args: string[] = [], env: Record<string, string> = {}): Promise<E2ETestHelper> {
    const helper = new E2ETestHelper(testFixtureDir);
    await helper.initializeServerWithArgs(args, env);
    return helper;
  }

  // Common assertion helpers for specific response patterns
  expectErrorWithCode(response: JSONRPCResponse, expectedCode: string): void {
    this.expectNoError(response);
    const errorData = this.parseErrorContent(response);
    expect(errorData.error.code).toBe(expectedCode);
  }

  expectFileList(response: JSONRPCResponse, expectedFileNames: string[]): void {
    this.expectSuccessfulResponse(response);
    const content = this.parseContentArray(response);
    expect(content.length).toBeGreaterThan(0);

    const files = content[0].text ? JSON.parse(content[0].text) : content[0];
    expect(Array.isArray(files)).toBe(true);

    const fileNames = files.map((file: any) => file.filename);
    expectedFileNames.forEach(fileName => {
      expect(fileNames).toContain(fileName);
    });
  }

  expectSearchResults(response: JSONRPCResponse, expectedQuery: string, expectedMinMatches: number = 1): void {
    this.expectSuccessfulResponse(response);
    const searchResult = this.parseJsonContent(response);
    expect(searchResult.query).toBe(expectedQuery);
    expect(searchResult.results).toBeDefined();
    expect(Array.isArray(searchResult.results)).toBe(true);
    expect(searchResult.results.length).toBeGreaterThanOrEqual(expectedMinMatches);
  }

  expectSectionsInResponse(response: JSONRPCResponse, expectedMinSections: number = 1): void {
    this.expectSuccessfulResponse(response);
    const sections = this.parseJsonContent(response);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(expectedMinSections);
  }

  // Static factory method for use in test files
  static create(testFixtureDir: string): E2ETestHelper {
    return new E2ETestHelper(testFixtureDir);
  }
}