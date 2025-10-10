import { glob } from "glob";
import * as path from "path";
import { FileInfo, DocumentationConfig, ErrorResponse } from "../types";
import { MarkdownParser } from "../MarkdownParser";

export class ListDocumentationFiles {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
  }

  /**
   * Execute the list_documentation_files tool
   */
  async execute() {
    try {
      const files = await this.getDocumentationFiles();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "FILE_SYSTEM_ERROR",
          message: "Error accessing documentation files",
          details: error,
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
   * Get all documentation files with metadata
   */
  private async getDocumentationFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // Find all markdown files
    for (const pattern of this.config.include_patterns) {
      const filePaths = await glob(pattern, {
        cwd: this.config.documentation_path,
        ignore: this.config.exclude_patterns,
        absolute: false,
      });

      for (const filePath of filePaths) {
        const fileInfo = await this.processFile(filePath);
        if (fileInfo) {
          files.push(fileInfo);
        }
      }
    }

    return files;
  }

  /**
   * Process a single file and extract metadata
   */
  private async processFile(filePath: string): Promise<FileInfo | null> {
    const fullPath = path.resolve(this.config.documentation_path, filePath);

    try {
      const validation = MarkdownParser.validateFile(fullPath, this.config.max_file_size);
      if (!validation.valid || !validation.stats) {
        return null;
      }

      const { metadata } = MarkdownParser.readMarkdownFile(fullPath);

      const fileInfo: FileInfo = {
        filename: filePath.replace(/\\/g, '/'), // Normalize path separators
        title: metadata.title || path.basename(filePath, '.md'),
        description: metadata.description,
        keywords: metadata.keywords || [],
        size: MarkdownParser.formatFileSize(validation.stats.size),
      };

      return fileInfo;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  }
}