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
      expect(config.max_file_size).toBe(10485760);
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
      expect(config.max_file_size).toBe(10485760); // From default
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
      expect(config.max_file_size).toBe(10485760);
      expect(config.max_toc_depth).toBeUndefined();
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
      expect(config.max_file_size).toBe(10485760);
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

  // Configuration Manager Tests for refactoring
  describe('Configuration Compatibility for Refactoring', () => {
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

    it('should work with configuration that excludes unused properties', () => {
      process.argv = ['node', 'script.js', '--docs-path', '/test/path'];

      const config = createConfig();

      // Should work with the refactored configuration
      expect(config.documentation_path).toBe('/test/path');
      expect(config.max_file_size).toBe(10485760);
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should maintain CLI argument precedence with refactored interface', () => {
      process.env.DOCS_PATH = '/env/path';
      process.argv = [
        'node', 'script.js',
        '--docs-path', '/cli/path',
        '--max-toc-depth', '3',
        '--discount-single-top-header'
      ];

      const config = createConfig();

      // CLI args should still take precedence over environment
      expect(config.documentation_path).toBe('/cli/path');
      expect(config.max_toc_depth).toBe(3);
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should handle environment variable configuration without unused properties', () => {
      process.env.DOCS_PATH = '/env/documentation';

      const config = createConfig();

      // Should work with environment variables even when unused properties are removed
      expect(config.documentation_path).toBe('/env/documentation');
      expect(config.max_file_size).toBe(10485760);
    });

    it('should handle complex configuration scenarios after refactoring', () => {
      process.env.DOCS_PATH = '/env/docs';
      process.argv = [
        'node', 'script.js',
        '--docs-path', '/cli/docs', // Override env
        '--max-toc-depth', '5',
        '--discount-single-top-header'
      ];

      const config = createConfig();

      // All configuration should work correctly
      expect(config.documentation_path).toBe('/cli/docs');
      expect(config.max_toc_depth).toBe(5);
      expect(config.discount_single_top_header).toBe(true);
      expect(config.max_file_size).toBe(10485760);
    });

    it('should handle boundary values in configuration after refactoring', () => {
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', '0', // Should be ignored (invalid)
        '--discount-single-top-header' // Should be set
      ];

      const config = createConfig();

      // Boundary value handling should still work
      expect(config.max_toc_depth).toBeUndefined(); // 0 should be ignored
      expect(config.discount_single_top_header).toBe(true);
    });

    it('should preserve default behavior when only using refactored properties', () => {
      // No CLI args, just test default behavior
      const config = createConfig();

      // Should still work with all default values
      expect(config.documentation_path).toBe('./docs');
      expect(config.max_file_size).toBe(10485760);
      expect(config.max_toc_depth).toBeUndefined();
      expect(config.discount_single_top_header).toBe(false);
    });

    it('should handle invalid CLI arguments gracefully after refactoring', () => {
      process.argv = [
        'node', 'script.js',
        '--max-toc-depth', 'invalid', // Invalid number
        '--docs-path', '', // Empty path
      ];

      const config = createConfig();

      // Should handle invalid arguments gracefully
      expect(config.max_toc_depth).toBeUndefined(); // Invalid should be ignored
      expect(config.documentation_path).toBe('./docs'); // Empty string should be ignored and default used
    });

    it('should maintain configuration precedence order after refactoring', () => {
      // Test the precedence: CLI args > environment > defaults
      process.env.DOCS_PATH = '/from/environment';
      process.argv = ['node', 'script.js', '--docs-path', '/from/cli'];

      const config = createConfig();

      // Verify precedence is maintained
      expect(config.documentation_path).toBe('/from/cli'); // CLI wins
      expect(config.max_file_size).toBe(10485760); // Default value
    });

    it('should handle edge cases in configuration after refactoring', () => {
      // Test with very large max-toc-depth
      process.argv = ['node', 'script.js', '--max-toc-depth', '999999'];

      const config = createConfig();

      // Should handle large values
      expect(config.max_toc_depth).toBe(999999);
    });

    it('should maintain tool compatibility with refactored configuration', () => {
      process.argv = [
        'node', 'script.js',
        '--docs-path', '/tool/test/path',
        '--max-toc-depth', '2'
      ];

      const config = createConfig();

      // Configuration should be compatible with all tools
      expect(typeof config.documentation_path).toBe('string');
      expect(typeof config.max_file_size).toBe('number');
      expect(config.max_toc_depth).toBe(2);
      expect(typeof config.discount_single_top_header).toBe('boolean');
    });
  });
});