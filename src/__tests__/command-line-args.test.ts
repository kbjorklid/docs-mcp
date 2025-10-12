// Test command line argument parsing functionality
describe('Command Line Arguments', () => {
  // Mock process.argv before each test
  const originalArgv = process.argv;

  beforeEach(() => {
    // Reset process.argv to default
    process.argv = ['node', 'index.js'];
  });

  afterAll(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  describe('parseCommandLineArgs', () => {
    it('should return empty object when no arguments are provided', async () => {
      // Import the function after mocking process.argv
      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should parse docs-path argument correctly', async () => {
      // Set up process.argv with docs-path argument
      process.argv = ['node', 'index.js', '--docs-path', '/custom/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/custom/path');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should parse short docs-path argument (-d) correctly', async () => {
      // Set up process.argv with short docs-path argument
      process.argv = ['node', 'index.js', '-d', '/another/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/another/path');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should parse max-toc-depth argument correctly', async () => {
      // Set up process.argv with max-toc-depth argument
      process.argv = ['node', 'index.js', '--max-toc-depth', '3'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBe(3);
    });

    it('should parse both docs-path and max-toc-depth arguments correctly', async () => {
      // Set up process.argv with both arguments
      process.argv = ['node', 'index.js', '--docs-path', '/custom/docs', '--max-toc-depth', '2'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/custom/docs');
      expect(config.maxTocDepth).toBe(2);
    });

    it('should handle arguments in different order', async () => {
      // Set up process.argv with arguments in different order
      process.argv = ['node', 'index.js', '--max-toc-depth', '4', '--docs-path', '/ordered/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/ordered/path');
      expect(config.maxTocDepth).toBe(4);
    });

    it('should ignore invalid max-toc-depth values', async () => {
      // Set up process.argv with invalid max-toc-depth
      process.argv = ['node', 'index.js', '--max-toc-depth', 'invalid'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should ignore non-positive max-toc-depth values', async () => {
      // Set up process.argv with non-positive max-toc-depth
      process.argv = ['node', 'index.js', '--max-toc-depth', '0'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should ignore negative max-toc-depth values', async () => {
      // Set up process.argv with negative max-toc-depth
      process.argv = ['node', 'index.js', '--max-toc-depth', '-5'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should handle docs-path argument without following value gracefully', async () => {
      // Set up process.argv with docs-path but no following value
      process.argv = ['node', 'index.js', '--docs-path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should handle max-toc-depth argument without following value gracefully', async () => {
      // Set up process.argv with max-toc-depth but no following value
      process.argv = ['node', 'index.js', '--max-toc-depth'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should handle mixed valid and invalid arguments', async () => {
      // Set up process.argv with mixed arguments
      process.argv = ['node', 'index.js', '--docs-path', '/valid/path', '--max-toc-depth', 'invalid', '--max-toc-depth', '3'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/valid/path');
      expect(config.maxTocDepth).toBe(3); // Should use the valid one
    });

    it('should handle decimal max-toc-depth values by converting to integer', async () => {
      // Set up process.argv with decimal max-toc-depth
      process.argv = ['node', 'index.js', '--max-toc-depth', '2.7'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('./docs');
      expect(config.maxTocDepth).toBe(2); // parseInt should convert to 2
    });
  });

  describe('Environment Variable Precedence', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset process.env
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      // Restore original process.env
      process.env = originalEnv;
    });

    it('should use DOCS_PATH environment variable when no CLI argument is provided', async () => {
      // Set environment variable
      process.env.DOCS_PATH = '/env/docs/path';

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/env/docs/path');
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should prioritize CLI docs-path over environment variable', async () => {
      // Set both environment variable and CLI argument
      process.env.DOCS_PATH = '/env/docs/path';
      process.argv = ['node', 'index.js', '--docs-path', '/cli/docs/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/cli/docs/path'); // CLI should take precedence
      expect(config.maxTocDepth).toBeUndefined();
    });

    it('should use CLI max-toc-depth when environment variable is also set for docs path', async () => {
      // Set environment variable for docs path and CLI argument for max depth
      process.env.DOCS_PATH = '/env/docs/path';
      process.argv = ['node', 'index.js', '--max-toc-depth', '2'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPath).toBe('/env/docs/path');
      expect(config.maxTocDepth).toBe(2);
    });
  });
});