/**
 * Standardized error codes and messages for all tools.
 * Provides consistent error responses across the application.
 */

/**
 * Error codes used in tool responses
 */
export const ERROR_CODES = {
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  SECTION_NOT_FOUND: 'SECTION_NOT_FOUND',
  PARSE_ERROR: 'PARSE_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  UNKNOWN_TOOL: 'UNKNOWN_TOOL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Error messages for common error scenarios
 */
export const ERROR_MESSAGES = {
  INVALID_PARAMETER: (param: string) =>
    `${param} parameter is required and cannot be empty.`,
  FILE_NOT_FOUND: (filename: string) =>
    `File '${filename}' not found. Use the list_documentation_files tool to see available files.`,
  INVALID_REGEX: (error: string) =>
    `Invalid regular expression: ${error}. Please check your regex syntax.`,
  SEARCH_ERROR: 'Error searching documentation files',
  PARSE_ERROR: 'Error parsing markdown file',
  FILE_SYSTEM_ERROR: 'Error accessing documentation files',
} as const;
