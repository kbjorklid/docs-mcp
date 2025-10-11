import { DEFAULT_CONFIG, DocumentationConfig } from '../types';

describe('Types', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG).toEqual({
        documentation_path: './docs',
        auto_index: true,
        index_refresh_interval: 300,
        max_file_size: 10485760,
        exclude_patterns: ['node_modules/**', '*.tmp.md'],
        include_patterns: ['**/*.md'],
        max_toc_depth: undefined,
        discount_single_top_header: false,
      });
    });

    it('should use DOCS_PATH environment variable when set', () => {
      const originalEnv = process.env.DOCS_PATH;
      process.env.DOCS_PATH = '/custom/docs';

      // Re-import the module to test environment variable
      jest.resetModules();
      const { DEFAULT_CONFIG: configWithEnv } = require('../types');

      expect(configWithEnv.documentation_path).toBe('/custom/docs');

      // Restore original environment
      process.env.DOCS_PATH = originalEnv;
    });

    it('should fall back to default when DOCS_PATH is not set', () => {
      const originalEnv = process.env.DOCS_PATH;
      delete process.env.DOCS_PATH;

      jest.resetModules();
      const { DEFAULT_CONFIG: configWithoutEnv } = require('../types');

      expect(configWithoutEnv.documentation_path).toBe('./docs');

      // Restore original environment
      process.env.DOCS_PATH = originalEnv;
    });
  });

  describe('DocumentationConfig interface', () => {
    it('should accept valid configuration', () => {
      const config: DocumentationConfig = {
        documentation_path: './test-docs',
        auto_index: false,
        index_refresh_interval: 600,
        max_file_size: 5242880,
        exclude_patterns: ['test/**', '*.temp.md'],
        include_patterns: ['**/*.md', '**/*.txt'],
      };

      expect(config.documentation_path).toBe('./test-docs');
      expect(config.auto_index).toBe(false);
      expect(config.index_refresh_interval).toBe(600);
      expect(config.max_file_size).toBe(5242880);
      expect(config.exclude_patterns).toEqual(['test/**', '*.temp.md']);
      expect(config.include_patterns).toEqual(['**/*.md', '**/*.txt']);
    });
  });
});
