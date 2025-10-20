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
        // With File IDs, ALL files are visible (no shadowing)
        expect(files).toHaveLength(5); // Both versions of README.md, both versions of config.md, plus unique.md

        // Verify both versions of README.md are accessible with different file IDs
        const readmes = files.filter((f: any) => f.filename === 'README.md');
        expect(readmes).toHaveLength(2);
        expect(readmes[0].fileId).toBe('f2'); // Primary README (2nd alphabetically in primary)
        expect(readmes[1].fileId).toBe('f4'); // Secondary README (2nd alphabetically in secondary)
        expect(readmes[0].title).toBe('Primary README');
        expect(readmes[1].title).toBe('Secondary README');

        // Verify both versions of config.md are accessible with different file IDs
        const configs = files.filter((f: any) => f.filename === 'config.md');
        expect(configs).toHaveLength(2);
        expect(configs[0].fileId).toBe('f1'); // Primary config (1st alphabetically in primary)
        expect(configs[1].fileId).toBe('f3'); // Secondary config (1st alphabetically in secondary)
        expect(configs[0].title).toBe('Configuration Guide');
        expect(configs[1].title).toBe('Secondary Configuration');

        // Verify unique file
        const unique = files.find((f: any) => f.filename === 'unique.md');
        expect(unique?.fileId).toBe('f5'); // unique.md (only in secondary)
        expect(unique?.title).toBe('Unique Document');

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
          // title is optional (removed if redundant with filename)
          if (file.title !== undefined) {
            expect(typeof file.title).toBe('string');
          }
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
        const tocResponse1 = await helper.callTool('table_of_contents', { fileId: 'f2'  // guide.md (f2 in alphabetical order)
        });
        helper.expectSuccessfulResponse(tocResponse1);

        const toc1Data = helper.parseJsonContent(tocResponse1);
      const toc1 = toc1Data.sections;
        expect(toc1.length).toBeGreaterThan(0);
        expect(toc1[0].title).toBe('Documentation Guide');

        // Test TOC for file from second directory
        const tocResponse2 = await helper.callTool('table_of_contents', { fileId: 'f4'  // tutorial.md (f4 in alphabetical order)
        });
        helper.expectSuccessfulResponse(tocResponse2);

        const toc2Data = helper.parseJsonContent(tocResponse2);
      const toc2 = toc2Data.sections;
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
          fileId: 'f2',  // guide.md (f2 in alphabetical order)
          maxDepth: 3
        });
        helper.expectSuccessfulResponse(response);

        const tocData = helper.parseJsonContent(response);
        const toc = tocData.sections;

        // Verify hierarchical structure
        const mainSection = toc.find((section: any) => section.id === '1');
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
        const response1 = await helper.callTool('read_sections', { fileId: 'f2',  // guide.md (f2 in alphabetical order),
          section_ids: ['1/1']
        });
        helper.expectSuccessfulResponse(response1);

        const sections1Data = helper.parseJsonContent(response1);
      const sections1 = sections1Data.sections;
        expect(sections1).toHaveLength(1);
        expect(sections1[0].title).toBe('Installation');
        expect(sections1[0].content).toContain('Instructions');

        // Read from second directory
        const response2 = await helper.callTool('read_sections', { fileId: 'f4',  // tutorial.md (f4 in alphabetical order),
          section_ids: ['1/2']
        });
        helper.expectSuccessfulResponse(response2);

        const sections2Data = helper.parseJsonContent(response2);
      const sections2 = sections2Data.sections;
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

        const response = await helper.callTool('read_sections', { fileId: 'f3',  // examples.md (f3 in alphabetical order),
          section_ids: [
            '1/1',
            '1/2/1',
            '1/3'
          ]
        });
        helper.expectSuccessfulResponse(response);

        const readData = helper.parseJsonContent(response);
      const sections = readData.sections;
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
           fileId: 'f2'  // guide.md (f2 in alphabetical order)
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
           fileId: 'f1'  // api.md
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
           fileId: 'f4'  // tutorial.md (f4 in alphabetical order)
        });
        helper.expectSuccessfulResponse(response1);

        const searchResult1 = helper.parseJsonContent(response1);
        expect(searchResult1.results).toHaveLength(1);
        expect(searchResult1.results[0].filename).toBe('tutorial.md');

        // Search in file from second directory
        const response2 = await helper.callTool('search', {
          query: 'authentication',
           fileId: 'f1'  // api.md
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

        const response = await helper.callTool('table_of_contents', { fileId: 'f999'  // nonexistent.md (using non-existent ID)
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
        const errorData = helper.parseErrorContent(response);
        // Error message varies based on implementation
        expect(errorData.error.message).toBeDefined();

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

        const response = await helper.callTool('read_sections', { fileId: 'f1',  // missing.md,
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
           fileId: 'f999'  // absent.md (using non-existent ID)
        });

        helper.expectErrorWithCode(response, 'FILE_NOT_FOUND');
        const searchErrorData = helper.parseErrorContent(response);
        // Error message varies based on implementation
        expect(searchErrorData.error.message).toBeDefined();

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

        const response = await helper.callTool('read_sections', { fileId: 'f2',  // guide.md (f2 in alphabetical order),
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

        const response = await helper.callTool('read_sections', { fileId: 'f2',  // guide.md (f2 in alphabetical order),
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
      const tocResponse = await helper.callTool('table_of_contents', { fileId: 'f2'  // guide.md (f2 in alphabetical order)
      });
      helper.expectSuccessfulResponse(tocResponse);
      const tocData = helper.parseJsonContent(tocResponse);
      const toc = tocData.sections;
      expect(toc.length).toBeGreaterThan(0);

      // Step 3: Read specific sections
      // Select sections that are not parent-child related to avoid filtering
      // For example, if toc = [doc-guide, doc-guide/install, doc-guide/config, ...]
      // we want to select sibling sections like [doc-guide/install, doc-guide/config]
      // or select top-level sections that don't have parent-child relationships
      const sectionIds = toc.slice(0, 2).map((section: any) => section.id);
      const readResponse = await helper.callTool('read_sections', { fileId: 'f2',  // guide.md (f2 in alphabetical order),
        section_ids: sectionIds
      });
      helper.expectSuccessfulResponse(readResponse);
      const readData = helper.parseJsonContent(readResponse);
      const sections = readData.sections;

      // If the second section is a child of the first, it will be filtered out
      // to avoid duplication (child content is already in parent)
      // So we expect either the same number of sections or fewer if filtering occurred
      expect(sections.length).toBeLessThanOrEqual(sectionIds.length);
      expect(sections.length).toBeGreaterThan(0);

      // Step 4: Search within the file
      const searchResponse = await helper.callTool('search', {
        query: 'configuration',
         fileId: 'f2'  // guide.md (f2 in alphabetical order)
      });
      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results).toBeDefined();

      // Step 5: Work with file from second directory
      const toc2Response = await helper.callTool('table_of_contents', { fileId: 'f4'  // tutorial.md (f4 in alphabetical order)
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
      const tocResponse = await helper.callTool('table_of_contents', { fileId: 'f2'  // README.md (primary/README.md is f2, has Overview section)
      });
      helper.expectSuccessfulResponse(tocResponse);
      const tocData = helper.parseJsonContent(tocResponse);
      const toc = tocData.sections;
      const overviewSection = toc.find((s: any) => s.title === 'Overview');
      expect(overviewSection).toBeDefined();

      // Verify read sections uses primary version
      const readResponse = await helper.callTool('read_sections', { fileId: 'f2',  // README.md (primary/README.md is f2, has Overview section),
        section_ids: ['1/1']
      });
      helper.expectSuccessfulResponse(readResponse);
      const readData = helper.parseJsonContent(readResponse);
      const sections = readData.sections;
      expect(sections[0].content).toContain('Project overview from primary directory');

      // Verify search uses primary version
      const searchResponse = await helper.callTool('search', {
        query: 'overview',
         fileId: 'f2'  // README.md (primary/README.md is f2, has Overview section)
      });
      helper.expectSuccessfulResponse(searchResponse);
      const searchResult = helper.parseJsonContent(searchResponse);
      expect(searchResult.results[0].filename).toBe('README.md');

      await helper.stopServer();
    });
  });
});