/**
 * Command line argument parsing utilities for the documentation MCP server.
 */

/**
 * Interface for parsed command line arguments.
 */
export interface ParsedCommandLineArgs {
  docsPath?: string;
  maxTocDepth?: number;
  discountSingleTopHeader?: boolean;
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
export function parseCommandLineArgs(): ParsedCommandLineArgs {
  const args = process.argv.slice(2);
  const result: ParsedCommandLineArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--docs-path' || args[i] === '-d') {
      if (i + 1 < args.length) {
        result.docsPath = args[i + 1];
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