/**
 * Black-box end-to-end tests for read_sections tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('read_sections E2E Tests', () => {
  let helper: E2ETestHelper;

  beforeAll(async () => {
    helper = E2ETestHelper.create('read-sections');
    await helper.startServer();
  }, 10000);

  afterAll(async () => {
    await helper.stopServer();
  });

  describe('tools/list - verify read_sections tool availability', () => {
    it('should list read_sections tool with correct schema', async () => {
      const tool = await helper.verifyToolAvailable('read_sections');

      // Check required parameters
      expect(tool.inputSchema.required).toContain('filename');
      expect(tool.inputSchema.required).toContain('section_ids');

      // Check parameter definitions
      expect(tool.inputSchema.properties.filename).toBeDefined();
      expect(tool.inputSchema.properties.section_ids).toBeDefined();
    });
  });

  describe('read_sections tool - basic functionality', () => {
    it('should read a single section from complex-guide.md', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['developer-guide/getting-started']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);

      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();

      // Parse the JSON response
      const sectionsData = JSON.parse(content.text);
      expect(Array.isArray(sectionsData)).toBe(true);
      expect(sectionsData.length).toBe(1);

      const sectionData = sectionsData[0];
      expect(sectionData.title).toBe('developer-guide/getting-started');
      expect(sectionData.content).toBeDefined();

      // Verify the section content is returned
      expect(sectionData.content).toContain('This section helps you get up and running quickly');
    });

    it('should read multiple sections from complex-guide.md', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['developer-guide/getting-started/prerequisites', 'developer-guide/getting-started/installation']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();

      // Parse the JSON response
      const sectionsData = JSON.parse(content.text);
      expect(Array.isArray(sectionsData)).toBe(true);
      expect(sectionsData.length).toBe(2);

      // Check first section
      const section1 = sectionsData.find((s: any) => s.title === 'developer-guide/getting-started/prerequisites');
      expect(section1).toBeDefined();
      expect(section1.content).toContain('Node.js 18 or higher');

      // Check second section
      const section2 = sectionsData.find((s: any) => s.title === 'developer-guide/getting-started/installation');
      expect(section2).toBeDefined();
      expect(section2.content).toContain('Clone the repository');
    });

    it('should read nested sections with proper hierarchy', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['developer-guide/core-concepts/architecture-overview/frontend-components', 'developer-guide/core-concepts/architecture-overview/backend-services']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const frontendSection = sectionsData.find((s: any) => s.title === 'developer-guide/core-concepts/architecture-overview/frontend-components');
      expect(frontendSection).toBeDefined();
      expect(frontendSection.content).toContain('React for user interface');

      const backendSection = sectionsData.find((s: any) => s.title === 'developer-guide/core-concepts/architecture-overview/backend-services');
      expect(backendSection).toBeDefined();
      expect(backendSection.content).toContain('RESTful API endpoints');
    });
  });

  describe('read_sections tool - special characters and edge cases', () => {
    it('should handle sections with special characters', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'edge-cases.md',
            section_ids: ['edge-cases-special-characters/special-characters-encoding/unicode-characters']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const unicodeSection = sectionsData[0];
      expect(unicodeSection.title).toBe('edge-cases-special-characters/special-characters-encoding/unicode-characters');
      expect(unicodeSection.content).toContain('café');
      expect(unicodeSection.content).toContain('résumé');
      expect(unicodeSection.content).toContain('∑');
    });

    it('should handle sections with code blocks and markdown formatting', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'edge-cases.md',
            section_ids: ['header-with-asterisks-and-_underscores_/code-blocks-inline-code/fenced-code-blocks']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const codeSection = sectionsData[0];
      expect(codeSection.content).toContain('function greet');
      expect(codeSection.content).toContain('def calculate_sum');
    });

    it('should handle empty sections', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'edge-cases.md',
            section_ids: ['edge-cases-special-characters/empty-section-test']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const emptySection = sectionsData[0];
      expect(emptySection.title).toBe('edge-cases-special-characters/empty-section-test');
      // Content might be empty or contain minimal text
      expect(typeof emptySection.content).toBe('string');
    });
  });

  describe('read_sections tool - API documentation testing', () => {
    it('should read sections with complex technical content', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'api-docs.md',
            section_ids: ['api-documentation/authentication/api-key-authentication']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const authSection = sectionsData[0];
      expect(authSection.title).toBe('api-documentation/authentication/api-key-authentication');
      expect(authSection.content).toContain('Authorization: Bearer YOUR_API_KEY');
    });

    it('should handle sections with code examples and JSON', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'api-docs.md',
            section_ids: ['api-documentation/endpoints/user-management/get-current-user', 'api-documentation/error-handling/error-response-format']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const userSection = sectionsData.find((s: any) => s.title === 'api-documentation/endpoints/user-management/get-current-user');
      expect(userSection).toBeDefined();
      expect(userSection.content).toContain('GET /api/v2/user');
      expect(userSection.content).toContain('"id": "user_123"');

      const errorSection = sectionsData.find((s: any) => s.title === 'api-documentation/error-handling/error-response-format');
      expect(errorSection).toBeDefined();
      expect(errorSection.content).toContain('All error responses follow this format:');
    });

    it('should read SDK and library sections', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'api-docs.md',
            section_ids: ['api-documentation/sdk-libraries/javascripttypescript']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const sdkSection = sectionsData[0];
      expect(sdkSection.title).toBe('api-documentation/sdk-libraries/javascripttypescript');
      expect(sdkSection.content).toContain('npm install @example/api-client');
      expect(sdkSection.content).toContain('import { APIClient }');
    });
  });

  describe('read_sections tool - error handling', () => {
    it('should handle non-existent filename', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'non-existent-file.md',
            section_ids: ['some-section']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();

      // Parse the error response from content
      const errorData = JSON.parse(content.text);
      expect(errorData.error).toBeDefined();
      expect(errorData.error.code).toBe('FILE_NOT_FOUND');
      expect(errorData.error.message).toContain('The specified file was not found');
    });

    it('should handle invalid section IDs', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['non-existent-section-id']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const errorData = JSON.parse(content.text);
      expect(errorData.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorData.error.message).toContain('not found');
    });

    it('should handle missing filename parameter', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            section_ids: ['some-section']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const errorData = JSON.parse(content.text);
      expect(errorData.error.code).toBe('INVALID_PARAMETER');
      expect(errorData.error.message).toContain('filename parameter is required');
    });

    it('should handle missing section_ids parameter', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md'
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const errorData = JSON.parse(content.text);
      expect(errorData.error.code).toBe('INVALID_PARAMETER');
      expect(errorData.error.message).toContain('section_ids parameter must be a non-empty array');
    });

    it('should handle empty section_ids array', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: []
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const errorData = JSON.parse(content.text);
      expect(errorData.error.code).toBe('INVALID_PARAMETER');
      expect(errorData.error.message).toContain('section_ids parameter must be a non-empty array');
    });

    it('should handle invalid section ID format', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['invalid@#$%^&*()section-id']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const errorData = JSON.parse(content.text);
      expect(errorData.error.code).toBe('SECTION_NOT_FOUND');
      expect(errorData.error.message).toContain('not found');
    });
  });

  describe('read_sections tool - advanced scenarios', () => {
    it('should read deeply nested sections', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['developer-guide/advanced-features/custom-plugins/plugin-development']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const pluginSection = sectionsData[0];
      expect(pluginSection.title).toBe('developer-guide/advanced-features/custom-plugins/plugin-development');
      expect(pluginSection.content).toContain('Implement the plugin interface');
    });

    it('should handle multiple files with same section names', async () => {
      const request1: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'complex-guide.md',
            section_ids: ['developer-guide']
          }
        }
      };

      const request2: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'api-docs.md',
            section_ids: ['api-documentation']
          }
        }
      };

      const response1 = await helper.sendRequest(request1);
      const response2 = await helper.sendRequest(request2);

      expect(response1.error).toBeUndefined();
      expect(response2.error).toBeUndefined();

      // Both should contain introduction but with different content
      const content1 = response1.result.content[0];
      const content2 = response2.result.content[0];

      const sections1 = JSON.parse(content1.text);
      const sections2 = JSON.parse(content2.text);

      expect(sections1[0].content).toContain('Welcome to the complete developer guide');
      expect(sections2[0].content).toContain('Welcome to the comprehensive API documentation');
    });

    it('should read very long sections without performance issues', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'read_sections',
          arguments: {
            filename: 'edge-cases.md',
            section_ids: ['script-with-special-characters/section-with-very-long-content']
          }
        }
      };

      const response = await helper.sendRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const content = response.result.content[0];
      const sectionsData = JSON.parse(content.text);

      const longSection = sectionsData[0];
      expect(longSection.title).toBe('script-with-special-characters/section-with-very-long-content');
      expect(longSection.content).toContain('Lorem ipsum dolor sit amet');
      expect(longSection.content).toContain('Sed ut perspiciatis');
    });
  });
});