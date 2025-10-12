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
    // Ensure documentationPath is always present
    if (!config.documentationPath) {
      config.documentationPath = './docs';
    }

    // Validate maxTocDepth if present
    if (config.maxTocDepth !== undefined) {
      if (typeof config.maxTocDepth !== 'number' || config.maxTocDepth <= 0) {
        delete config.maxTocDepth;
      }
    }

    // Ensure discountSingleTopHeader is boolean
    if (config.discountSingleTopHeader !== undefined) {
      config.discountSingleTopHeader = Boolean(config.discountSingleTopHeader);
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
    return !!(this.args.docsPath || this.args.maxTocDepth !== undefined || this.args.discountSingleTopHeader);
  }

  public load(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    if (this.args.docsPath) {
      config.documentationPath = this.args.docsPath;
    }

    if (this.args.maxTocDepth !== undefined) {
      config.maxTocDepth = this.args.maxTocDepth;
    }

    if (this.args.discountSingleTopHeader) {
      config.discountSingleTopHeader = this.args.discountSingleTopHeader;
    }

    return config;
  }
}