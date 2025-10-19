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
    return !!args.docsPaths || args.maxHeaders !== undefined || args.prettyPrint !== undefined;
  }

  public load(): Partial<Configuration> {
    const args = this.parseCommandLineArgs();
    const config: Partial<Configuration> = {};

    if (args.docsPaths) {
      config.documentationPaths = args.docsPaths;
    }

    if (args.maxHeaders !== undefined) {
      config.maxHeaders = args.maxHeaders;
    }

    if (args.prettyPrint !== undefined) {
      config.prettyPrint = args.prettyPrint;
    }

    return config;
  }

  /**
   * Parse command line arguments and extract configuration values.
   *
   * Supported arguments:
   * - --docs-path or -d: Path to documentation directory
   * - --max-headers: Maximum number of headers to include in table of contents
   * - --pretty-print: Enable pretty-printing of JSON responses
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
      } else if (args[i] === '--max-headers') {
        if (i + 1 < args.length) {
          const parsed = parseInt(args[i + 1], 10);
          if (!isNaN(parsed) && parsed > 0) {
            result.maxHeaders = parsed;
            i++; // Skip the next argument
          }
        }
      } else if (args[i] === '--pretty-print') {
        result.prettyPrint = true;
      }
    }

    return result;
  }
}