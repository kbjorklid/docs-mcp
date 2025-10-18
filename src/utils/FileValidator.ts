/**
 * Utility functions for file validation across tools.
 * Provides consistent file validation and error handling.
 */

import { MarkdownParser } from '../MarkdownParser';
import { FileDiscoveryService } from '../services';
import { ERROR_MESSAGES } from '../constants';

/**
 * Result of file validation and resolution
 */
export interface FileValidationResult {
  valid: boolean;
  fullPath?: string;
  errorMessage?: string;
}

/**
 * Validate and resolve a file path, handling all common error cases
 * @param filename - The filename to validate
 * @param fileDiscovery - The file discovery service
 * @returns Validation result with resolved path or error message
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
      errorMessage: ERROR_MESSAGES.FILE_NOT_FOUND(filename),
    };
  }

  // Check if file exists and is accessible
  const validation = MarkdownParser.validateFile(fullPath);

  if (!validation.valid) {
    if (validation.error === 'File not found') {
      return {
        valid: false,
        errorMessage: ERROR_MESSAGES.FILE_NOT_FOUND(filename),
      };
    }

    return {
      valid: false,
      errorMessage: ERROR_MESSAGES.FILE_SYSTEM_ERROR,
    };
  }

  return {
    valid: true,
    fullPath,
  };
}
