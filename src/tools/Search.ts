import * as path from 'path';
import { Section, DocumentationConfig, ErrorResponse } from '../types';
import { MarkdownParser } from '../MarkdownParser';
import { ListDocumentationFiles } from './ListDocumentationFiles';

export class Search {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
  }

  /**
   * Get the tool definition for MCP
   */
  static getToolDefinition() {
    return {
      name: 'search',
      description:
        'Search for exact text matches in documentation files. Returns headers and section IDs where the search phrase is found in either the header text or section content. This tool performs simple exact phrase searches only (not fuzzy matching).',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The exact phrase to search for (case-insensitive). Use simple text phrases only, not regular expressions or fuzzy search patterns.',
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

    try {
      const searchResults = await this.performSearchAcrossFiles(query.trim(), filename);
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

      if (error.message.startsWith('FILE_TOO_LARGE:')) {
        return this.createErrorResponse(
          'FILE_TOO_LARGE',
          `File '${filename}' exceeds size limit`,
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
  private async performSearchAcrossFiles(query: string, filename?: string) {
    return filename
      ? await this.searchInSpecificFile(query, filename)
      : await this.searchAcrossAllFiles(query);
  }

  /**
   * Search in a specific file
   */
  private async searchInSpecificFile(query: string, filename: string) {
    const matches = this.findMatchesInFile(query, filename);
    return {
      query,
      results: [{ filename, matches }],
    };
  }

  /**
   * Search across all documentation files concurrently
   */
  private async searchAcrossAllFiles(query: string) {
    const listDocumentationFiles = new ListDocumentationFiles(this.config);
    const filesResult = await listDocumentationFiles.execute();
    const filesData = JSON.parse(filesResult.content[0].text as string);

    const searchPromises = filesData.files.map(async (file: { path: string }) => {
      try {
        const matches = this.findMatchesInFile(query, file.path);
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

    return { query, results };
  }

  /**
   * Find matching sections in a file
   */
  private findMatchesInFile(query: string, filename: string): Section[] {
    const fullPath = path.resolve(this.config.documentation_path, filename);

    this.validateFile(fullPath, filename);

    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections, sectionMap } = MarkdownParser.parseMarkdownSections(content);
    const normalizedQuery = query.toLowerCase();

    return sections.filter(section =>
      this.doesSectionContainQuery(section, content, sectionMap, normalizedQuery)
    );
  }

  /**
   * Validate file exists and is within size limits
   */
  private validateFile(fullPath: string, filename: string) {
    const validation = MarkdownParser.validateFile(fullPath, this.config.max_file_size);

    if (!validation.valid) {
      switch (validation.error) {
        case 'File not found':
          throw new Error(
            `FILE_NOT_FOUND: File '${filename}' not found. Use the list_documentation_files tool to see available files.`
          );
        case 'File too large':
          throw new Error(`FILE_TOO_LARGE: ${filename}`);
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
    normalizedQuery: string
  ): boolean {
    return this.doesHeaderMatch(section, normalizedQuery) ||
           this.doesContentMatch(section, content, sectionMap, normalizedQuery);
  }

  /**
   * Check if section header matches the search query
   */
  private doesHeaderMatch(section: Section, normalizedQuery: string): boolean {
    return section.title.toLowerCase().includes(normalizedQuery);
  }

  /**
   * Check if section content matches the search query
   */
  private doesContentMatch(
    section: Section,
    content: string,
    sectionMap: Map<string, { start: number; end: number }>,
    normalizedQuery: string
  ): boolean {
    const range = sectionMap.get(section.id);
    if (!range) return false;

    const contentLines = content.split('\n');
    const sectionContentLines = contentLines.slice(range.start, range.end + 1);
    const normalizedSectionContent = sectionContentLines.join('\n').toLowerCase();

    return normalizedSectionContent.includes(normalizedQuery);
  }
}