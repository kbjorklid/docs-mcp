import * as path from 'path';
import { Section, Configuration, ErrorResponse, SearchResult, FileSearchResult } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';

// Type aliases for better readability
type ToolResponse =
  | { content: Array<{ type: 'text'; text: string }> }
  | never;

type SearchExecutionResult = SearchResult | ToolResponse;

// Constants for error codes and messages
const ERROR_CODES = {
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

const ERROR_MESSAGES = {
  QUERY_REQUIRED: 'query parameter is required and cannot be empty.',
  FILENAME_REQUIRED: 'filename parameter is required and cannot be empty.',
  INVALID_REGEX: (error: string) =>
    `Invalid regular expression: ${error}. Please check your regex syntax.`,
  FILE_NOT_FOUND: (filename: string) =>
    `File '${filename}' not found. Use the list_documentation_files tool to see available files.`,
  SEARCH_ERROR: 'Error searching documentation files',
} as const;

// Regular expression flags
const REGEX_FLAGS = 'is'; // i = case-insensitive, s = dotAll (multiline matching)

export class Search {
  private config: Configuration;
  private fileDiscovery: FileDiscoveryService;

  constructor(config: Configuration) {
    this.config = config;
    this.fileDiscovery = new FileDiscoveryService(config);
  }

  /**
   * Type guard to check if a value is a non-empty string
   * @param value - Value to check
   * @returns boolean indicating if value is a non-empty string
   */
  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Type guard to check if a value is an Error instance
   * @param error - Value to check
   * @returns boolean indicating if value is an Error instance
   */
  private isError(error: unknown): error is Error {
    return error instanceof Error;
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'search',
      description:
        'Use this tool ONLY AS A FALLBACK if you cannot find the information you need by using \'table_of_contents\' tool -. ' +
        'Search for text matches using regular expressions in documentation files. ' +
        'Use list_documentation_files to see available files before using this tool. ' +
        'Multiline-matching, case is ignored.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The regular expression pattern to search for (case-insensitive, multiline-matching). ' + 
            'Examples: "foo.*bar" matches across line breaks, "\\b[A-Z][a-z]+\\b" matches capitalized words.',
          },
          filename: {
            type: 'string',
            description: 'required specific file to search in. Use the list_documentation_files tool to see available files.',
          },
        },
        required: ['query', 'filename'],
      },
    };
  }

  /**
   * Execute the search tool with improved type safety and validation
   * @param query - The regular expression pattern to search for
   * @param filename - Specific file to search in
   * @returns Promise<ToolResponse> - Search results or error response
   */
  async execute(query: unknown, filename: unknown): Promise<ToolResponse> {
    // Validate input parameters using type guards
    const validationResult = this.validateInputParameters(query, filename);
    if (validationResult) {
      return validationResult;
    }

    // Compile and validate regular expression
    const regexResult = this.compileAndValidateRegex(query as string);
    if (regexResult.error) {
      return regexResult.error;
    }

    try {
      const searchResults = await this.searchInSpecificFile(regexResult.regex!, filename as string);
      return this.formatSuccessResponse(searchResults);
    } catch (error) {
      return this.handleSearchError(error, filename as string);
    }
  }

  /**
   * Validate input parameters using type guards
   * @param query - Query parameter to validate
   * @param filename - Filename parameter to validate
   * @returns ToolResponse | null - Error response if validation fails, null if valid
   */
  private validateInputParameters(
    query: unknown,
    filename: unknown
  ): ToolResponse | null {
    if (!this.isNonEmptyString(query)) {
      return this.createErrorResponse(
        ERROR_CODES.INVALID_PARAMETER,
        ERROR_MESSAGES.QUERY_REQUIRED
      );
    }

    if (!this.isNonEmptyString(filename)) {
      return this.createErrorResponse(
        ERROR_CODES.INVALID_PARAMETER,
        ERROR_MESSAGES.FILENAME_REQUIRED
      );
    }

    return null;
  }

  /**
   * Compile and validate the regular expression
   * @param query - The query string to compile into a regex
   * @returns Object with compiled regex or error response
   */
  private compileAndValidateRegex(query: string): { regex?: RegExp; error?: ToolResponse } {
    const trimmedQuery = query.trim();

    try {
      const regex = new RegExp(trimmedQuery, REGEX_FLAGS);
      return { regex };
    } catch (error) {
      const errorMessage = this.isError(error) ? error.message : 'Unknown error';
      return {
        error: this.createErrorResponse(
          ERROR_CODES.INVALID_PARAMETER,
          ERROR_MESSAGES.INVALID_REGEX(errorMessage),
          { error: this.isError(error) ? error : new Error(String(error)) }
        ),
      };
    }
  }

  /**
   * Format successful search result into MCP response format
   * @param searchResults - The search results to format
   * @returns Formatted tool response
   */
  private formatSuccessResponse(searchResults: SearchResult): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(searchResults, null, 2),
        },
      ],
    };
  }

  /**
   * Create a standardized error response with improved type safety
   * @param code - Error code from the error handling strategy
   * @param message - Human-readable error message
   * @param details - Optional additional error details
   * @returns Formatted error response matching MCP protocol
   */
  private createErrorResponse(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ToolResponse {
    const errorResponse: ErrorResponse = {
      error: { code, message, ...(details && { details }) },
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
    };
  }

  /**
   * Handle search errors with comprehensive error type coverage and context
   * @param error - The error that occurred during search (can be any type)
   * @param filename - Filename where the error occurred
   * @returns Formatted error response with appropriate error codes and context
   */
  private handleSearchError(error: unknown, filename: string): ToolResponse {
    // Handle specific file not found errors from our validateFile method
    if (this.isError(error) && error.message.startsWith('FILE_NOT_FOUND:')) {
      return this.createErrorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        error.message.replace('FILE_NOT_FOUND: ', ''),
        { filename }
      );
    }

    // Handle Error instances with proper serialization and development context
    if (this.isError(error)) {
      const errorDetails = {
        filename,
        error: {
          name: error.name,
          message: error.message,
          // Include stack trace in development/error context only
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
      };

      return this.createErrorResponse(
        ERROR_CODES.PARSE_ERROR,
        ERROR_MESSAGES.SEARCH_ERROR,
        errorDetails
      );
    }

    // Handle non-Error objects (string, number, null, undefined, etc.)
    const errorDetails = {
      filename,
      error: error ? String(error) : 'Unknown error occurred',
    };

    return this.createErrorResponse(
      ERROR_CODES.PARSE_ERROR,
      ERROR_MESSAGES.SEARCH_ERROR,
      errorDetails
    );
  }

  
  /**
   * Search in a specific file for matching sections
   * @param regex - Compiled regular expression to search with
   * @param filename - Name of the file to search in
   * @returns Promise<SearchResult> - Search results for the specific file
   * @throws Error if file validation fails or file cannot be processed
   */
  private async searchInSpecificFile(regex: RegExp, filename: string): Promise<SearchResult> {
    const matches = await this.findMatchesInFile(regex, filename);

    return {
      query: regex.source,
      results: [{ filename, matches }],
    };
  }

  /**
   * Find all sections in a file that contain the search pattern
   * @param regex - Compiled regular expression to search with
   * @param filename - Name of the file to search in
   * @returns Section[] - Array of sections that match the search pattern
   * @throws Error if file validation fails or content cannot be parsed
   */
  private async findMatchesInFile(regex: RegExp, filename: string): Promise<Section[]> {
    const fullPath = await this.fileDiscovery.resolveFilePath(filename);

    if (!fullPath) {
      throw new Error(`FILE_NOT_FOUND: ${ERROR_MESSAGES.FILE_NOT_FOUND(filename)}`);
    }

    // Validate file exists and is accessible
    this.validateFile(fullPath, filename);

    // Read and parse the markdown file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Filter sections that contain the search pattern in header or content
    return sections.filter(section =>
      this.doesSectionContainQuery(section, content, sectionMap, regex)
    );
  }

  /**
   * Validate file exists and is accessible, throwing appropriate errors
   * @param fullPath - Absolute path to the file
   * @param filename - Name of the file for error reporting
   * @throws Error with FILE_NOT_FOUND prefix if file not found, or other validation errors
   */
  private validateFile(fullPath: string, filename: string): void {
    const validation = MarkdownParser.validateFile(fullPath);

    if (!validation.valid) {
      if (validation.error === 'File not found') {
        throw new Error(
          `FILE_NOT_FOUND: ${ERROR_MESSAGES.FILE_NOT_FOUND(filename)}`
        );
      }

      // Handle all other file validation errors (permissions, size limits, etc.)
      throw new Error(validation.error);
    }
  }

  /**
   * Check if a section contains the search query in either header or content
   * Uses short-circuit evaluation for performance - checks header first (faster)
   * @param section - Section to check
   * @param content - Full file content
   * @param sectionMap - Map of section IDs to their line ranges
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if section contains the search query in header or content
   */
  private doesSectionContainQuery(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    regex: RegExp
  ): boolean {
    // Check header first (typically shorter and faster to evaluate)
    return this.doesHeaderMatch(section, regex) ||
           this.doesContentMatch(section, content, sectionMap, regex);
  }

  /**
   * Check if section header matches the search query
   * @param section - Section to check
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if header matches the search query
   */
  private doesHeaderMatch(section: Section, regex: RegExp): boolean {
    return regex.test(section.title);
  }

  /**
   * Check if section content matches the search query
   * Extracts the specific content lines for the section from the full file content
   * @param section - Section to check
   * @param content - Full file content (split by lines)
   * @param sectionMap - Map of section IDs to their line ranges {start, end}
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if section content matches the search query
   */
  private doesContentMatch(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    regex: RegExp
  ): boolean {
    const range = sectionMap.get(section.id);
    if (!range) {
      // Section has no range mapping, cannot check content
      return false;
    }

    // Extract content lines for this specific section
    const sectionContent = this.extractSectionContent(content, range);

    return regex.test(sectionContent);
  }

  /**
   * Extract the content for a specific section using its line range
   * @param content - Full file content
   * @param range - Line range {start, end} for the section
   * @returns string - The section's content
   */
  private extractSectionContent(
    content: string,
    range: { start: number; end: number }
  ): string {
    const contentLines = content.split('\n');
    const sectionContentLines = contentLines.slice(range.start, range.end + 1);
    return sectionContentLines.join('\n');
  }
}