import * as path from 'path';
import { Section, Configuration, ErrorResponse } from '../types';
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
        'Search for text matches using regular expressions in documentation files. Returns headers and section IDs where the search pattern is found in either the header text or section content. Supports full regular expression syntax with multiline matching (the "s" flag is enabled automatically for dotAll behavior).',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The regular expression pattern to search for (case-insensitive). The pattern automatically includes the "i" and "s" flags for case-insensitive and multiline matching. Examples: "foo.*bar" matches across line breaks, "\\b[A-Z][a-z]+\\b" matches capitalized words, "https?://[^\\s]+" matches URLs.',
          },
          filename: {
            type: 'string',
            description: 'Optional specific file to search in. If not provided, searches all available documentation files. Use the list_documentation_files tool to see available files.',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * Execute the search tool
   */
  async execute(query: string, filename?: string) {
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
        `Invalid regular expression: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your regex syntax.`
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
   * Handle search errors with appropriate error codes
   */
  private handleSearchError(error: unknown, filename?: string) {
    if (error instanceof Error) {
      if (error.message.startsWith('FILE_NOT_FOUND:')) {
        return this.createErrorResponse(
          'FILE_NOT_FOUND',
          error.message.replace('FILE_NOT_FOUND: ', ''),
          { filename }
        );
      }
    }

    return this.createErrorResponse(
      'PARSE_ERROR',
      'Error searching documentation files',
      { filename, error }
    );
  }

  /**
   * Perform search across files with improved performance
   */
  private async performSearchAcrossFiles(regex: RegExp, filename?: string) {
    return filename
      ? await this.searchInSpecificFile(regex, filename)
      : await this.searchAcrossAllFiles(regex);
  }

  /**
   * Search in a specific file
   */
  private async searchInSpecificFile(regex: RegExp, filename: string) {
    const matches = this.findMatchesInFile(regex, filename);
    return {
      query: regex.source,
      results: [{ filename, matches }],
    };
  }

  /**
   * Search across all documentation files concurrently
   */
  private async searchAcrossAllFiles(regex: RegExp) {
    const listDocumentationFiles = new ListDocumentationFiles(this.config);
    const filesResult = await listDocumentationFiles.execute();
    const filesData = JSON.parse(filesResult.content[0].text as string);

    const searchPromises = filesData.files.map(async (file: { path: string }) => {
      try {
        const matches = this.findMatchesInFile(regex, file.path);
        return matches.length > 0 ? { filename: file.path, matches } : null;
      } catch (error) {
        console.warn(`Warning: Could not search in file ${file.path}:`, error);
        return null;
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    const results = settledResults
      .filter((result): result is PromiseFulfilledResult<{ filename: string; matches: Section[] }> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    return { query: regex.source, results };
  }

  /**
   * Find matching sections in a file
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
   * Validate file exists
   */
  private validateFile(fullPath: string, filename: string) {
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
   * Check if a section contains the search query
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
   */
  private doesHeaderMatch(section: Section, regex: RegExp): boolean {
    return regex.test(section.title);
  }

  /**
   * Check if section content matches the search query
   */
  private doesContentMatch(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    regex: RegExp
  ): boolean {
    const range = sectionMap.get(section.id);
    if (!range) return false;

    const contentLines = content.split('\n');
    const sectionContentLines = contentLines.slice(range.start, range.end + 1);
    const sectionContent = sectionContentLines.join('\n');

    return regex.test(sectionContent);
  }
}