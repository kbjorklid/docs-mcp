import { DEFAULT_CONFIG, Configuration } from '../types';

describe('Types', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values without unused properties', () => {
      expect(DEFAULT_CONFIG).toEqual({
        documentationPath: './docs',
        discountSingleTopHeader: false,
      });
    });

    it('should use DOCS_PATH environment variable when set', () => {
      const originalEnv = process.env.DOCS_PATH;
      process.env.DOCS_PATH = '/custom/docs';

      // Re-import the module to test environment variable
      jest.resetModules();
      const { DEFAULT_CONFIG: configWithEnv } = require('../types');

      expect(configWithEnv.documentationPath).toBe('/custom/docs');

      // Restore original environment
      process.env.DOCS_PATH = originalEnv;
    });

    it('should fall back to default when DOCS_PATH is not set', () => {
      const originalEnv = process.env.DOCS_PATH;
      delete process.env.DOCS_PATH;

      jest.resetModules();
      const { DEFAULT_CONFIG: configWithoutEnv } = require('../types');

      expect(configWithoutEnv.documentationPath).toBe('./docs');

      // Restore original environment
      process.env.DOCS_PATH = originalEnv;
    });

    it('should work with simplified interface', () => {
      // Test the simplified configuration interface
      const config = {
        documentationPath: './test-docs',
        maxTocDepth: 3,
        discountSingleTopHeader: true,
      };

      // Should be assignable to Configuration
      const typedConfig: Configuration = config;
      expect(typedConfig.documentationPath).toBe('./test-docs');
      expect(typedConfig.maxTocDepth).toBe(3);
      expect(typedConfig.discountSingleTopHeader).toBe(true);
    });
  });

  describe('Configuration interface', () => {
    it('should accept valid configuration', () => {
      const config: Configuration = {
        documentationPath: './test-docs',
      };

      expect(config.documentationPath).toBe('./test-docs');
    });

    it('should accept configuration with optional properties', () => {
      const configWithOptionals: Configuration = {
        documentationPath: './test-docs',
        maxTocDepth: 3,
        discountSingleTopHeader: true,
      };

      expect(configWithOptionals.maxTocDepth).toBe(3);
      expect(configWithOptionals.discountSingleTopHeader).toBe(true);
    });

    it('should accept configuration without optional properties', () => {
      const configWithoutOptionals: Configuration = {
        documentationPath: './test-docs',
      };

      expect(configWithoutOptionals.maxTocDepth).toBeUndefined();
      expect(configWithoutOptionals.discountSingleTopHeader).toBeUndefined();
    });

    it('should handle boundary values for configuration parameters', () => {
      const boundaryConfigs = [
        {
          documentationPath: './test-docs',
        },
        {
          documentationPath: './test-docs',
          maxTocDepth: 0,
        },
        {
          documentationPath: './test-docs',
          maxTocDepth: 999,
        },
      ];

      boundaryConfigs.forEach((config) => {
        expect(typeof config.documentationPath).toBe('string');
        if (config.maxTocDepth !== undefined) {
          expect(typeof config.maxTocDepth).toBe('number');
        }
      });
    });
  });
});
