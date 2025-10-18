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
    it('should return default docs path when no arguments are provided', async () => {
      // Import the function after mocking process.argv
      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPaths).toEqual(['./docs']);
    });

    it('should parse docs-path argument correctly', async () => {
      // Set up process.argv with docs-path argument
      process.argv = ['node', 'index.js', '--docs-path', '/custom/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPaths).toEqual(['/custom/path']);
    });

    it('should parse short docs-path argument (-d) correctly', async () => {
      // Set up process.argv with short docs-path argument
      process.argv = ['node', 'index.js', '-d', '/another/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPaths).toEqual(['/another/path']);
    });

    it('should handle docs-path argument without following value gracefully', async () => {
      // Set up process.argv with docs-path but no following value
      process.argv = ['node', 'index.js', '--docs-path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPaths).toEqual(['./docs']);
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

      expect(config.documentationPaths).toEqual(['/env/docs/path']);
    });

    it('should prioritize CLI docs-path over environment variable', async () => {
      // Set both environment variable and CLI argument
      process.env.DOCS_PATH = '/env/docs/path';
      process.argv = ['node', 'index.js', '--docs-path', '/cli/docs/path'];

      const { createConfig } = await import('../config/ConfigManager');
      const config = createConfig();

      expect(config.documentationPaths).toEqual(['/cli/docs/path']); // CLI should take precedence
    });
  });
});