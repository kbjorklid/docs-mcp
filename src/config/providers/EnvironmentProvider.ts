/**
 * Environment variable configuration provider.
 * Provides configuration values from environment variables.
 */

import { Configuration } from '../../types';
import { ConfigurationProvider } from './ConfigurationProvider';

export class EnvironmentProvider extends ConfigurationProvider {
  readonly name = 'environment';
  readonly priority = 50; // Medium priority

  public isAvailable(): boolean {
    // Environment provider is available if DOCS_PATH or MAX_HEADERS is set
    return process.env.DOCS_PATH !== undefined || process.env.MAX_HEADERS !== undefined;
  }

  public load(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    // Only load values that are actually set in environment
    if (process.env.DOCS_PATH !== undefined) {
      // Split on commas and trim whitespace, filter out empty strings
      config.documentationPaths = process.env.DOCS_PATH
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);
    }

    // Parse MAX_HEADERS from environment if set
    if (process.env.MAX_HEADERS !== undefined) {
      const parsed = parseInt(process.env.MAX_HEADERS, 10);
      if (!isNaN(parsed) && parsed > 0) {
        config.maxHeaders = parsed;
      }
    }

    return config;
  }
}