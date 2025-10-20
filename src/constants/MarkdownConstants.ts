/**
 * Constants for markdown parsing and processing
 */

/**
 * Maximum header levels supported by Markdown (# through ######)
 * Markdown spec supports 6 levels of headers
 */
export const MAX_HEADER_LEVELS = 6;

/**
 * Minimum number of headers required for viability in table of contents
 * Below this threshold, additional header levels are included to provide useful context
 */
export const MINIMUM_VIABLE_HEADER_COUNT = 3;

/**
 * Default maximum depth for table of contents
 * Controls how many header levels are included by default (1 = #, 2 = ##, 3 = ###)
 */
export const DEFAULT_MAX_TOC_DEPTH = 3;
