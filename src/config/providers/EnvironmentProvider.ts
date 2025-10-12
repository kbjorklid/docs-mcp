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
    // Environment provider is available if any relevant env vars are set
    return !!process.env.DOCS_PATH;
  }

  public load(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    // Only load values that are actually set in environment
    if (process.env.DOCS_PATH) {
      config.documentationPath = process.env.DOCS_PATH;
    }

    // Note: max_toc_depth and discount_single_top_header
    // are not currently supported via environment variables,
    // but the structure allows for future extension

    return config;
  }
}