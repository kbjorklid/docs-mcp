import * as path from 'path';
import { DocumentationConfig, DEFAULT_CONFIG } from '../types';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';
import { TableOfContents } from '../tools/TableOfContents';
import { ReadSections } from '../tools/ReadSections';
import { createConfig } from '../config/ConfigManager';

// Mock process.argv and process.env
const originalArgv = process.argv;
const originalEnv = process.env;

describe('Configuration Integration Edge Cases', () => {
  let fixturesPath: string;

  beforeEach(() => {
    fixturesPath = path.join(__dirname, 'fixtures');
    // Reset process.env and process.argv before each test
    process.env = { ...originalEnv };
    process.argv = ['node', 'script.js'];
    delete process.env.DOCS_PATH;
  });

  afterAll(() => {
    // Restore original process.env and process.argv
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  describe('Complex Configuration Scenarios Not Covered by E2E', () => {
    it('should handle end-to-end workflow with refactored configuration', async () => {
      const refactoredConfig: DocumentationConfig = {
        documentationPath: fixturesPath,
        maxTocDepth: 2,
        discountSingleTopHeader: true,
      };

      // Step 1: List documentation files
      const listTool = new ListDocumentationFiles(refactoredConfig);
      const listResult = await listTool.execute();
      const files = JSON.parse(listResult.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      // Step 2: Get table of contents for a file
      const tocTool = new TableOfContents(refactoredConfig);
      const tocResult = tocTool.execute('shared/test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);
      expect(sections.length).toBeGreaterThan(0);

      // Step 3: Read specific sections
      const readTool = new ReadSections(refactoredConfig);
      const readResult = readTool.execute('shared/test-doc.md', ['introduction']);
      const content = JSON.parse(readResult.content[0].text);
      expect(content.length).toBe(1);
      expect(content[0].title).toBe('introduction');
    });

    it('should handle configuration changes during runtime', async () => {
      // Initial configuration
      const initialConfig: DocumentationConfig = {
        documentationPath: fixturesPath,
        maxTocDepth: 2,
      };

      // Updated configuration
      const updatedConfig: DocumentationConfig = {
        documentationPath: fixturesPath,
        maxTocDepth: 5,
        discountSingleTopHeader: true,
      };

      // Test with initial config
      const initialTocTool = new TableOfContents(initialConfig);
      const initialResult = initialTocTool.execute('table-of-contents/multi-level-headers.md');
      const initialSections = JSON.parse(initialResult.content[0].text);

      // Test with updated config
      const updatedTocTool = new TableOfContents(updatedConfig);
      const updatedResult = updatedTocTool.execute('table-of-contents/multi-level-headers.md');
      const updatedSections = JSON.parse(updatedResult.content[0].text);

      // Updated config should return more sections due to higher maxTocDepth
      expect(updatedSections.length).toBeGreaterThanOrEqual(initialSections.length);
    });

    it('should handle real-world usage scenario with mixed configuration sources', async () => {
      // Simulate a complex real-world configuration
      process.env.DOCS_PATH = fixturesPath;
      process.argv = [
        'node', 'script.js',
        '--docs-path', fixturesPath,
        '--max-toc-depth', '3',
        '--discount-single-top-header'
      ];

      const config = createConfig();

      // Simulate typical workflow
      const listTool = new ListDocumentationFiles(config);
      const listResult = await listTool.execute();
      const files = JSON.parse(listResult.content[0].text);

      // Find a file to work with
      const testFile = files.find((f: any) => f.filename === 'shared/test-doc.md');
      expect(testFile).toBeDefined();

      // Get table of contents
      const tocTool = new TableOfContents(config);
      const tocResult = tocTool.execute('shared/test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);

      // Read first section
      if (sections.length > 0) {
        const readTool = new ReadSections(config);
        const readResult = readTool.execute('shared/test-doc.md', [sections[0].id]);
        const content = JSON.parse(readResult.content[0].text);
        expect(content[0].title).toBe(sections[0].id);
      }
    });

    it('should maintain DEFAULT_CONFIG compatibility across all tools', () => {
      // Test that DEFAULT_CONFIG works with all tools
      const listTool = new ListDocumentationFiles(DEFAULT_CONFIG);
      const tocTool = new TableOfContents(DEFAULT_CONFIG);
      const readTool = new ReadSections(DEFAULT_CONFIG);

      expect(() => listTool.execute()).not.toThrow();
      expect(() => tocTool.execute('shared/test-doc.md')).not.toThrow();
      expect(() => readTool.execute('shared/test-doc.md', ['introduction'])).not.toThrow();

      // Verify DEFAULT_CONFIG has the expected structure
      expect(DEFAULT_CONFIG.documentationPath).toBe('./docs');
      expect(DEFAULT_CONFIG.discountSingleTopHeader).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration errors consistently across tools', () => {
      // Test with invalid configuration
      const invalidConfig = {
        documentationPath: '/non/existent/path',
      };

      const listTool = new ListDocumentationFiles(invalidConfig as DocumentationConfig);
      const tocTool = new TableOfContents(invalidConfig as DocumentationConfig);
      const readTool = new ReadSections(invalidConfig as DocumentationConfig);

      // All tools should handle invalid paths gracefully
      expect(() => listTool.execute()).not.toThrow();
      expect(() => tocTool.execute('shared/test-doc.md')).not.toThrow();
      expect(() => readTool.execute('shared/test-doc.md', ['introduction'])).not.toThrow();
    });
  });
});