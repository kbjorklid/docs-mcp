import * as path from "path";
import { Section, DocumentationConfig, ErrorResponse } from "../types.js";
import { MarkdownParser } from "../MarkdownParser.js";

export class TableOfContents {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
  }

  /**
   * Execute the table_of_contents tool
   */
  execute(filename: string) {
    // Validate filename parameter
    if (!filename) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "INVALID_PARAMETER",
          message: "filename parameter is required",
        },
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }

    try {
      const sections = this.getTableOfContents(filename);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sections, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "PARSE_ERROR",
          message: "Error parsing markdown file",
          details: {
            filename,
            error,
          },
        },
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Get table of contents for a markdown file
   */
  private getTableOfContents(filename: string): Section[] {
    const fullPath = path.resolve(this.config.documentation_path, filename);

    // Check if file exists
    const validation = MarkdownParser.validateFile(fullPath, this.config.max_file_size);
    if (!validation.valid) {
      if (validation.error === "File not found") {
        throw new Error(`FILE_NOT_FOUND: ${filename}`);
      } else if (validation.error === "File too large") {
        throw new Error(`FILE_TOO_LARGE: ${filename}`);
      } else {
        throw new Error(validation.error);
      }
    }

    // Read and parse the file
    const { content } = MarkdownParser.readMarkdownFile(fullPath);
    const { sections } = MarkdownParser.parseMarkdownSections(content);

    return sections;
  }
}