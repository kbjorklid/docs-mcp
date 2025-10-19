import { Section, Configuration, SearchResult, FileSearchResult } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile, type ToolResponse } from '../utils';
import { ERROR_MESSAGES } from '../constants';

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
      return createSuccessResponse(searchResults);
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
      return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('query'));
    }

    if (!this.isNonEmptyString(filename)) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('filename'));
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
      // Try to compile the regex - this may throw if the pattern is invalid
      const regex = new RegExp(trimmedQuery, REGEX_FLAGS);
      return { regex };
    } catch (caughtError: unknown) {
      // Handle the error - could be a SyntaxError or other exception
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError);
      return {
        error: createErrorResponse(ERROR_MESSAGES.INVALID_REGEX(errorMessage)),
      };
    }
  }


  /**
   * Handle search errors with comprehensive error type coverage
   * @param error - The error that occurred during search (can be any type)
   * @param filename - Filename where the error occurred
   * @returns Formatted error response with helpful guidance
   */
  private handleSearchError(error: unknown, filename: string): ToolResponse {
    // Handle specific file not found errors from our validateFile method
    if (this.isError(error) && error.message.startsWith('FILE_NOT_FOUND:')) {
      // Format: FILE_NOT_FOUND: filename|error message
      const parts = error.message.split('|');
      const errorMsg = parts[1] || ERROR_MESSAGES.SEARCH_ERROR;
      return createErrorResponse(errorMsg);
    }

    // Handle Error instances - return the error message or a generic search error message
    if (this.isError(error)) {
      return createErrorResponse(ERROR_MESSAGES.SEARCH_ERROR);
    }

    // Handle non-Error objects - return a generic search error message
    return createErrorResponse(ERROR_MESSAGES.SEARCH_ERROR);
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
    // Validate and resolve the file path
    const fileValidation = await validateAndResolveFile(filename, this.fileDiscovery);

    if (!fileValidation.valid) {
      const errorMsg = fileValidation.errorMessage || ERROR_MESSAGES.FILE_NOT_FOUND(filename);
      throw new Error(`FILE_NOT_FOUND: ${filename}|${errorMsg}`);
    }

    // Read and parse the markdown file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Filter sections that contain the search pattern in header or content
    return sections.filter(section =>
      this.doesSectionContainQuery(section, content, sectionMap, regex)
    );
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