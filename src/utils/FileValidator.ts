/**
 * Utility functions for file validation across tools.
 * Provides consistent file validation and error handling.
 */

import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';

/**
 * Result of file validation and resolution
 */
export interface FileValidationResult {
  valid: boolean;
  fullPath?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validate and resolve a file path, handling all common error cases
 * @param filename - The filename to validate
 * @param fileDiscovery - The file discovery service
 * @returns Validation result with resolved path or error details
 */
export async function validateAndResolveFile(
  filename: string,
  fileDiscovery: FileDiscoveryService
): Promise<FileValidationResult> {
  // Resolve the filename to its full path
  const fullPath = await fileDiscovery.resolveFilePath(filename);

  if (!fullPath) {
    return {
      valid: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: `File '${filename}' not found in any documentation directory. Use the list_documentation_files tool to see available files.`,
      },
    };
  }

  // Check if file exists and is accessible
  const validation = MarkdownParser.validateFile(fullPath);

  if (!validation.valid) {
    if (validation.error === 'File not found') {
      return {
        valid: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File '${filename}' not found in any documentation directory. Use the list_documentation_files tool to see available files.`,
        },
      };
    }

    return {
      valid: false,
      error: {
        code: 'FILE_SYSTEM_ERROR',
        message: validation.error || 'Error accessing file',
      },
    };
  }

  return {
    valid: true,
    fullPath,
  };
}
