import { Section, Configuration, SearchResult, FileSearchResult } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, validateAndResolveFile, isNonEmptyString, isError, parseToolError, getErrorMessage, createFileNotFoundError, type ToolResponse } from '../utils';
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
    if (!isNonEmptyString(query)) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('query'));
    }

    if (!isNonEmptyString(filename)) {
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
    const parsedError = parseToolError(error);

    // If it's a specific tool error type (FILE_NOT_FOUND or SECTION_NOT_FOUND), use the parsed message
    if (parsedError.type !== 'PARSE_ERROR') {
      return createErrorResponse(getErrorMessage(parsedError));
    }

    // For generic parse errors or unknown errors, use search-specific error message
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
      throw createFileNotFoundError(filename, errorMsg);
    }

    // Read and parse the markdown file
    const { content } = MarkdownParser.readMarkdownFile(fileValidation.fullPath!);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    // Filter sections that contain the search pattern in header or content
    const matchedSections = sections.filter(section =>
      this.doesSectionContainQuery(section, content, sectionMap, sections, regex)
    );

    // Apply conditional logic: only show subsection_count if not all children are matched
    MarkdownParser.applyConditionalSubsectionCounts(matchedSections);

    return matchedSections;
  }

  /**
   * Check if a section contains the search query in either header or content
   * Uses short-circuit evaluation for performance - checks header first (faster)
   * @param section - Section to check
   * @param content - Full file content
   * @param sectionMap - Map of section IDs to their line ranges
   * @param sections - All sections in the file
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if section contains the search query in header or content
   */
  private doesSectionContainQuery(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    sections: Section[],
    regex: RegExp
  ): boolean {
    // Check header first (typically shorter and faster to evaluate)
    return this.doesHeaderMatch(section, regex) ||
           this.doesContentMatch(section, content, sectionMap, sections, regex);
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
   * Excludes content that belongs to direct child sections
   * @param section - Section to check
   * @param content - Full file content (split by lines)
   * @param sectionMap - Map of section IDs to their line ranges {start, end}
   * @param sections - All sections in the file (to identify children)
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if section content matches the search query
   */
  private doesContentMatch(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    sections: Section[],
    regex: RegExp
  ): boolean {
    const range = sectionMap.get(section.id);
    if (!range) {
      // Section has no range mapping, cannot check content
      return false;
    }

    // Extract content lines for this specific section, excluding child sections
    const sectionContent = this.extractSectionContent(content, range, section, sectionMap, sections);

    return regex.test(sectionContent);
  }

  /**
   * Extract the content for a specific section using its line range
   * Excludes content that belongs to direct child sections
   * @param content - Full file content
   * @param range - Line range {start, end} for the section
   * @param section - The current section
   * @param sectionMap - Map of section IDs to their line ranges
   * @param sections - All sections in the file
   * @returns string - The section's content with child sections excluded
   */
  private extractSectionContent(
    content: string,
    range: { start: number; end: number },
    section: Section,
    sectionMap: Map<string, { start: number; end: number }>,
    sections: Section[]
  ): string {
    const contentLines = content.split('\n');

    // Find direct child sections (sections whose IDs start with this section's ID followed by /)
    const childSections = sections.filter(s =>
      s.id.startsWith(section.id + '/') &&
      s.id.split('/').length === section.id.split('/').length + 1
    );

    // Build line ranges to include, excluding child sections
    const linesToInclude: { start: number; end: number }[] = [];
    let currentPos = range.start;

    // Sort child sections by their start line
    const sortedChildren = childSections
      .map(child => ({ section: child, range: sectionMap.get(child.id)! }))
      .sort((a, b) => a.range.start - b.range.start);

    for (const { section: childSection, range: childRange } of sortedChildren) {
      if (childRange.start > currentPos) {
        // Include content before this child
        linesToInclude.push({ start: currentPos, end: childRange.start - 1 });
      }
      // Skip the child section entirely
      currentPos = childRange.end + 1;
    }

    // Include remaining content after last child
    if (currentPos <= range.end) {
      linesToInclude.push({ start: currentPos, end: range.end });
    }

    // Extract the content from the identified ranges
    const sectionLines = linesToInclude
      .flatMap(r => contentLines.slice(r.start, r.end + 1));

    return sectionLines.join('\n');
  }
}