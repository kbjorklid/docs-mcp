/**
 * Configuration management utilities for the documentation MCP server.
 */

import {
  DEFAULT_CONFIG,
  Configuration,
  ParsedCommandLineArgs
} from '../types';
import {
  ConfigurationProvider,
  DefaultProvider,
  EnvironmentProvider,
  CommandLineProvider
} from './providers';

/**
 * Configuration manager that uses a provider-based architecture.
 * Maintains precedence: CLI args > environment variables > defaults.
 */
export class ConfigurationManager {
  private providers: ConfigurationProvider[];

  constructor(providers?: ConfigurationProvider[]) {
    this.providers = providers || this.getDefaultProviders();
    // Sort by priority (highest first)
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Load complete configuration by merging values from all providers.
   * Providers with higher priority override lower priority providers.
   */
  public load(): Configuration {
    let config: Partial<Configuration> = {};

    // Sort providers by priority (lowest first) so higher priority providers override
    const sortedProviders = [...this.providers].sort((a, b) => a.priority - b.priority);

    for (const provider of sortedProviders) {
      if (provider.isAvailable()) {
        const providerConfig = provider.load();
        config = { ...config, ...providerConfig };
      }
    }

    return this.validateAndNormalize(config);
  }

  
  /**
   * Add a configuration provider to the chain.
   */
  public addProvider(provider: ConfigurationProvider): void {
    this.providers.push(provider);
    // Re-sort by priority
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a configuration provider by name.
   */
  public removeProvider(name: string): boolean {
    const initialLength = this.providers.length;
    this.providers = this.providers.filter(provider => provider.name !== name);
    return this.providers.length < initialLength;
  }

  /**
   * Get the default set of providers.
   */
  private getDefaultProviders(): ConfigurationProvider[] {
    return [
      new DefaultProvider(),
      new EnvironmentProvider(),
      new CommandLineProvider(),
    ];
  }

  /**
   * Validate and normalize the configuration.
   * Ensures all required fields are present and valid.
   */
  private validateAndNormalize(config: Partial<Configuration>): Configuration {
    // Convert single documentationPath to array if present (backward compatibility)
    if ((config as any).documentationPath && !config.documentationPaths) {
      config.documentationPaths = [(config as any).documentationPath];
      delete (config as any).documentationPath; // Remove old property
    }

    // Ensure documentationPaths is always present and is an array
    if (!config.documentationPaths || !Array.isArray(config.documentationPaths)) {
      config.documentationPaths = ['./docs'];
    }

    // Filter out empty/invalid paths and trim whitespace
    config.documentationPaths = config.documentationPaths
      .map(path => path.trim())
      .filter(path => path && path.length > 0);

    // Ensure at least one valid path
    if (config.documentationPaths.length === 0) {
      config.documentationPaths = ['./docs'];
    }

    // Validate maxHeaders if present
    if (config.maxHeaders !== undefined) {
      if (typeof config.maxHeaders !== 'number' || isNaN(config.maxHeaders) || config.maxHeaders < 1) {
        // Remove invalid maxHeaders, fall back to default
        delete config.maxHeaders;
      }
    }

    return config as Configuration;
  }

  /**
   * Get information about available providers and their values.
   * Useful for debugging configuration resolution.
   */
  public getDebugInfo(): Array<{ name: string; priority: number; available: boolean; values: Partial<Configuration> }> {
    return this.providers.map(provider => ({
      name: provider.name,
      priority: provider.priority,
      available: provider.isAvailable(),
      values: provider.isAvailable() ? provider.load() : {}
    }));
  }
}

/**
 * Create configuration with precedence: CLI args > environment variables > defaults.
 *
 * @param cliArgs Optional parsed command line arguments. If not provided, will parse from process.argv.
 * @returns Complete configuration
 */
export function createConfig(cliArgs?: ParsedCommandLineArgs): Configuration {
  // Always create a fresh configuration manager to avoid caching issues
  const manager = new ConfigurationManager();

  if (cliArgs) {
    // If CLI args are provided, replace the default CLI provider
    manager.removeProvider('commandline');
    manager.addProvider(new CommandLineProviderWithArgs(cliArgs));
  }

  return manager.load();
}

/**
 * Helper class for CommandLineProvider that uses pre-parsed arguments.
 */
class CommandLineProviderWithArgs extends CommandLineProvider {
  private readonly args: ParsedCommandLineArgs;

  constructor(args: ParsedCommandLineArgs) {
    super();
    this.args = args;
  }

  public isAvailable(): boolean {
    return !!this.args.docsPaths || this.args.maxHeaders !== undefined;
  }

  public load(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    if (this.args.docsPaths) {
      config.documentationPaths = this.args.docsPaths;
    }

    if (this.args.maxHeaders !== undefined) {
      config.maxHeaders = this.args.maxHeaders;
    }

    return config;
  }
}