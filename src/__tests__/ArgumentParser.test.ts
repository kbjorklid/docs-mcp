import { createConfig } from '../config/ConfigManager';

// Mock process.argv and process.env
const originalArgv = process.argv;
const originalEnv = process.env;

describe('ArgumentParser', () => {
  describe('parseCommandLineArgs', () => {
    beforeEach(() => {
      // Reset process.argv before each test
      process.argv = ['node', 'script.js'];
    });

    afterAll(() => {
      // Restore original process.argv
      process.argv = originalArgv;
    });

    it('should handle no arguments', () => {
      process.argv = ['node', 'script.js'];

      // We need to import the function dynamically since it's not exported
      // Let's test it indirectly through createConfig which calls parseCommandLineArgs
      const config = createConfig();

      // Should use default values when no CLI args provided
      expect(config.documentation_path).toBe('./docs');
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false); // Default from DEFAULT_CONFIG
    });

    it('should parse long form --docs-path argument', () => {
      process.argv = ['node', 'script.js', '--docs-path', '/custom/path'];

      const config = createConfig();
      expect(config.documentation_path).toBe('/custom/path');
    });

    it('should parse short form -d argument', () => {
      process.argv = ['node', 'script.js', '-d', '/short/path'];

      const config = createConfig();
      expect(config.documentation_path).toBe('/short/path');
    });

    it('should parse --max-toc-depth with valid positive integer', () => {
      process.argv = ['node', 'script.js', '--max-toc-depth', '5'];

      const config = createConfig();
      expect(config.max_toc_depth).toBe(5);
    });

    it('should parse --max-toc-depth with zero (should be ignored)', () => {
      process.argv = ['node', 'script.js', '--max-toc-depth', '0'];

      const config = createConfig();
      expect(config.max_toc_depth).toBeUndefined();
    });

    it('should parse --max-toc-depth with negative number (should be ignored)', () => {
      process.argv = ['node', 'script.js', '--max-toc-depth', '-3'];

      const config = createConfig();
      expect(config.max_toc_depth).toBeUndefined();
    });

    it('should parse --max-toc-depth with non-numeric value (should be ignored)', () => {
      process.argv = ['node', 'script.js', '--max-toc-depth', 'invalid'];

      const config = createConfig();
      expect(config.max_toc_depth).toBeUndefined();
    });

    it('should parse --discount-single-top-header flag', () => {
      process.argv = ['node', 'script.js', '--discount-single-top-header'];

      const config = createConfig();
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should handle missing argument values gracefully', () => {
      process.argv = ['node', 'script.js', '--docs-path', '--max-toc-depth', '3'];

      const config = createConfig();
      // The parser will take '--max-toc-depth' as the value for '--docs-path'
      // But when it encounters '--max-toc-depth' as a value, it doesn't recognize it as a flag
      // So '3' won't be processed as a max-toc-depth value either
      expect(config.documentation_path).toBe('--max-toc-depth');
      expect(config.max_toc_depth).toBeUndefined();
    });

    it('should handle arguments in different orders', () => {
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', '2',
        '--discount-single-top-header',
        '--docs-path', '/ordered/path'
      ];

      const config = createConfig();
      expect(config.documentation_path).toBe('/ordered/path');
      expect(config.max_toc_depth).toBe(2);
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should handle multiple occurrences of the same argument (last one wins)', () => {
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', '2',
        '--max-toc-depth', '4'
      ];

      const config = createConfig();
      expect(config.max_toc_depth).toBe(4);
    });

    it('should handle mixed short and long form arguments', () => {
      process.argv = [
        'node', 'script.js',
        '-d', '/mixed/path',
        '--max-toc-depth', '3',
        '--discount-single-top-header'
      ];

      const config = createConfig();
      expect(config.documentation_path).toBe('/mixed/path');
      expect(config.max_toc_depth).toBe(3);
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should ignore unknown arguments', () => {
      process.argv = [
        'node', 'script.js',
        '--unknown-arg', 'value',
        '--another-unknown',
        '--docs-path', '/known/path'
      ];

      const config = createConfig();
      expect(config.documentation_path).toBe('/known/path');
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false); // Default from DEFAULT_CONFIG
    });

    it('should handle arguments with extra whitespace', () => {
      process.argv = [
        'node', 'script.js',
        '  --docs-path  ',
        '  /whitespace/path  ',
        '  --max-toc-depth  ',
        '  6  '
      ];

      const config = createConfig();
      // Note: process.argv includes whitespace exactly as provided
      // The parser treats '  --docs-path  ' as an unknown argument, not as '--docs-path'
      expect(config.documentation_path).toBe('./docs'); // Falls back to default
      expect(config.max_toc_depth).toBeUndefined();
    });

    it('should handle boundary values for max-toc-depth', () => {
      // Test with 1 (minimum valid value)
      process.argv = ['node', 'script.js', '--max-toc-depth', '1'];
      let config = createConfig();
      expect(config.max_toc_depth).toBe(1);

      // Test with large valid number
      process.argv = ['node', 'script.js', '--max-toc-depth', '999'];
      config = createConfig();
      expect(config.max_toc_depth).toBe(999);

      // Test with decimal number (should be parsed as integer)
      process.argv = ['node', 'script.js', '--max-toc-depth', '3.14'];
      config = createConfig();
      expect(config.max_toc_depth).toBe(3);
    });
  });

  describe('createConfig', () => {
    beforeEach(() => {
      // Reset process.env and process.argv before each test
      process.env = { ...originalEnv };
      process.argv = ['node', 'script.js'];
      delete process.env.DOCS_PATH;
    });

    afterAll(() => {
      // Restore original process.env
      process.env = originalEnv;
    });

    it('should use default values when no CLI args or environment variables are set', () => {
      const config = createConfig();

      expect(config.documentation_path).toBe('./docs');
      expect(config.auto_index).toBe(true);
      expect(config.index_refresh_interval).toBe(300);
      expect(config.max_file_size).toBe(10485760);
      expect(config.exclude_patterns).toEqual(['node_modules/**', '*.tmp.md']);
      expect(config.include_patterns).toEqual(['**/*.md']);
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should give CLI args precedence over environment variables', () => {
      process.env.DOCS_PATH = '/env/path';
      process.argv = ['node', 'script.js', '--docs-path', '/cli/path'];

      const config = createConfig();
      expect(config.documentation_path).toBe('/cli/path');
    });

    it('should use environment variable when no CLI arg provided', () => {
      process.env.DOCS_PATH = '/env/path';

      const config = createConfig();
      expect(config.documentation_path).toBe('/env/path');
    });

    it('should use default when neither CLI arg nor environment variable provided', () => {
      delete process.env.DOCS_PATH;

      const config = createConfig();
      expect(config.documentation_path).toBe('./docs');
    });

    it('should handle all three sources working together', () => {
      process.env.DOCS_PATH = '/env/path';
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', '4',
        '--discount-single-top-header'
      ];

      const config = createConfig();
      expect(config.documentation_path).toBe('/env/path'); // From environment
      expect(config.max_toc_depth).toBe(4); // From CLI
      expect(config.discount_single_top_header).toBe(true); // From CLI
      expect(config.auto_index).toBe(true); // From default
    });

    it('should handle empty string environment variables', () => {
      process.env.DOCS_PATH = '';

      const config = createConfig();
      // Empty string is falsy, so it falls back to default
      expect(config.documentation_path).toBe('./docs');
    });

    it('should handle whitespace-only environment variables', () => {
      process.env.DOCS_PATH = '   ';

      const config = createConfig();
      expect(config.documentation_path).toBe('   ');
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.DOCS_PATH;

      const config = createConfig();
      expect(config.documentation_path).toBe('./docs');
    });

    it('should preserve other default values when only one option is overridden', () => {
      process.argv = ['node', 'script.js', '--docs-path', '/custom/path'];

      const config = createConfig();
      expect(config.documentation_path).toBe('/custom/path');
      expect(config.auto_index).toBe(true);
      expect(config.index_refresh_interval).toBe(300);
      expect(config.max_file_size).toBe(10485760);
      expect(config.exclude_patterns).toEqual(['node_modules/**', '*.tmp.md']);
      expect(config.include_patterns).toEqual(['**/*.md']);
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should handle CLI override of discount_single_top_header flag', () => {
      process.argv = ['node', 'script.js', '--discount-single-top-header'];

      const config = createConfig();
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should not set optional config values when not provided via CLI', () => {
      const config = createConfig();

      // These should remain undefined/false as they're only set via CLI
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false); // Default from DEFAULT_CONFIG
    });

    it('should handle complex scenario with mixed sources', () => {
      process.env.DOCS_PATH = '/from/env';
      process.argv = [
        'node', 'script.js',
        '--docs-path', '/from/cli',
        '--max-toc-depth', '2'
      ];

      const config = createConfig();

      // CLI should override env for docs_path
      expect(config.documentation_path).toBe('/from/cli');
      // CLI-only options should be set
      expect(config.max_toc_depth).toBe(2);
      // Default values should remain
      expect(config.auto_index).toBe(true);
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should handle special characters in environment variables', () => {
      process.env.DOCS_PATH = '/path/with spaces & special@chars';

      const config = createConfig();
      expect(config.documentation_path).toBe('/path/with spaces & special@chars');
    });

    it('should handle very long CLI argument values', () => {
      const longPath = '/very/long/path/' + 'a'.repeat(1000);
      process.argv = ['node', 'script.js', '--docs-path', longPath];

      const config = createConfig();
      expect(config.documentation_path).toBe(longPath);
    });
  });
});