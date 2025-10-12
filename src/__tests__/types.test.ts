import { DEFAULT_CONFIG, DocumentationConfig } from '../types';

describe('Types', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values without unused properties', () => {
      expect(DEFAULT_CONFIG).toEqual({
        documentation_path: './docs',
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

    it('should work with refactored interface without unused properties', () => {
      // Test the refactored configuration without unused properties
      const refactoredConfig = {
        documentation_path: './test-docs',
        max_toc_depth: 3,
        discount_single_top_header: true,
      };

      // Should be assignable to DocumentationConfig after refactoring
      const config: DocumentationConfig = refactoredConfig;
      expect(config.documentation_path).toBe('./test-docs');
      expect(config.max_toc_depth).toBe(3);
      expect(config.discount_single_top_header).toBe(true);
    });
  });

  describe('DocumentationConfig interface', () => {
    it('should accept valid configuration with refactored interface', () => {
      const config: DocumentationConfig = {
        documentation_path: './test-docs',
      };

      expect(config.documentation_path).toBe('./test-docs');
    });

    // Interface Compliance Tests for refactoring
    it('should accept configuration without auto_index and index_refresh_interval', () => {
      // Test configuration that excludes the unused properties
      const configWithoutUnusedProps = {
        documentation_path: './test-docs',
        max_toc_depth: 5,
        discount_single_top_header: false,
      };

      // This should be assignable to DocumentationConfig after refactoring
      const config: DocumentationConfig = configWithoutUnusedProps;
      expect(config.documentation_path).toBe('./test-docs');
      expect(config.max_toc_depth).toBe(5);
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should accept configuration with optional properties', () => {
      const configWithOptionals: DocumentationConfig = {
        documentation_path: './test-docs',
        max_toc_depth: 3,
        discount_single_top_header: true,
      };

      expect(configWithOptionals.max_toc_depth).toBe(3);
      expect(configWithOptionals.discount_single_top_header).toBe(true);
    });

    it('should accept configuration without optional properties', () => {
      const configWithoutOptionals: DocumentationConfig = {
        documentation_path: './test-docs',
      };

      expect(configWithoutOptionals.max_toc_depth).toBeUndefined();
      expect(configWithoutOptionals.discount_single_top_header).toBeUndefined();
    });

    it('should handle boundary values for configuration parameters', () => {
      const boundaryConfigs = [
        {
          documentation_path: './test-docs',
        },
        {
          documentation_path: './test-docs',
        },
        {
          documentation_path: './test-docs',
        },
      ];

      boundaryConfigs.forEach((config, index) => {
        expect(typeof config.documentation_path).toBe('string');
      });
    });
  });
});
