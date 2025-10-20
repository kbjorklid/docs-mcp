import { Section, Configuration, SearchResult, FileSearchResult } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { createSuccessResponse, createErrorResponse, isNonEmptyString, isError, parseToolError, getErrorMessage, hasHiddenSubsections, INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS, isValidFileId, type ToolResponse } from '../utils';
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
        'Use this tool ONLY AS A FALLBACK if you cannot find the information you need by using \'table_of_contents\' tool. ' +
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
          fileId: {
            type: 'string',
            description: 'Optional file ID (e.g., \'f1\', \'f2\') to search in. If not provided, searches all files. Use the list_documentation_files tool to see available file IDs.',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * Execute the search tool with improved type safety and validation
   * @param query - The regular expression pattern to search for
   * @param fileId - Optional file ID to search in (if not provided, searches all files)
   * @returns Promise<ToolResponse> - Search results or error response
   */
  async execute(query: unknown, fileId?: unknown): Promise<ToolResponse> {
    // Validate query parameter
    if (!isNonEmptyString(query)) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_PARAMETER('query'));
    }

    // Validate fileId if provided
    if (fileId !== undefined && fileId !== null) {
      if (!isValidFileId(fileId)) {
        return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_ID(fileId as string));
      }
    }

    // Compile and validate regular expression
    const regexResult = this.compileAndValidateRegex(query as string);
    if (regexResult.error) {
      return regexResult.error;
    }

    try {
      const searchResults = fileId
        ? await this.searchInSpecificFile(regexResult.regex!, fileId as string)
        : await this.searchInAllFiles(regexResult.regex!);
      return createSuccessResponse(searchResults);
    } catch (error) {
      return this.handleSearchError(error, fileId as string | undefined);
    }
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
   * @param fileId - Optional file ID where the error occurred
   * @returns Formatted error response with helpful guidance
   */
  private handleSearchError(error: unknown, fileId?: string): ToolResponse {
    const parsedError = parseToolError(error);

    // If it's a specific tool error type, use the parsed message
    if (parsedError.type !== 'PARSE_ERROR') {
      return createErrorResponse(getErrorMessage(parsedError));
    }

    // For generic parse errors or unknown errors, use search-specific error message
    return createErrorResponse(ERROR_MESSAGES.SEARCH_ERROR);
  }


  /**
   * Search in all files for matching sections
   * @param regex - Compiled regular expression to search with
   * @returns Promise<SearchResult> - Search results across all files
   */
  private async searchInAllFiles(regex: RegExp): Promise<SearchResult> {
    const allFiles = await this.fileDiscovery.getAllFiles();
    const results: FileSearchResult[] = [];

    for (let index = 0; index < allFiles.length; index++) {
      const file = allFiles[index];
      const fileId = `f${index + 1}`;
      const matches = await this.findMatchesInFile(regex, file.fullPath);

      if (matches.length > 0) {
        results.push({
          fileId,
          filename: file.filename,
          matches,
        });
      }
    }

    const result: SearchResult = {
      query: regex.source,
      results,
    };

    // Check if any matched section has hidden subsections
    const allMatches = results.flatMap(r => r.matches);
    if (hasHiddenSubsections(allMatches)) {
      result.instructions = INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS;
    }

    return result;
  }

  /**
   * Search in a specific file for matching sections
   * @param regex - Compiled regular expression to search with
   * @param fileId - File ID to search in
   * @returns Promise<SearchResult> - Search results for the specific file
   * @throws Error if file validation fails or file cannot be processed
   */
  private async searchInSpecificFile(regex: RegExp, fileId: string): Promise<SearchResult> {
    const fileMapping = await this.fileDiscovery.getFileByFileId(fileId);

    if (!fileMapping) {
      throw new Error(ERROR_MESSAGES.FILE_ID_NOT_FOUND(fileId));
    }

    const matches = await this.findMatchesInFile(regex, fileMapping.fullPath);

    const result: SearchResult = {
      query: regex.source,
      results: [{
        fileId,
        filename: fileMapping.filename,
        matches,
      }],
    };

    // Add instructions if any matched section has hidden subsections
    if (hasHiddenSubsections(matches)) {
      result.instructions = INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS;
    }

    return result;
  }

  /**
   * Find all sections in a file that contain the search pattern
   * @param regex - Compiled regular expression to search with
   * @param fullPath - Full path to the file to search in
   * @returns Section[] - Array of sections that match the search pattern
   * @throws Error if file cannot be read or parsed
   */
  private async findMatchesInFile(regex: RegExp, fullPath: string): Promise<Section[]> {
    // Read and parse the markdown file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
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
    const directChildren = this.findDirectChildSections(section, sections);
    const childRangesSorted = this.sortChildSectionsByPosition(directChildren, sectionMap);
    const linesToInclude = this.buildLineRangesExcludingChildren(range, childRangesSorted);

    return linesToInclude
      .flatMap(r => contentLines.slice(r.start, r.end + 1))
      .join('\n');
  }

  /**
   * Find all direct child sections of the given section.
   * A direct child's ID starts with the parent's ID followed by exactly one more path segment.
   */
  private findDirectChildSections(section: Section, sections: Section[]): Section[] {
    const parentIdPrefix = section.id + '/';
    const parentDepth = section.id.split('/').length;

    return sections.filter(s =>
      s.id.startsWith(parentIdPrefix) &&
      s.id.split('/').length === parentDepth + 1
    );
  }

  /**
   * Sort child sections by their starting line position in the document.
   */
  private sortChildSectionsByPosition(
    children: Section[],
    sectionMap: Map<string, { start: number; end: number }>
  ): Array<{ section: Section; range: { start: number; end: number } }> {
    return children
      .map(child => ({ section: child, range: sectionMap.get(child.id)! }))
      .sort((a, b) => a.range.start - b.range.start);
  }

  /**
   * Build line ranges that include parent content but exclude child section ranges.
   * Returns array of {start, end} line ranges to include in final content.
   */
  private buildLineRangesExcludingChildren(
    parentRange: { start: number; end: number },
    sortedChildren: Array<{ section: Section; range: { start: number; end: number } }>
  ): Array<{ start: number; end: number }> {
    const linesToInclude: { start: number; end: number }[] = [];
    let currentPos = parentRange.start;

    for (const { range: childRange } of sortedChildren) {
      if (childRange.start > currentPos) {
        linesToInclude.push({ start: currentPos, end: childRange.start - 1 });
      }
      currentPos = childRange.end + 1;
    }

    if (currentPos <= parentRange.end) {
      linesToInclude.push({ start: currentPos, end: parentRange.end });
    }

    return linesToInclude;
  }
}