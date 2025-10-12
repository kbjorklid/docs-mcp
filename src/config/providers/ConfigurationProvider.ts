/**
 * Abstract base class for configuration providers.
 * All configuration providers should extend this class.
 */

import { Configuration } from '../../types';

export abstract class ConfigurationProvider {
  /**
   * Unique name for this provider
   */
  abstract readonly name: string;

  /**
   * Priority level for precedence resolution.
   * Higher numbers take precedence over lower numbers.
   * CLI: 100, Environment: 50, Defaults: 10
   */
  abstract readonly priority: number;

  /**
   * Load configuration values from this provider's source.
   * Returns a partial configuration object with only the values
   * that this provider can supply.
   */
  public abstract load(): Partial<Configuration>;

  /**
   * Check if this provider is available and can provide values.
   * Some providers might not be available in certain environments.
   */
  public abstract isAvailable(): boolean;

  /**
   * Determine if this provider can override another provider.
   * Used for precedence resolution.
   */
  public canOverride(other: ConfigurationProvider): boolean {
    return this.priority > other.priority;
  }

  /**
   * Get a human-readable description of this provider.
   */
  public getDescription(): string {
    return `${this.name} (priority: ${this.priority})`;
  }
}