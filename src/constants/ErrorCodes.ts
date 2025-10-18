/**
 * Standardized error messages for all tools.
 * Provides consistent, helpful error guidance to AI agents.
 */

/**
 * Error messages for common error scenarios
 * Messages are conversational and guide AI agents on how to fix issues
 */
export const ERROR_MESSAGES = {
  INVALID_PARAMETER: (param: string) =>
    `The '${param}' parameter is required and cannot be empty. Please provide a valid value.`,
  FILE_NOT_FOUND: (filename: string) =>
    `The file '${filename}' was not found in any documentation directory. Use the list_documentation_files tool first to see all available files and their correct paths.`,
  INVALID_REGEX: (error: string) =>
    `Invalid regular expression pattern: ${error}. Please check your regex syntax and try again.`,
  SEARCH_ERROR: 'An error occurred while searching documentation files. Please check that the file exists using the list_documentation_files tool.',
  PARSE_ERROR: 'An error occurred while parsing the markdown file. The file may be corrupted or in an unsupported format.',
  FILE_SYSTEM_ERROR: 'An error occurred while accessing the documentation files. This may be a permissions issue or the files may not be accessible.',
  UNKNOWN_TOOL: (toolName: string) =>
    `The tool '${toolName}' is not recognized. Use the tools/list command to see all available tools.`,
  INTERNAL_ERROR: 'An unexpected internal error occurred. This may be a server issue. Please try again or contact support if the problem persists.',
  SECTION_NOT_FOUND: (missingIds: string[], filename: string) =>
    `The sections [${missingIds.join(', ')}] were not found in '${filename}'. Use the table_of_contents tool to see all available section IDs in this file.`,
  FILENAME_REQUIRED: 'The filename parameter is required. Use the list_documentation_files tool to see available files and provide the correct filename.',
  SECTION_IDS_REQUIRED: 'The section_ids parameter must be an array of section identifiers. Use the table_of_contents tool first to get valid section IDs.',
  NO_FILES_FOUND: 'No documentation files were found in the configured documentation directories. Please check that your documentation path is configured correctly.',
} as const;
