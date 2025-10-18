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
    return !!(args.docsPaths || args.maxTocDepth !== undefined || args.discountSingleTopHeader);
  }

  public load(): Partial<Configuration> {
    const args = this.parseCommandLineArgs();
    const config: Partial<Configuration> = {};

    if (args.docsPaths) {
      config.documentationPaths = args.docsPaths;
    }

    if (args.maxTocDepth !== undefined) {
      config.maxTocDepth = args.maxTocDepth;
    }

    if (args.discountSingleTopHeader) {
      config.discountSingleTopHeader = args.discountSingleTopHeader;
    }

    return config;
  }

  /**
   * Parse command line arguments and extract configuration values.
   *
   * Supported arguments:
   * - --docs-path or -d: Path to documentation directory
   * - --max-toc-depth: Maximum depth for table of contents
   * - --discount-single-top-header: Discount single top-level header
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
      } else if (args[i] === '--max-toc-depth') {
        if (i + 1 < args.length) {
          const depth = parseInt(args[i + 1], 10);
          if (!isNaN(depth) && depth > 0) {
            result.maxTocDepth = depth;
          }
          i++; // Skip the next argument
        }
      } else if (args[i] === '--discount-single-top-header') {
        result.discountSingleTopHeader = true;
      }
    }

    return result;
  }
}