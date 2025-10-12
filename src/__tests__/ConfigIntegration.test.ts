import * as path from 'path';
import { DocumentationConfig, DEFAULT_CONFIG } from '../types';
import { ListDocumentationFiles } from '../tools/ListDocumentationFiles';
import { TableOfContents } from '../tools/TableOfContents';
import { ReadSections } from '../tools/ReadSections';
import { createConfig } from '../config/ConfigManager';

// Mock process.argv and process.env
const originalArgv = process.argv;
const originalEnv = process.env;

describe('Configuration Integration Tests for Refactoring', () => {
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

  describe('Tool Integration with Refactored Configuration', () => {
    it('should work with all tools using refactored configuration', () => {
      // Create a refactored configuration (without unused properties)
      const refactoredConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
        max_toc_depth: 3,
        discount_single_top_header: false,
      };

      // Test ListDocumentationFiles
      const listTool = new ListDocumentationFiles(refactoredConfig);
      expect(() => listTool.execute()).not.toThrow();

      // Test TableOfContents
      const tocTool = new TableOfContents(refactoredConfig);
      expect(() => tocTool.execute('test-doc.md')).not.toThrow();

      // Test ReadSections
      const readTool = new ReadSections(refactoredConfig);
      expect(() => readTool.execute('test-doc.md', ['introduction'])).not.toThrow();
    });

    it('should maintain tool functionality with minimal configuration', () => {
      const minimalConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
      };

      // All tools should work with minimal configuration
      const listTool = new ListDocumentationFiles(minimalConfig);
      const tocTool = new TableOfContents(minimalConfig);
      const readTool = new ReadSections(minimalConfig);

      expect(() => listTool.execute()).not.toThrow();
      expect(() => tocTool.execute('test-doc.md')).not.toThrow();
      expect(() => readTool.execute('test-doc.md', ['introduction'])).not.toThrow();
    });

    it('should handle end-to-end workflow with refactored configuration', async () => {
      const refactoredConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
        max_toc_depth: 2,
        discount_single_top_header: true,
      };

      // Step 1: List documentation files
      const listTool = new ListDocumentationFiles(refactoredConfig);
      const listResult = await listTool.execute();
      const files = JSON.parse(listResult.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      // Step 2: Get table of contents for a file
      const tocTool = new TableOfContents(refactoredConfig);
      const tocResult = tocTool.execute('test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);
      expect(sections.length).toBeGreaterThan(0);

      // Step 3: Read specific sections
      const readTool = new ReadSections(refactoredConfig);
      const readResult = readTool.execute('test-doc.md', ['introduction']);
      const content = JSON.parse(readResult.content[0].text);
      expect(content.length).toBe(1);
      expect(content[0].title).toBe('introduction');
    });

    it('should handle configuration with mixed property sources', async () => {
      // Set environment variable
      process.env.DOCS_PATH = fixturesPath;
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', '3',
        '--discount-single-top-header'
      ];

      // Create config using ConfigManager
      const config = createConfig();

      // Test all tools with this mixed configuration
      const listTool = new ListDocumentationFiles(config);
      const tocTool = new TableOfContents(config);
      const readTool = new ReadSections(config);

      // Should work with mixed configuration sources
      const listResult = await listTool.execute();
      const files = JSON.parse(listResult.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      const tocResult = tocTool.execute('test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);
      expect(sections.length).toBeGreaterThan(0);

      const readResult = readTool.execute('test-doc.md', ['introduction']);
      const content = JSON.parse(readResult.content[0].text);
      expect(content[0].title).toBe('introduction');
    });
  });

  describe('Configuration Precedence Integration', () => {
    it('should maintain precedence order across all tools', async () => {
      // Set environment variable
      process.env.DOCS_PATH = fixturesPath;
      process.argv = ['node', 'script.js', '--docs-path', '/cli/override'];

      const config = createConfig();
      expect(config.documentation_path).toBe('/cli/override');

      // Tools should use CLI-overridden path
      const listTool = new ListDocumentationFiles(config);
      const tocTool = new TableOfContents(config);
      const readTool = new ReadSections(config);

      // List tool should handle non-existent path gracefully
      const listResult = await listTool.execute();
      expect(listResult.content).toHaveLength(1);
      const files = JSON.parse(listResult.content[0].text);
      expect(Array.isArray(files)).toBe(true);

      // Other tools should return appropriate errors for non-existent files
      const tocResult = tocTool.execute('test-doc.md');
      expect(tocResult.content).toHaveLength(1);
      const tocError = JSON.parse(tocResult.content[0].text);
      expect(tocError.error.code).toBe('FILE_NOT_FOUND');

      const readResult = readTool.execute('test-doc.md', ['introduction']);
      expect(readResult.content).toHaveLength(1);
      const readError = JSON.parse(readResult.content[0].text);
      expect(readError.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should apply CLI arguments to all tools consistently', async () => {
      process.argv = [
        'node', 'script.js',
        '--docs-path', fixturesPath,
        '--max-toc-depth', '2'
      ];

      const config = createConfig();
      expect(config.max_toc_depth).toBe(2);

      // TableOfContents should respect the max_toc_depth setting
      const tocTool = new TableOfContents(config);
      const tocResult = tocTool.execute('multi-level-headers.md');
      const sections = JSON.parse(tocResult.content[0].text);

      // Should be limited to max depth of 2
      sections.forEach((section: any) => {
        expect(section.level).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration errors consistently across tools', () => {
      // Test with invalid configuration
      const invalidConfig = {
        documentation_path: '/non/existent/path',
        max_file_size: 10485760,
      };

      const listTool = new ListDocumentationFiles(invalidConfig as DocumentationConfig);
      const tocTool = new TableOfContents(invalidConfig as DocumentationConfig);
      const readTool = new ReadSections(invalidConfig as DocumentationConfig);

      // All tools should handle invalid paths gracefully
      expect(() => listTool.execute()).not.toThrow();
      expect(() => tocTool.execute('test-doc.md')).not.toThrow();
      expect(() => readTool.execute('test-doc.md', ['introduction'])).not.toThrow();
    });

    it('should handle boundary conditions in all tools', async () => {
      const boundaryConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 1, // Very small
      };

      const listTool = new ListDocumentationFiles(boundaryConfig);
      const tocTool = new TableOfContents(boundaryConfig);
      const readTool = new ReadSections(boundaryConfig);

      // List tool might return empty array due to size limit
      const listResult = await listTool.execute();
      expect(listResult.content).toHaveLength(1);
      expect(() => JSON.parse(listResult.content[0].text)).not.toThrow();

      // TOC and Read tools might fail due to size limit
      const tocResult = tocTool.execute('test-doc.md');
      expect(tocResult.content).toHaveLength(1);
      expect(() => JSON.parse(tocResult.content[0].text)).not.toThrow();

      const readResult = readTool.execute('test-doc.md', ['introduction']);
      expect(readResult.content).toHaveLength(1);
      expect(() => JSON.parse(readResult.content[0].text)).not.toThrow();
    });
  });

  describe('Backward Compatibility Integration', () => {
    it('should work with current configuration format across all tools', async () => {
      // Current configuration with refactored properties
      const currentConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
        max_toc_depth: 5,
        discount_single_top_header: false,
      };

      // All tools should work with current configuration
      const listTool = new ListDocumentationFiles(currentConfig);
      const tocTool = new TableOfContents(currentConfig);
      const readTool = new ReadSections(currentConfig);

      const listResult = await listTool.execute();
      expect(listResult.content).toHaveLength(1);
      const files = JSON.parse(listResult.content[0].text);
      expect(files.length).toBeGreaterThan(0);

      const tocResult = tocTool.execute('test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);
      expect(sections.length).toBeGreaterThan(0);

      const readResult = readTool.execute('test-doc.md', ['introduction']);
      const content = JSON.parse(readResult.content[0].text);
      expect(content[0].title).toBe('introduction');
    });

    it('should maintain DEFAULT_CONFIG compatibility', () => {
      // Test that DEFAULT_CONFIG works with all tools
      const listTool = new ListDocumentationFiles(DEFAULT_CONFIG);
      const tocTool = new TableOfContents(DEFAULT_CONFIG);
      const readTool = new ReadSections(DEFAULT_CONFIG);

      expect(() => listTool.execute()).not.toThrow();
      expect(() => tocTool.execute('test-doc.md')).not.toThrow();
      expect(() => readTool.execute('test-doc.md', ['introduction'])).not.toThrow();

      // Verify DEFAULT_CONFIG has the expected structure
      expect(DEFAULT_CONFIG.documentation_path).toBe('./docs');
      expect(DEFAULT_CONFIG.max_file_size).toBe(10485760);
      expect(DEFAULT_CONFIG.discount_single_top_header).toBe(false);
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate configuration properties across tools', () => {
      const validationConfigs = [
        // Valid configurations
        {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
        },
        {
          documentation_path: fixturesPath,
          max_file_size: 0,
          max_toc_depth: 0,
        },
        // Edge cases
        {
          documentation_path: '',
          max_file_size: 1,
        },
      ];

      validationConfigs.forEach((config, index) => {
        expect(() => {
          const listTool = new ListDocumentationFiles(config as DocumentationConfig);
          const tocTool = new TableOfContents(config as DocumentationConfig);
          const readTool = new ReadSections(config as DocumentationConfig);

          // Should not throw during construction
          expect(listTool).toBeDefined();
          expect(tocTool).toBeDefined();
          expect(readTool).toBeDefined();
        }).not.toThrow(`Configuration ${index} should be valid`);
      });
    });

    it('should handle configuration with optional properties', async () => {
      const optionalConfigs = [
        {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          max_toc_depth: undefined,
          discount_single_top_header: undefined,
        },
        {
          documentation_path: fixturesPath,
          max_file_size: 10485760,
          max_toc_depth: 5,
          discount_single_top_header: true,
        },
      ];

      for (const config of optionalConfigs) {
        const listTool = new ListDocumentationFiles(config as unknown as DocumentationConfig);
        const tocTool = new TableOfContents(config as unknown as DocumentationConfig);
        const readTool = new ReadSections(config as unknown as DocumentationConfig);

        // Tools should handle optional properties correctly
        const listResult = await listTool.execute();
        expect(listResult.content).toHaveLength(1);

        const tocResult = tocTool.execute('test-doc.md');
        expect(tocResult.content).toHaveLength(1);

        const readResult = readTool.execute('test-doc.md', ['introduction']);
        expect(readResult.content).toHaveLength(1);
      }
    });
  });

  describe('Complex Scenario Integration', () => {
    it('should handle real-world usage scenarios', async () => {
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
      const testFile = files.find((f: any) => f.filename === 'test-doc.md');
      expect(testFile).toBeDefined();

      // Get table of contents
      const tocTool = new TableOfContents(config);
      const tocResult = tocTool.execute('test-doc.md');
      const sections = JSON.parse(tocResult.content[0].text);

      // Read first section
      if (sections.length > 0) {
        const readTool = new ReadSections(config);
        const readResult = readTool.execute('test-doc.md', [sections[0].id]);
        const content = JSON.parse(readResult.content[0].text);
        expect(content[0].title).toBe(sections[0].id);
      }
    });

    it('should handle configuration changes during runtime', async () => {
      // Initial configuration
      const initialConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
        max_toc_depth: 2,
      };

      // Updated configuration
      const updatedConfig: DocumentationConfig = {
        documentation_path: fixturesPath,
        max_file_size: 10485760,
        max_toc_depth: 5,
        discount_single_top_header: true,
      };

      // Test with initial config
      const initialTocTool = new TableOfContents(initialConfig);
      const initialResult = initialTocTool.execute('multi-level-headers.md');
      const initialSections = JSON.parse(initialResult.content[0].text);

      // Test with updated config
      const updatedTocTool = new TableOfContents(updatedConfig);
      const updatedResult = updatedTocTool.execute('multi-level-headers.md');
      const updatedSections = JSON.parse(updatedResult.content[0].text);

      // Updated config should return more sections due to higher max_toc_depth
      expect(updatedSections.length).toBeGreaterThanOrEqual(initialSections.length);
    });
  });
});