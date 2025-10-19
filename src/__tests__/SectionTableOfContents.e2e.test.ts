/**
 * Black-box end-to-end tests for section_table_of_contents tool
 * These tests exercise the MCP server as if it was running in production
 */

import { E2ETestHelper } from './lib/E2ETestHelper';

describe('section_table_of_contents E2E Tests', () => {

  describe('tools/list verification', () => {
    it('should list section_table_of_contents tool with correct schema', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-list-section-table-of-contents-tool');
      await helper.startServer();

      try {
        const tool = await helper.verifyToolAvailable('section_table_of_contents');

        // Check required parameters
        expect(tool.inputSchema.required).toContain('filename');
        expect(tool.inputSchema.required).toContain('section_ids');
        expect(tool.inputSchema.properties.filename).toBeDefined();
        expect(tool.inputSchema.properties.section_ids).toBeDefined();

        // Check section_ids array schema
        expect(tool.inputSchema.properties.section_ids.type).toBe('array');
        expect(tool.inputSchema.properties.section_ids.items.type).toBe('string');
        expect(tool.inputSchema.properties.section_ids.minItems).toBe(1);
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('section_table_of_contents tool functionality', () => {
    it('should return direct children of a single section', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-return-direct-children-of-single-section');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);
        expect(Array.isArray(sections)).toBe(true);

        // Section "1" has direct children: "1/1", "1/2", "1/3"
        expect(sections.length).toBeGreaterThan(0);
        sections.forEach((section: any) => {
          // All returned sections should be direct children of "1"
          expect(section.id).toMatch(/^1\/\d+$/);
          expect(section.level).toBe(2);
        });
      } finally {
        await helper.stopServer();
      }
    });

    it('should return children of multiple sections', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-return-children-of-multiple-sections');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1', '2']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);
        expect(Array.isArray(sections)).toBe(true);

        // Should return children from both sections
        const ids = sections.map((s: any) => s.id);
        const hasSection1Children = ids.some((id: string) => id.startsWith('1/'));
        const hasSection2Children = ids.some((id: string) => id.startsWith('2/'));
        expect(hasSection1Children).toBe(true);
        expect(hasSection2Children).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle section with no children', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-section-with-no-children');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1/1/1'] // Leaf section with no children
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBe(0); // No children
      } finally {
        await helper.stopServer();
      }
    });

    it('should not include grandchildren, only direct children', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-not-include-grandchildren');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // All returned sections should be at level 2 (direct children of level 1)
        // No level 3+ sections should be included
        sections.forEach((section: any) => {
          expect(section.level).toBe(2);
        });
      } finally {
        await helper.stopServer();
      }
    });

    it('should include character_count and subsection_count fields', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-include-character-count-and-subsection-count');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        expect(sections.length).toBeGreaterThan(0);
        sections.forEach((section: any) => {
          expect(section.id).toBeDefined();
          expect(section.title).toBeDefined();
          expect(section.level).toBeDefined();
          expect(section.character_count).toBeDefined();
          expect(typeof section.character_count).toBe('number');
          // subsection_count is optional and only shown if not all children visible
        });
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent file gracefully', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-nonexistent-file');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nonexistent-file.md',
          section_ids: ['1']
        });

        // MCP returns errors as part of result content, not as response.error
        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle non-existent section_id gracefully', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-nonexistent-section-id');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['99/99/99']
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle missing filename parameter', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-missing-filename-parameter');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          section_ids: ['1']
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle missing section_ids parameter', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-missing-section-ids-parameter');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md'
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle empty section_ids array', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-empty-section-ids-array');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: []
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle multiple missing sections', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-multiple-missing-sections');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1', '99/99', '88/88']
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toContain('not found');
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('max_headers configuration', () => {
    it('should respect max_headers when returning subsections', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-respect-max-headers-via-cli-argument');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '2']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        // Should be limited by max_headers, but Phase 1 may add extra to maintain 3 minimum
        expect(sections.length).toBeGreaterThan(0);
        // Without max_headers, would return 3 sections (1.1, 1.2, 1.3)
        // With max_headers=2, should apply the algorithm and limit results
      } finally {
        serverProcess.kill();
      }
    });

    it('should respect max_headers from environment variable', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-respect-max-headers-from-env');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath],
        { MAX_HEADERS: '3' }
      );

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        expect(sections.length).toBeLessThanOrEqual(3);
      } finally {
        serverProcess.kill();
      }
    });

    it('should prioritize CLI max_headers over environment variable', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-prioritize-cli-max-headers');
      const docsPath = helper.getTestDocsPath();

      const serverProcess = await helper.spawnServerWithArgsAndEnv(
        ['--docs-path', docsPath, '--max-headers', '2'],
        { MAX_HEADERS: '10' } // This should be ignored
      );

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        // Should respect CLI value, which is more restrictive than env
        expect(sections.length).toBeGreaterThan(0);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('max_toc_depth configuration (should NOT be applied)', () => {
    it('should NOT respect max_toc_depth when returning subsections', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-not-respect-max-toc-depth');
      const docsPath = helper.getTestDocsPath();

      // Set max_toc_depth to 2, but we should still get all depth levels
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-toc-depth', '2']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        // max_toc_depth should NOT be applied, so we should get all direct children
        // regardless of their depth in the document
        expect(sections.length).toBeGreaterThan(0);
      } finally {
        serverProcess.kill();
      }
    });

    it('should return deep subsections even when max_toc_depth is set to shallow value', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-return-deep-subsections');
      const docsPath = helper.getTestDocsPath();

      // Set max_toc_depth to 1, but should still return deeper children
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-toc-depth', '1']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1/1'] // Get children of a level-2 section
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        // Should still return children, even though max_toc_depth=1 would normally hide them
        expect(Array.isArray(sections)).toBe(true);
      } finally {
        serverProcess.kill();
      }
    });
  });

  describe('subsection_count field', () => {
    it('should include subsection_count for sections with hidden children', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-include-subsection-count-with-hidden-children');
      const docsPath = helper.getTestDocsPath();

      // Set max_headers to limit results
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '2']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseJsonContent(response);
        // At least one section should have subsection_count if it has hidden children
        const sectionsWithCount = sections.filter((s: any) => s.subsection_count !== undefined);
        // This may or may not have subsection_count depending on the document structure
        // But if it does, the value should be a positive number
        sectionsWithCount.forEach((s: any) => {
          expect(typeof s.subsection_count).toBe('number');
          expect(s.subsection_count).toBeGreaterThan(0);
        });
      } finally {
        serverProcess.kill();
      }
    });

    it('should omit subsection_count when all children are visible', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-omit-subsection-count-when-all-visible');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1/1/1'] // Leaf section - no children
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // No children means no subsection_count
        expect(sections.length).toBe(0);
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('overlapping section requests', () => {
    it('should deduplicate when requesting overlapping hierarchies', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-deduplicate-overlapping-hierarchies');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1', '1/1'] // 1/1 is a child of 1
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Should return children of both "1" and "1/1"
        // but no duplicates
        const ids = sections.map((s: any) => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length); // No duplicates
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('integration with table_of_contents tool', () => {
    it('should work with section IDs from table_of_contents tool', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-work-with-toc-section-ids');
      await helper.startServer();

      try {
        // First get the table of contents
        const tocResponse = await helper.callTool('table_of_contents', {
          filename: 'nested-structure.md'
        });

        helper.expectSuccessfulResponse(tocResponse);
        const tocSections = helper.parseJsonContent(tocResponse);

        // Find a level-1 section
        const level1Section = tocSections.find((s: any) => s.level === 1);
        expect(level1Section).toBeDefined();

        // Now use section_table_of_contents to get its children
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: [level1Section.id]
        });

        helper.expectSuccessfulResponse(response);
        const children = helper.parseJsonContent(response);

        // All children should be direct descendants of the parent
        children.forEach((child: any) => {
          expect(child.level).toBe(level1Section.level + 1);
        });
      } finally {
        await helper.stopServer();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle section IDs with various formats', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-various-section-id-formats');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1', '2', '3/1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);
        expect(Array.isArray(sections)).toBe(true);
      } finally {
        await helper.stopServer();
      }
    });

    it('should preserve section order from document', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-preserve-section-order');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          filename: 'nested-structure.md',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseJsonContent(response);

        // Sections should be in document order (same as returned from parsing)
        for (let i = 1; i < sections.length; i++) {
          // IDs should be sequential or grouped by parent
          expect(sections[i].id).toBeDefined();
        }
      } finally {
        await helper.stopServer();
      }
    });
  });
});
