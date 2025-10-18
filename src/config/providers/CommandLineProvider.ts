/**
 * Command line argument configuration provider.
 * Provides configuration values from command line arguments.
 */

import { Configuration, ParsedCommandLineArgs } from '../../types';
import { ConfigurationProvider } from './ConfigurationProvider';

export class CommandLineProvider extends ConfigurationProvider {
  readonly name = 'commandline';
  readonly priority = 100; // Highest priority

  public isAvailable(): boolean {
    const args = this.parseCommandLineArgs();
    return !!args.docsPaths;
  }

  public load(): Partial<Configuration> {
    const args = this.parseCommandLineArgs();
    const config: Partial<Configuration> = {};

    if (args.docsPaths) {
      config.documentationPaths = args.docsPaths;
    }

    return config;
  }

  /**
   * Parse command line arguments and extract configuration values.
   *
   * Supported arguments:
   * - --docs-path or -d: Path to documentation directory
   *
   * @returns Object containing parsed arguments
   */
  private parseCommandLineArgs(): ParsedCommandLineArgs {
    const args = process.argv.slice(2);
    const result: ParsedCommandLineArgs = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--docs-path' || args[i] === '-d') {
        if (i + 1 < args.length) {
          // Initialize array if needed and append path
          result.docsPaths = result.docsPaths || [];
          result.docsPaths.push(args[i + 1]);
          i++; // Skip the next argument
        }
      }
    }

    return result;
  }
}