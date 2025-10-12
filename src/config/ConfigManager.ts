/**
 * Configuration management utilities for the documentation MCP server.
 */

import { DEFAULT_CONFIG, DocumentationConfig } from '../types';
import { parseCommandLineArgs, ParsedCommandLineArgs } from './ArgumentParser';

/**
 * Create configuration with precedence: CLI args > environment variables > defaults.
 *
 * @param cliArgs Optional parsed command line arguments. If not provided, will parse from process.argv.
 * @returns Complete documentation configuration
 */
export function createConfig(cliArgs?: ParsedCommandLineArgs): DocumentationConfig {
  // Parse command line arguments if not provided
  const parsedArgs = cliArgs || parseCommandLineArgs();

  const config: DocumentationConfig = {
    ...DEFAULT_CONFIG,
    documentation_path: parsedArgs.docsPath || process.env.DOCS_PATH || './docs',
  };

  // Add max_toc_depth if provided via command line
  if (parsedArgs.maxTocDepth !== undefined) {
    config.max_toc_depth = parsedArgs.maxTocDepth;
  }

  // Add discount_single_top_header if provided via command line
  if (parsedArgs.discountSingleTopHeader !== undefined) {
    config.discount_single_top_header = parsedArgs.discountSingleTopHeader;
  }

  return config;
}