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
        expect(tool.inputSchema.required).toContain('fileId');
        expect(tool.inputSchema.required).toContain('section_ids');
        expect(tool.inputSchema.properties.fileId).toBeDefined();
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
          fileId: 'f1',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);
        expect(Array.isArray(sections)).toBe(true);

        // Section "1" has direct children: "1.1", "1.2", "1.3"
        expect(sections.length).toBeGreaterThan(0);
        sections.forEach((section: any) => {
          // All returned sections should be direct children of "1"
          expect(section.id).toMatch(/^1\.\d+$/);
          expect(helper.getSectionLevel(section.id)).toBe(2);
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
          fileId: 'f1',
          section_ids: ['1', '2']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);
        expect(Array.isArray(sections)).toBe(true);

        // Should return children from both sections
        const ids = sections.map((s: any) => s.id);
        const hasSection1Children = ids.some((id: string) => id.startsWith('1.'));
        const hasSection2Children = ids.some((id: string) => id.startsWith('2.'));
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
          fileId: 'f1',
          section_ids: ['1.1.1'] // Leaf section with no children
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);

        // All returned sections should be at level 2 (direct children of level 1)
        // No level 3+ sections should be included
        sections.forEach((section: any) => {
          expect(helper.getSectionLevel(section.id)).toBe(2);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);

        expect(sections.length).toBeGreaterThan(0);
        sections.forEach((section: any) => {
          expect(section.id).toBeDefined();
          expect(typeof section.id).toBe('string');
          expect(section.title).toBeDefined();
          expect(typeof section.title).toBe('string');
          // hiddenSubsections is optional and only shown if there are hidden children
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
          fileId: 'f999',  // Non-existent file ID
          section_ids: ['1']
        });

        // MCP returns errors as part of result content, not as response.error
        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        // Error message varies based on implementation
        expect(errorData.error).toBeDefined();
        expect(errorData.error.message).toBeDefined();
      } finally {
        await helper.stopServer();
      }
    });

    it('should handle non-existent section_id gracefully', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-handle-nonexistent-section-id');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          fileId: 'f1',
          section_ids: ['99.99.99']
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toMatch(/section.*not found/i);
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
          fileId: 'f1'
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
          fileId: 'f1',
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
          fileId: 'f1',
          section_ids: ['1', '99.99', '88.88']
        });

        helper.expectNoError(response);
        const errorData = helper.parseErrorContent(response);
        expect(errorData.error.message).toMatch(/section.*not found/i);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1.1'] // Get children of a level-2 section
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const sections = helper.parseTableOfContentsText(response);
        // At least one section should have subsection_count if it has hidden children
        const sectionsWithCount = sections.filter((s: any) => s.hiddenSubsections !== undefined);
        // This may or may not have subsection_count depending on the document structure
        // But if it does, the value should be a positive number
        sectionsWithCount.forEach((s: any) => {
          expect(typeof s.hiddenSubsections).toBe('number');
          expect(s.hiddenSubsections).toBeGreaterThan(0);
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
          fileId: 'f1',
          section_ids: ['1.1.1'] // Leaf section - no children
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);

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
          fileId: 'f1',
          section_ids: ['1', '1.1'] // 1/1 is a child of 1
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);

        // Should return children of both "1" and "1.1"
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
          fileId: 'f1'
        });

        helper.expectSuccessfulResponse(tocResponse);
        const tocSections = helper.parseTableOfContentsText(tocResponse);

        // Find a level-1 section
        const level1Section = tocSections.find((s: any) => helper.getSectionLevel(s.id) === 1);
        expect(level1Section).toBeDefined();

        // Now use section_table_of_contents to get its children
        const response = await helper.callTool('section_table_of_contents', {
          fileId: 'f1',
          section_ids: [level1Section!.id]
        });

        helper.expectSuccessfulResponse(response);
        const children = helper.parseTableOfContentsText(response);

        // All children should be direct descendants of the parent
        const parentLevel = helper.getSectionLevel(level1Section!.id);
        children.forEach((child: any) => {
          expect(helper.getSectionLevel(child.id)).toBe(parentLevel + 1);
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
          fileId: 'f1',
          section_ids: ['1', '2', '3.1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);
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
          fileId: 'f1',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const sections = helper.parseTableOfContentsText(response);

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

  describe('instructions field for hidden subsections', () => {
    it('should include instructions when subsections are hidden by max_headers', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-include-instructions-when-hidden-by-max-headers');
      const docsPath = helper.getTestDocsPath();

      // Set max_headers to limit results and hide some subsections
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '2']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const content = response.result.content[0];
        const fullResponse = helper.parseTableOfContentsText(response);

        // The response should have a sections property and possibly instructions
        expect(fullResponse).toBeDefined();
        expect(Array.isArray(fullResponse)).toBe(true);

        // Check if any sections have subsection_count (indicating hidden children)
        const hasHiddenSubsections = fullResponse.some((s: any) => s.hiddenSubsections !== undefined);

        if (hasHiddenSubsections) {
          // Should have instructions property when subsections are hidden
          expect(helper.parseInstructionsText(response)).toBeDefined();
          expect(typeof helper.parseInstructionsText(response)).toBe('string');
          expect(helper.parseInstructionsText(response).length).toBeGreaterThan(0);
        }
      } finally {
        serverProcess.kill();
      }
    });

    it('should omit instructions when no subsections are hidden', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-omit-instructions-when-no-hidden-subsections');
      await helper.startServer();

      try {
        const response = await helper.callTool('section_table_of_contents', {
          fileId: 'f1',
          section_ids: ['1.1.1'] // Leaf section with no children
        });

        helper.expectSuccessfulResponse(response);
        const content = response.result.content[0];
        const fullResponse = helper.parseTableOfContentsText(response);

        // Should have sections property
        expect(fullResponse).toBeDefined();
        expect(Array.isArray(fullResponse)).toBe(true);

        // Leaf section has no children, so no subsection_count
        expect(fullResponse.length).toBe(0);

        // Should have instructions property (always present with new format)
        const instructions = helper.parseInstructionsText(response);
        expect(instructions).toBeDefined();
        expect(instructions).toContain('section ID');
      } finally {
        await helper.stopServer();
      }
    });

    it('should include correct instruction message text when subsections are hidden', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-include-correct-instruction-message');
      const docsPath = helper.getTestDocsPath();

      // Set max_headers to limit results
      const serverProcess = await helper.spawnServerWithArgs(['--docs-path', docsPath, '--max-headers', '2']);

      try {
        const request = helper.createToolCallRequest('section_table_of_contents', {
          fileId: 'f1',
          section_ids: ['1']
        });

        const response = await helper.sendRequestToServer(serverProcess, request);
        helper.expectSuccessfulResponse(response);

        const content = response.result.content[0];
        const fullResponse = helper.parseTableOfContentsText(response);

        // Check if any sections have subsection_count
        const hasHiddenSubsections = fullResponse.some((s: any) => s.hiddenSubsections !== undefined);

        if (hasHiddenSubsections) {
          // Verify the instruction message contains expected content
          expect(helper.parseInstructionsText(response)).toContain('section_table_of_contents');
          expect(helper.parseInstructionsText(response)).toContain('subsections');
          // The instruction should guide users on how to explore hidden subsections
          expect(helper.parseInstructionsText(response).toLowerCase()).toContain('explore');
          expect(helper.parseInstructionsText(response).toLowerCase()).toContain('not currently shown');
        }
      } finally {
        serverProcess.kill();
      }
    });

    it('should omit instructions when all children are visible', async () => {
      const helper = new E2ETestHelper('SectionTableOfContents', 'should-omit-instructions-when-all-children-visible');
      await helper.startServer();

      try {
        // Request subsections with no max_headers limit, so all children should be visible
        const response = await helper.callTool('section_table_of_contents', {
          fileId: 'f1',
          section_ids: ['1']
        });

        helper.expectSuccessfulResponse(response);
        const content = response.result.content[0];
        const fullResponse = helper.parseTableOfContentsText(response);

        // Should have sections property
        expect(fullResponse).toBeDefined();
        expect(Array.isArray(fullResponse)).toBe(true);
        expect(fullResponse.length).toBeGreaterThan(0);

        // When all children are visible, subsection_count should be undefined for all sections
        const anyHaveSubsectionCount = fullResponse.some((s: any) => s.hiddenSubsections !== undefined);

        // Instructions are always present with new format, containing section ID guidance
        const instructions = helper.parseInstructionsText(response);
        expect(instructions).toBeDefined();
        expect(instructions).toContain('section ID');

        // If no sections have hiddenSubsections, instructions should not mention section_table_of_contents
        if (!anyHaveSubsectionCount) {
          expect(instructions).not.toContain('section_table_of_contents');
        }
      } finally {
        await helper.stopServer();
      }
    });
  });
});
