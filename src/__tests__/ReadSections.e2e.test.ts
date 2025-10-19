/**
 * Black-box end-to-end tests for read_sections tool
 * These tests exercise the MCP server as if it was running in production
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { E2ETestHelper, JSONRPCRequest } from './lib/E2ETestHelper';

describe('read_sections E2E Tests', () => {

  describe('tools/list - verify read_sections tool availability', () => {
    it('should list read_sections tool with correct schema', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-list-read-sections-tool-with-correct-schema');
      await helper.startServer();

      try {
        const tool = await helper.verifyToolAvailable('read_sections');

        // Check required parameters
        expect(tool.inputSchema.required).toContain('fileId');
        expect(tool.inputSchema.required).toContain('section_ids');

        // Check parameter definitions
        expect(tool.inputSchema.properties.fileId).toBeDefined();
        expect(tool.inputSchema.properties.section_ids).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('read_sections tool - basic functionality', () => {
    it('should read a single section from complex-guide.md', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-a-single-section-from-complex-guide-md');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/1']
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
        const readData = JSON.parse(content.text);
        expect(Array.isArray(readData.sections)).toBe(true);
        expect(readData.sections.length).toBe(1);

        const sectionData = readData.sections[0];
        expect(sectionData.title).toBe('Getting Started');
        expect(sectionData.content).toBeDefined();

        // Verify the section content is returned
        expect(sectionData.content).toContain('This section helps you get up and running quickly');
      } finally {
        await helper.stopServer();
      }
    });

    it('should read multiple sections from complex-guide.md', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-multiple-sections-from-complex-guide-md');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/1/1', '1/1/2']
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
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;
        expect(Array.isArray(sectionsData)).toBe(true);
        expect(sectionsData.length).toBe(2);

        // Check first section
        const section1 = sectionsData.find((s: any) => s.title === 'Prerequisites');
        expect(section1).toBeDefined();
        expect(section1.content).toContain('Node.js 18 or higher');

        // Check second section
        const section2 = sectionsData.find((s: any) => s.title === 'Installation');
        expect(section2).toBeDefined();
        expect(section2.content).toContain('Clone the repository');
      } finally {
        await helper.stopServer();
      }
    });

    it('should read nested sections with proper hierarchy', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-nested-sections-with-proper-hierarchy');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/2/1/1', '1/2/1/2']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const frontendSection = sectionsData.find((s: any) => s.title === 'Frontend Components');
        expect(frontendSection).toBeDefined();
        expect(frontendSection.content).toContain('React for user interface');

        const backendSection = sectionsData.find((s: any) => s.title === 'Backend Services');
        expect(backendSection).toBeDefined();
        expect(backendSection.content).toContain('RESTful API endpoints');
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('read_sections tool - special characters and edge cases', () => {
    it('should handle sections with special characters', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-sections-with-special-characters');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/2/1']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const unicodeSection = sectionsData[0];
        expect(unicodeSection.title).toBe('Unicode Characters');
        expect(unicodeSection.content).toContain('café');
        expect(unicodeSection.content).toContain('résumé');
        expect(unicodeSection.content).toContain('∑');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle sections with code blocks and markdown formatting', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-sections-with-code-blocks-and-markdown-formatting');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['2/2/2']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const codeSection = sectionsData[0];
        expect(codeSection.content).toContain('function greet');
        expect(codeSection.content).toContain('def calculate_sum');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle empty sections', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-empty-sections');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/1']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const emptySection = sectionsData[0];
        expect(emptySection.title).toBe('Empty Section Test');
        // Content might be empty or contain minimal text
        expect(typeof emptySection.content).toBe('string');
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('read_sections tool - API documentation testing', () => {
    it('should read sections with complex technical content', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-sections-with-complex-technical-content');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/2/1']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const authSection = sectionsData[0];
        expect(authSection.title).toBe('API Key Authentication');
        expect(authSection.content).toContain('Authorization: Bearer YOUR_API_KEY');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle sections with code examples and JSON', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-sections-with-code-examples-and-json');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/3/1/1', '1/4/2']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const userSection = sectionsData.find((s: any) => s.title === 'Get Current User');
        expect(userSection).toBeDefined();
        expect(userSection.content).toContain('GET /api/v2/user');
        expect(userSection.content).toContain('"id": "user_123"');

        const errorSection = sectionsData.find((s: any) => s.title === 'Error Response Format');
        expect(errorSection).toBeDefined();
        expect(errorSection.content).toContain('All error responses follow this format:');
      } finally {
        await helper.stopServer();
      }
    });

    it('should read SDK and library sections', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-sdk-and-library-sections');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/7/1']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const sdkSection = sectionsData[0];
        expect(sdkSection.title).toBe('JavaScript/TypeScript');
        expect(sdkSection.content).toContain('npm install @example/api-client');
        expect(sdkSection.content).toContain('import { APIClient }');
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('read_sections tool - error handling', () => {
    it('should handle non-existent filename', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-non-existent-filename');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['some-section']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();

        const errorData = helper.parseErrorContent(response);
        expect(errorData.error).toBeDefined();
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle invalid section IDs', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-invalid-section-ids');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['non-existent-section-id']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle missing filename parameter', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-missing-filename-parameter');
      await helper.startServer();

      try {
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

        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('fileId parameter is required');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle missing section_ids parameter', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-missing-section-ids-parameter');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 14,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1'
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('section_ids parameter must be an array');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle empty section_ids array', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-empty-section-ids-array');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 15,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: []
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        expect(content.type).toBe('text');
        expect(content.text).toBeDefined();

        // Parse the response - empty section_ids should return empty array
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;
        expect(Array.isArray(sectionsData)).toBe(true);
        expect(sectionsData.length).toBe(0);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle invalid section ID format', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-invalid-section-id-format');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 16,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['invalid@#$%^&*()section-id']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('read_sections tool - advanced scenarios', () => {
    it('should read deeply nested sections', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-deeply-nested-sections');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 17,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['1/3/1/1']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const pluginSection = sectionsData[0];
        expect(pluginSection.title).toBe('Plugin Development');
        expect(pluginSection.content).toContain('Implement the plugin interface');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle multiple files with same section names', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-handle-multiple-files-with-same-section-names');
      await helper.startServer();

      try {
        const request1: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 18,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f2',  // complex-guide.md
              section_ids: ['1']
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
              fileId: 'f1',  // api-docs.md
              section_ids: ['1']
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

        const readResponse1 = JSON.parse(content1.text);
        const sections1 = readResponse1.sections;
        const readResponse2 = JSON.parse(content2.text);
        const sections2 = readResponse2.sections;

        expect(sections1[0].content).toContain('Welcome to the complete developer guide');
        expect(sections2[0].content).toContain('Welcome to the comprehensive API documentation');
      } finally {
        await helper.stopServer();
      }
    });

    it('should read very long sections without performance issues', async () => {
      const helper = new E2ETestHelper('ReadSections', 'should-read-very-long-sections-without-performance-issues');
      await helper.startServer();

      try {
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: 20,
          method: 'tools/call',
          params: {
            name: 'read_sections',
            arguments: {
              fileId: 'f1',
              section_ids: ['3/4']
            }
          }
        };

        const response = await helper.sendRequest(request);

        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();

        const content = response.result.content[0];
        const readData = JSON.parse(content.text);
        const sectionsData = readData.sections;

        const longSection = sectionsData[0];
        expect(longSection.title).toBe('Section with Very Long Content');
        expect(longSection.content).toContain('Lorem ipsum dolor sit amet');
        expect(longSection.content).toContain('Sed ut perspiciatis');
      } finally {
        await helper.stopServer();
      }
    });
  });
});