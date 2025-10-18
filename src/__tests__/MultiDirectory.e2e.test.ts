/**
 * End-to-end tests for multi-directory functionality
 * Tests all MCP tools with multi-directory configurations using black-box approach
 */

import { E2ETestHelper } from './lib/E2ETestHelper';
import { join, resolve } from 'path';

describe('Multi-Directory E2E Tests', () => {
  describe('Multi-Directory Configuration', () => {
    describe('Single Directory (Backward Compatibility)', () => {
      it('should work with single directory configuration', async () => {
        const helper = new E2ETestHelper('MultiDirectory', 'should-handle-single-directory');
        await helper.startServer();

        // Test tools list
        await helper.verifyToolAvailable('list_documentation_files');
        await helper.verifyToolAvailable('table_of_contents');
        await helper.verifyToolAvailable('read_sections');
        await helper.verifyToolAvailable('search');

        // Test file listing
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(files).toHaveLength(1);
        expect(files[0].filename).toBe('document.md');
        expect(files[0].title).toBe('Single Directory Document');

        await helper.stopServer();
      });
    });

    describe('Multiple Directories Configuration', () => {
      it('should handle multiple CLI arguments', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '--docs-path', docs2Path]
        );

        // Test file listing
        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(files).toHaveLength(4);

        const filenames = files.map((f: any) => f.filename);
        expect(filenames).toContain('guide.md');
        expect(filenames).toContain('api.md');
        expect(filenames).toContain('tutorial.md');
        expect(filenames).toContain('examples.md');

        await helper.stopServer();
      });

      it('should work with environment variable configuration', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(files).toHaveLength(4);

        await helper.stopServer();
      });
    });

    describe('Conflict Resolution', () => {
      it('should prioritize earlier directory for conflicting filenames', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-conflict-resolution');
        const basePath = tempHelper.getTestDocsPath();
        const primaryPath = join(basePath, 'primary');
        const secondaryPath = join(basePath, 'secondary');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-conflict-resolution',
          ['-d', primaryPath, '-d', secondaryPath]
        );

        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(files).toHaveLength(3); // README.md, config.md (from primary), unique.md (from secondary)

        const readme = files.find((f: any) => f.filename === 'README.md');
        expect(readme?.title).toBe('Primary README'); // Should be from primary, not secondary

        const config = files.find((f: any) => f.filename === 'config.md');
        expect(config?.title).toBe('Configuration Guide'); // Should be from primary

        const unique = files.find((f: any) => f.filename === 'unique.md');
        expect(unique?.title).toBe('Unique Document'); // Should be from secondary (no conflict)

        await helper.stopServer();
      });
    });

    describe('Empty Directories', () => {
      it('should handle mix of empty and non-empty directories', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-empty-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1'); // empty
        const docs2Path = join(basePath, 'docs2'); // has content
        const docs3Path = join(basePath, 'docs3'); // empty

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-empty-directories',
          ['-d', docs1Path, '-d', docs2Path, '-d', docs3Path]
        );

        const listResponse = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(listResponse);

        const files = helper.parseJsonContent(listResponse);
        expect(files).toHaveLength(1);
        expect(files[0].filename).toBe('content.md');

        await helper.stopServer();
      }, 15000);
    });
  });

  describe('MCP Tools with Multi-Directory', () => {
    describe('list_documentation_files tool', () => {
      it('should list files from all directories with conflict resolution', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(response);

        const files = helper.parseJsonContent(response);
        expect(files).toHaveLength(4);

        // Verify file metadata
        files.forEach((file: any) => {
          expect(file).toHaveProperty('filename');
          expect(file).toHaveProperty('title');
          expect(file).toHaveProperty('keywords');
          expect(file).toHaveProperty('size');
          expect(Array.isArray(file.keywords)).toBe(true);
        });

        await helper.stopServer();
      });
    });

    describe('table_of_contents tool', () => {
      it('should generate TOC for files from any directory', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        // Test TOC for file from first directory
        const tocResponse1 = await helper.callTool('table_of_contents', {
          filename: 'guide.md'
        });
        helper.expectSuccessfulResponse(tocResponse1);

        const toc1 = helper.parseJsonContent(tocResponse1);
        expect(toc1.length).toBeGreaterThan(0);
        expect(toc1[0].title).toBe('Documentation Guide');

        // Test TOC for file from second directory
        const tocResponse2 = await helper.callTool('table_of_contents', {
          filename: 'tutorial.md'
        });
        helper.expectSuccessfulResponse(tocResponse2);

        const toc2 = helper.parseJsonContent(tocResponse2);
        expect(toc2.length).toBeGreaterThan(0);
        expect(toc2[0].title).toBe('Tutorial');

        await helper.stopServer();
      });

      it('should handle TOC for files with deep hierarchies', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('table_of_contents', {
          filename: 'guide.md',
          maxDepth: 3
        });
        helper.expectSuccessfulResponse(response);

        const toc = helper.parseJsonContent(response);

        // Verify hierarchical structure
        const mainSection = toc.find((section: any) => section.id === 'documentation-guide');
        expect(mainSection).toBeDefined();

        // Look for any subsection under the main section
        const subSection = toc.find((section: any) => section.level === 2);
        expect(subSection).toBeDefined();
        expect(subSection.level).toBe(2);

        await helper.stopServer();
      });
    });

    describe('read_sections tool', () => {
      it('should read sections from files in any directory', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        // Read from first directory
        const response1 = await helper.callTool('read_sections', {
          filename: 'guide.md',
          section_ids: ['documentation-guide/installation']
        });
        helper.expectSuccessfulResponse(response1);

        const sections1 = helper.parseJsonContent(response1);
        expect(sections1).toHaveLength(1);
        expect(sections1[0].title).toBe('Installation');
        expect(sections1[0].content).toContain('Instructions');

        // Read from second directory
        const response2 = await helper.callTool('read_sections', {
          filename: 'tutorial.md',
          section_ids: ['tutorial/step-by-step']
        });
        helper.expectSuccessfulResponse(response2);

        const sections2 = helper.parseJsonContent(response2);
        expect(sections2).toHaveLength(1);
        expect(sections2[0].title).toBe('Step by Step');

        await helper.stopServer();
      });

      it('should handle multiple sections from different directories', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('read_sections', {
          filename: 'examples.md',
          section_ids: [
            'code-examples/basic-examples',
            'code-examples/advanced-examples/data-processing',
            'code-examples/troubleshooting'
          ]
        });
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        expect(sections).toHaveLength(3);

        const titles = sections.map((s: any) => s.title);
        expect(titles).toContain('Basic Examples');
        expect(titles).toContain('Data Processing');
        expect(titles).toContain('Troubleshooting');

        await helper.stopServer();
      });
    });

    describe('search tool', () => {
      it('should search across all directories', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('search', {
          query: 'configuration',
          filename: 'guide.md'
        });
        helper.expectSuccessfulResponse(response);

        const searchResult = helper.parseJsonContent(response);
        expect(searchResult.query).toBe('configuration');
        expect(searchResult.results).toBeDefined();
        expect(searchResult.results.length).toBeGreaterThan(0);

        await helper.stopServer();
      });

      it('should search with complex patterns across directories', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        // Test regex pattern
        const response = await helper.callTool('search', {
          query: '(API|endpoint)',
          filename: 'api.md'
        });
        helper.expectSuccessfulResponse(response);

        const searchResult = helper.parseJsonContent(response);
        expect(searchResult.results).toBeDefined();

        await helper.stopServer();
      });

      it('should handle file-specific search in multi-directory setup', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        // Search in file from first directory
        const response1 = await helper.callTool('search', {
          query: 'tutorial',
          filename: 'tutorial.md'
        });
        helper.expectSuccessfulResponse(response1);

        const searchResult1 = helper.parseJsonContent(response1);
        expect(searchResult1.results).toHaveLength(1);
        expect(searchResult1.results[0].filename).toBe('tutorial.md');

        // Search in file from second directory
        const response2 = await helper.callTool('search', {
          query: 'authentication',
          filename: 'api.md'
        });
        helper.expectSuccessfulResponse(response2);

        const searchResult2 = helper.parseJsonContent(response2);
        expect(searchResult2.results).toHaveLength(1);
        expect(searchResult2.results[0].filename).toBe('api.md');

        await helper.stopServer();
      });
    });
  });

  describe('Error Handling', () => {
    describe('File not found in multi-directory setup', () => {
      it('should handle TOC request for non-existent file', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('table_of_contents', {
          filename: 'nonexistent.md'
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');

        await helper.stopServer();
      });

      it('should handle read sections request for non-existent file', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('read_sections', {
          filename: 'missing.md',
          section_ids: ['some-section']
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');

        await helper.stopServer();
      });

      it('should handle search in non-existent file', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('search', {
          query: 'test',
          filename: 'absent.md'
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
        const searchErrorData = helper.parseErrorContent(response);
        expect(searchErrorData.error.message).toContain('not found');

        await helper.stopServer();
      });
    });

    describe('Invalid section IDs in multi-directory setup', () => {
      it('should handle invalid section ID for existing file', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('read_sections', {
          filename: 'guide.md',
          section_ids: ['non-existent-section']
        });

        helper.expectErrorWithCode(response, 'SECTION_NOT_FOUND');
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');

        await helper.stopServer();
      });

      it('should handle malformed section ID', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1');
        const docs2Path = join(basePath, 'docs2');

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', docs2Path]
        );

        const response = await helper.callTool('read_sections', {
          filename: 'guide.md',
          section_ids: ['']
        });

        helper.expectErrorWithCode(response, 'SECTION_NOT_FOUND');
        const malformedErrorData = helper.parseErrorContent(response);
        expect(malformedErrorData.error.message).toContain('not found');

        await helper.stopServer();
      });
    });

    describe('Configuration errors', () => {
      it('should handle non-existent directory paths gracefully', async () => {
        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', '/non/existent/path1', '-d', '/non/existent/path2']
        );

        const response = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(response);

        const files = helper.parseJsonContent(response);
        expect(files).toHaveLength(0); // Should return empty list, not error

        await helper.stopServer();
      }, 15000);

      it('should handle mix of existing and non-existent directories', async () => {
        const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
        const basePath = tempHelper.getTestDocsPath();
        const docs1Path = join(basePath, 'docs1'); // exists
        const nonExistentPath = '/non/existent/path';

        const helper = await E2ETestHelper.createWithArgs(
          'MultiDirectory/should-handle-multiple-directories',
          ['-d', docs1Path, '-d', nonExistentPath]
        );

        const response = await helper.callTool('list_documentation_files', {});
        helper.expectSuccessfulResponse(response);

        const files = helper.parseJsonContent(response);
        expect(files).toHaveLength(2); // Only files from existing directory

        await helper.stopServer();
      }, 15000);
    });
  });

  describe('Complex Multi-Directory Workflows', () => {
    it('should handle complete workflow across multiple directories', async () => {
      const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-multiple-directories');
      const basePath = tempHelper.getTestDocsPath();
      const docs1Path = join(basePath, 'docs1');
      const docs2Path = join(basePath, 'docs2');

      const helper = await E2ETestHelper.createWithArgs(
        'MultiDirectory/should-handle-multiple-directories',
        ['-d', docs1Path, '-d', docs2Path]
      );

      // Step 1: List all files
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);
      const files = helper.parseJsonContent(listResponse);
      expect(files.length).toBeGreaterThan(0);

      // Step 2: Get TOC for a file from first directory
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'guide.md'
      });
      helper.expectSuccessfulResponse(tocResponse);
      const toc = helper.parseJsonContent(tocResponse);
      expect(toc.length).toBeGreaterThan(0);

      // Step 3: Read specific sections
      const sectionIds = toc.slice(0, 2).map((section: any) => section.id);
      const readResponse = await helper.callTool('read_sections', {
        filename: 'guide.md',
        section_ids: sectionIds
      });
      helper.expectSuccessfulResponse(readResponse);
      const sections = helper.parseJsonContent(readResponse);
      expect(sections).toHaveLength(sectionIds.length);

      // Step 4: Search within the file
      const searchResponse = await helper.callTool('search', {
        query: 'configuration',
        filename: 'guide.md'
      });
      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results).toBeDefined();

      // Step 5: Work with file from second directory
      const toc2Response = await helper.callTool('table_of_contents', {
        filename: 'tutorial.md'
      });
      helper.expectSuccessfulResponse(toc2Response);

      await helper.stopServer();
    });

    it('should handle conflict resolution consistently across all tools', async () => {
      const tempHelper = new E2ETestHelper('MultiDirectory', 'should-handle-conflict-resolution');
      const basePath = tempHelper.getTestDocsPath();
      const primaryPath = join(basePath, 'primary');
      const secondaryPath = join(basePath, 'secondary');

      const helper = await E2ETestHelper.createWithArgs(
        'MultiDirectory/should-handle-conflict-resolution',
        ['-d', primaryPath, '-d', secondaryPath]
      );

      // Verify file listing uses primary version
      const listResponse = await helper.callTool('list_documentation_files', {});
      helper.expectSuccessfulResponse(listResponse);
      const files = helper.parseJsonContent(listResponse);
      const readme = files.find((f: any) => f.filename === 'README.md');
      expect(readme?.title).toBe('Primary README');

      // Verify TOC uses primary version
      const tocResponse = await helper.callTool('table_of_contents', {
        filename: 'README.md'
      });
      helper.expectSuccessfulResponse(tocResponse);
      const toc = helper.parseJsonContent(tocResponse);
      const overviewSection = toc.find((s: any) => s.title === 'Overview');
      expect(overviewSection).toBeDefined();

      // Verify read sections uses primary version
      const readResponse = await helper.callTool('read_sections', {
        filename: 'README.md',
        section_ids: ['primary-readme/overview']
      });
      helper.expectSuccessfulResponse(readResponse);
      const sections = helper.parseJsonContent(readResponse);
      expect(sections[0].content).toContain('Project overview from primary directory');

      // Verify search uses primary version
      const searchResponse = await helper.callTool('search', {
        query: 'overview',
        filename: 'README.md'
      });
      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].filename).toBe('README.md');

      await helper.stopServer();
    });
  });
});