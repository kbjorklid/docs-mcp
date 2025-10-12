/**
 * Default configuration provider.
 * Provides hardcoded default values for all configuration options.
 */

import { Configuration, DEFAULT_CONFIG } from '../../types';
import { ConfigurationProvider } from './ConfigurationProvider';

export class DefaultProvider extends ConfigurationProvider {
  readonly name = 'defaults';
  readonly priority = 10; // Lowest priority

  public isAvailable(): boolean {
    // Default provider is always available
    return true;
  }

  public load(): Partial<Configuration> {
    // Return all default values
    return { ...DEFAULT_CONFIG };
  }
}