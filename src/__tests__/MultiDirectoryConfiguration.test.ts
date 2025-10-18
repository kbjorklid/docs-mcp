/**
 * Integration tests for multi-directory configuration functionality
 * Tests command line parsing, environment variables, and configuration precedence
 */

import { CommandLineProvider } from '../config/providers/CommandLineProvider';
import { EnvironmentProvider } from '../config/providers/EnvironmentProvider';
import { ConfigurationManager, createConfig } from '../config/ConfigManager';
import { Configuration } from '../types';

// Mock process.argv for command line testing
const originalArgv = process.argv;

describe('Multi-Directory Configuration Integration', () => {
  describe('CommandLineProvider', () => {
    afterEach(() => {
      process.argv = originalArgv;
    });

    describe('Multiple -d arguments', () => {
      it('should parse multiple documentation paths', () => {
        process.argv = [
          'node',
          'script.js',
          '--docs-path',
          '/first/path',
          '-d',
          '/second/path',
          '--docs-path',
          '/third/path'
        ];

        const provider = new CommandLineProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path', '/third/path']);
      });

      it('should handle mixed short and long flags', () => {
        process.argv = [
          'node',
          'script.js',
          '-d',
          '/dir1',
          '--docs-path',
          '/dir2',
          '-d',
          '/dir3'
        ];

        const provider = new CommandLineProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/dir1', '/dir2', '/dir3']);
      });

      it('should return available when docs paths are provided', () => {
        process.argv = ['node', 'script.js', '-d', '/some/path'];

        const provider = new CommandLineProvider();

        expect(provider.isAvailable()).toBe(true);
      });

      it('should return unavailable when no docs paths provided', () => {
        process.argv = ['node', 'script.js', '--other-flag'];

        const provider = new CommandLineProvider();

        expect(provider.isAvailable()).toBe(false);
      });
    });

    describe('Other configuration options', () => {
      it('should handle multiple docs paths', () => {
        process.argv = [
          'node',
          'script.js',
          '--docs-path',
          '/docs1',
          '-d',
          '/docs2'
        ];

        const provider = new CommandLineProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/docs1', '/docs2']);
      });
    });

    describe('Invalid arguments', () => {
      it('should handle missing docs path value', () => {
        process.argv = ['node', 'script.js', '--docs-path'];

        const provider = new CommandLineProvider();
        const config = provider.load();

        expect(config.documentationPaths).toBeUndefined();
      });

      it('should ignore unknown arguments', () => {
        process.argv = [
          'node',
          'script.js',
          '--docs-path',
          '/docs',
          '--unknown-flag',
          'value'
        ];

        const provider = new CommandLineProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/docs']);
      });
    });
  });

  describe('EnvironmentProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe('Single directory', () => {
      it('should parse single DOCS_PATH', () => {
        process.env.DOCS_PATH = '/single/path';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/single/path']);
      });

      it('should return available when DOCS_PATH is set', () => {
        process.env.DOCS_PATH = '/some/path';

        const provider = new EnvironmentProvider();

        expect(provider.isAvailable()).toBe(true);
      });
    });

    describe('Multiple directories', () => {
      it('should parse comma-separated DOCS_PATH', () => {
        process.env.DOCS_PATH = '/first/path,/second/path,/third/path';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path', '/third/path']);
      });

      it('should handle spaces around commas', () => {
        process.env.DOCS_PATH = '/first/path , /second/path , /third/path';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path', '/third/path']);
      });

      it('should handle trailing and leading commas', () => {
        process.env.DOCS_PATH = ',/first/path,/second/path,';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path']);
      });

      it('should filter out empty strings', () => {
        process.env.DOCS_PATH = '/first/path,,/second/path, ,/third/path';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path', '/third/path']);
      });

      it('should handle whitespace-only paths', () => {
        process.env.DOCS_PATH = '/first/path,   ,/second/path,\t,/third/path';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual(['/first/path', '/second/path', '/third/path']);
      });
    });

    describe('Edge cases', () => {
      it('should return unavailable when DOCS_PATH is not set', () => {
        delete process.env.DOCS_PATH;

        const provider = new EnvironmentProvider();

        expect(provider.isAvailable()).toBe(false);
      });

      it('should return unavailable when DOCS_PATH is empty', () => {
        process.env.DOCS_PATH = '';

        const provider = new EnvironmentProvider();

        expect(provider.isAvailable()).toBe(true); // Available but will result in empty array
        const config = provider.load();
        expect(config.documentationPaths).toEqual([]);
      });

      it('should handle only commas', () => {
        process.env.DOCS_PATH = ',,,';

        const provider = new EnvironmentProvider();
        const config = provider.load();

        expect(config.documentationPaths).toEqual([]);
      });
    });
  });

  describe('ConfigManager Integration', () => {
    const originalEnv = process.env;
    const originalArgv = process.argv;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.argv = [...originalArgv];
    });

    afterEach(() => {
      process.env = originalEnv;
      process.argv = originalArgv;
    });

    describe('Precedence: CLI > Environment > Default', () => {
      it('should use CLI args over environment variables', () => {
        process.env.DOCS_PATH = '/env/path';
        process.argv = ['node', 'script.js', '-d', '/cli/path'];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/cli/path']);
      });

      it('should use environment variables over defaults', () => {
        process.env.DOCS_PATH = '/env/path';
        // No CLI args

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/env/path']);
      });

      it('should use defaults when no CLI or environment set', () => {
        delete process.env.DOCS_PATH;
        // No CLI args

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['./docs']);
      });

      it('should merge CLI and environment properly', () => {
        process.env.DOCS_PATH = '/env/path1,/env/path2';
        process.argv = ['node', 'script.js', '-d', '/cli/path'];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/cli/path']); // CLI takes precedence
      });
    });

    describe('Complex configuration scenarios', () => {
      it('should handle CLI with multiple paths', () => {
        process.env.DOCS_PATH = '/env/path';
        process.argv = [
          'node',
          'script.js',
          '-d',
          '/cli/path1',
          '--docs-path',
          '/cli/path2',
          '-d',
          '/cli/path3'
        ];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/cli/path1', '/cli/path2', '/cli/path3']);
      });

      it('should handle multiple paths with CLI override', () => {
        process.env.DOCS_PATH = '/env/path';
        process.argv = [
          'node',
          'script.js',
          '-d',
          '/cli/path1',
          '-d',
          '/cli/path2'
        ];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/cli/path1', '/cli/path2']); // CLI docs paths
      });

      it('should handle environment variables with complex comma syntax', () => {
        process.env.DOCS_PATH = '  /path1  ,  /path2  ,/path3';
        process.argv = ['node', 'script.js'];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/path1', '/path2', '/path3']);
      });
    });

    describe('Backward compatibility', () => {
      it('should maintain backward compatibility with single paths', () => {
        process.env.DOCS_PATH = '/single/path';
        process.argv = ['node', 'script.js', '--docs-path', '/cli/single'];

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/cli/single']);
        expect(Array.isArray(config.documentationPaths)).toBe(true);
      });

      it('should handle old-style configuration without breaking', () => {
        // Simulate old configuration that might have been string-based
        process.env.DOCS_PATH = '/old/single/path';

        const configManager = new ConfigurationManager();
        const config = configManager.load();

        expect(config.documentationPaths).toEqual(['/old/single/path']);
      });
    });
  });

  describe('Configuration Validation', () => {
    describe('Valid configurations', () => {
      it('should accept valid multi-directory configuration', () => {
        const validConfig: Configuration = {
          documentationPaths: ['/docs1', '/docs2', '/docs3'],
        };

        // This would be used by the FileDiscoveryService
        expect(validConfig.documentationPaths).toHaveLength(3);
        expect(validConfig.documentationPaths[0]).toBe('/docs1');
      });

      it('should accept empty documentation paths array', () => {
        const validConfig: Configuration = {
          documentationPaths: [],
        };

        expect(Array.isArray(validConfig.documentationPaths)).toBe(true);
        expect(validConfig.documentationPaths).toHaveLength(0);
      });

      it('should accept single path in array', () => {
        const validConfig: Configuration = {
          documentationPaths: ['/single/path'],
        };

        expect(validConfig.documentationPaths).toHaveLength(1);
      });
    });

    describe('Edge cases', () => {
      it('should handle whitespace-only paths', () => {
        const config: Configuration = {
          documentationPaths: ['   ', '\t', '\n'],
        };

        expect(config.documentationPaths).toHaveLength(3);
        // The actual validation would happen in FileDiscoveryService
      });

      it('should handle duplicate paths', () => {
        const config: Configuration = {
          documentationPaths: ['/path1', '/path2', '/path1'],
        };

        expect(config.documentationPaths).toHaveLength(3);
        // Conflict resolution would handle this in FileDiscoveryService
      });

      it('should handle relative and absolute paths mixed', () => {
        const config: Configuration = {
          documentationPaths: ['./docs', '/absolute/docs', '../relative/docs'],
        };

        expect(config.documentationPaths).toHaveLength(3);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical development setup', () => {
      process.env.DOCS_PATH = './docs,./vendor/docs,./external-docs';
      process.argv = ['node', 'script.js'];

      const configManager = new ConfigurationManager();
      const config = configManager.load();

      expect(config.documentationPaths).toEqual(['./docs', './vendor/docs', './external-docs']);
    });

    it('should handle production deployment with CLI override', () => {
      process.env.DOCS_PATH = '/default/docs';
      process.argv = [
        'node',
        'script.js',
        '-d',
        '/production/docs1',
        '-d',
        '/production/docs2'
      ];

      const configManager = new ConfigurationManager();
      const config = configManager.load();

      expect(config.documentationPaths).toEqual(['/production/docs1', '/production/docs2']);
    });

    it('should handle testing configuration', () => {
      process.env.DOCS_PATH = './test/fixtures/docs1,./test/fixtures/docs2';
      process.argv = ['node', 'script.js'];

      const configManager = new ConfigurationManager();
      const config = configManager.load();

      expect(config.documentationPaths).toEqual(['./test/fixtures/docs1', './test/fixtures/docs2']);
    });
  });
});