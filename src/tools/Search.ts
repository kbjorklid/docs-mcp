import * as path from 'path';
import { Section, Configuration, ErrorResponse, SearchResult, FileSearchResult, FileListItem } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { ListDocumentationFiles } from './ListDocumentationFiles';

export class Search {
  private config: Configuration;

  constructor(config: Configuration) {
    this.config = config;
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'search',
      description:
        'Search for text matches using regular expressions in documentation files. ' +
        'Returns headers and section IDs where the search pattern is found in either the header text or section content. ' + 
        'Spports full regular expression syntax with multiline matching (the "s" flag is enabled automatically for dotAll behavior).',
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
            description: 'optional specific file to search in. If not provided, searches all available ' + 
            'documentation files. Use the list_documentation_files tool to see available files.',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * Execute the search tool
   * @param query - The regular expression pattern to search for
   * @param filename - Optional specific file to search in
   * @returns Promise<SearchResult | ErrorResponse> - Search results or error response
   */
  async execute(query: string, filename?: string): Promise<any> {
    if (!query || query.trim() === '') {
      return this.createErrorResponse(
        'INVALID_PARAMETER',
        'query parameter is required and cannot be empty.'
      );
    }

    // Validate regular expression
    const trimmedQuery = query.trim();
    let regex: RegExp;
    try {
      regex = new RegExp(trimmedQuery, 'is'); // i = case-insensitive, s = dotAll (multiline matching)
    } catch (error) {
      return this.createErrorResponse(
        'INVALID_PARAMETER',
        `Invalid regular expression: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your regex syntax.`,
        { error: error instanceof Error ? error : new Error(String(error)) }
      );
    }

    try {
      const searchResults = await this.performSearchAcrossFiles(regex, filename);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(searchResults, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleSearchError(error, filename);
    }
  }

  /**
   * Create a standardized error response
   * @param code - Error code from the error handling strategy
   * @param message - Human-readable error message
   * @param details - Optional additional error details
   * @returns MCP response object with error content
   */
  private createErrorResponse(code: string, message: string, details?: any) {
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
   * Handle search errors with appropriate error codes and context
   * @param error - The error that occurred during search
   * @param filename - Optional filename where the error occurred
   * @returns MCP response object with error content
   */
  private handleSearchError(error: unknown, filename?: string) {
    // Handle specific file not found errors
    if (error instanceof Error && error.message.startsWith('FILE_NOT_FOUND:')) {
      return this.createErrorResponse(
        'FILE_NOT_FOUND',
        error.message.replace('FILE_NOT_FOUND: ', ''),
        { filename }
      );
    }

    // Handle specific file system errors
    if (error instanceof Error && error.message.startsWith('Expected array of files')) {
      return this.createErrorResponse(
        'INTERNAL_ERROR',
        'Invalid response from file listing tool',
        { filename, technicalDetails: error.message }
      );
    }

    // Handle Error instances with proper serialization
    if (error instanceof Error) {
      return this.createErrorResponse(
        'PARSE_ERROR',
        'Error searching documentation files',
        {
          filename,
          error: {
            name: error.name,
            message: error.message,
            // Include stack trace in development/error context only
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
          }
        }
      );
    }

    // Handle non-Error objects (string, number, etc.)
    return this.createErrorResponse(
      'PARSE_ERROR',
      'Error searching documentation files',
      {
        filename,
        error: error ? String(error) : 'Unknown error occurred'
      }
    );
  }

  /**
   * Perform search across files with improved performance
   * @param regex - Compiled regular expression to search with
   * @param filename - Optional specific file to search in
   * @returns Promise<SearchResult> - Search results
   */
  private async performSearchAcrossFiles(regex: RegExp, filename?: string): Promise<SearchResult> {
    return filename
      ? await this.searchInSpecificFile(regex, filename)
      : await this.searchAcrossAllFiles(regex);
  }

  /**
   * Search in a specific file
   * @param regex - Compiled regular expression to search with
   * @param filename - Name of the file to search in
   * @returns Promise<SearchResult> - Search results for the specific file
   */
  private async searchInSpecificFile(regex: RegExp, filename: string): Promise<SearchResult> {
    const matches = this.findMatchesInFile(regex, filename);
    const result: SearchResult = {
      query: regex.source,
      results: [{ filename, matches }],
    };
    return result;
  }

  /**
   * Search across all documentation files concurrently
   * @param regex - Compiled regular expression to search with
   * @returns Promise<SearchResult> - Search results across all files
   */
  private async searchAcrossAllFiles(regex: RegExp): Promise<SearchResult> {
    const listDocumentationFiles = new ListDocumentationFiles(this.config);
    const filesResult = await listDocumentationFiles.execute();
    const filesData: FileListItem[] = JSON.parse(filesResult.content[0].text as string);

    // Validate that we received the expected data structure
    if (!Array.isArray(filesData)) {
      throw new Error('Expected array of files from ListDocumentationFiles tool');
    }

    const searchPromises = filesData.map(async (file: FileListItem) => {
      try {
        const matches = this.findMatchesInFile(regex, file.filename);
        return matches.length > 0 ? { filename: file.filename, matches } : null;
      } catch (error) {
        console.warn(`Warning: Could not search in file ${file.filename}:`, error);
        return null;
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    const successfulResults = settledResults
      .filter((result): result is PromiseFulfilledResult<FileSearchResult | null> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as FileSearchResult);

    return { query: regex.source, results: successfulResults };
  }

  /**
   * Find matching sections in a file
   * @param regex - Compiled regular expression to search with
   * @param filename - Name of the file to search in
   * @returns Section[] - Array of matching sections
   */
  private findMatchesInFile(regex: RegExp, filename: string): Section[] {
    const fullPath = path.resolve(this.config.documentationPath, filename);

    this.validateFile(fullPath, filename);

    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);

    return sections.filter(section =>
      this.doesSectionContainQuery(section, content, sectionMap, regex)
    );
  }

  /**
   * Validate file exists and is accessible
   * @param fullPath - Absolute path to the file
   * @param filename - Name of the file for error reporting
   * @throws Error if file validation fails
   */
  private validateFile(fullPath: string, filename: string): void {
    const validation = MarkdownParser.validateFile(fullPath);

    if (!validation.valid) {
      switch (validation.error) {
        case 'File not found':
          throw new Error(
            `FILE_NOT_FOUND: File '${filename}' not found. Use the list_documentation_files tool to see available files.`
          );
        default:
          throw new Error(validation.error);
      }
    }
  }

  /**
   * Check if a section contains the search query in either header or content
   * @param section - Section to check
   * @param content - Full file content
   * @param sectionMap - Map of section IDs to their line ranges
   * @param regex - Compiled regular expression to search with
   * @returns boolean - True if section contains the search query
   */
  private doesSectionContainQuery(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    regex: RegExp
  ): boolean {
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
   * @param section - Section to check
   * @param content - Full file content
   * @param sectionMap - Map of section IDs to their line ranges
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
      return false;
    }

    const contentLines = content.split('\n');
    const sectionContentLines = contentLines.slice(range.start, range.end + 1);
    const sectionContent = sectionContentLines.join('\n');

    return regex.test(sectionContent);
  }
}