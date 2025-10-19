/**
 * Error parsing utilities for tool error handling
 * Provides a centralized way to parse and extract information from tool errors
 */

import { isError } from './TypeGuards';
import { ERROR_MESSAGES } from '../constants';

export interface FileNotFoundError {
  type: 'FILE_NOT_FOUND';
  filename: string;
  details: string;
}

export interface SectionNotFoundError {
  type: 'SECTION_NOT_FOUND';
  filename: string;
  missingIds: string[];
}

export interface ParseError {
  type: 'PARSE_ERROR';
}

export type ParsedError = FileNotFoundError | SectionNotFoundError | ParseError;

/**
 * Parse tool errors that follow the standard error format
 * Handles three error types:
 * - FILE_NOT_FOUND: filename|error message
 * - SECTION_NOT_FOUND: filename: ["id1", "id2"]
 * - Other errors: treated as PARSE_ERROR
 *
 * @param error - The error object to parse
 * @returns ParsedError - Structured error information or PARSE_ERROR if unparseable
 */
export function parseToolError(error: unknown): ParsedError {
  // Only process Error instances
  if (!isError(error)) {
    return { type: 'PARSE_ERROR' };
  }

  // Handle FILE_NOT_FOUND errors
  // Format: FILE_NOT_FOUND: filename|error message
  if (error.message.startsWith('FILE_NOT_FOUND:')) {
    const parts = error.message.split('|');
    const filenameWithPrefix = parts[0]; // "FILE_NOT_FOUND: filename"
    const filename = filenameWithPrefix.replace('FILE_NOT_FOUND: ', '').trim();
    const details = parts[1] || ERROR_MESSAGES.PARSE_ERROR;

    return {
      type: 'FILE_NOT_FOUND',
      filename,
      details,
    };
  }

  // Handle SECTION_NOT_FOUND errors
  // Format: SECTION_NOT_FOUND: filename: ["id1", "id2"]
  if (error.message.startsWith('SECTION_NOT_FOUND:')) {
    const parts = error.message.split(': ');
    const filename = parts[1]?.trim() || '';

    try {
      const missingIds = JSON.parse(parts[2] || '[]');
      return {
        type: 'SECTION_NOT_FOUND',
        filename,
        missingIds,
      };
    } catch {
      // If parsing fails, treat as generic parse error
      return { type: 'PARSE_ERROR' };
    }
  }

  // All other errors default to PARSE_ERROR
  return { type: 'PARSE_ERROR' };
}

/**
 * Get appropriate error message based on parsed error
 * @param parsed - The parsed error information
 * @returns Error message string suitable for user display
 */
export function getErrorMessage(parsed: ParsedError): string {
  switch (parsed.type) {
    case 'FILE_NOT_FOUND':
      return parsed.details;
    case 'SECTION_NOT_FOUND':
      return ERROR_MESSAGES.SECTION_NOT_FOUND(parsed.missingIds, parsed.filename);
    case 'PARSE_ERROR':
      return ERROR_MESSAGES.PARSE_ERROR;
    default:
      return ERROR_MESSAGES.PARSE_ERROR;
  }
}
