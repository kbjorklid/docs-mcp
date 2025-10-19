/**
 * Type guard utilities for parameter validation
 */

/**
 * Checks if a value is a non-empty string
 * @param value - Value to check
 * @returns boolean indicating if value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Checks if a value is a positive number
 * @param value - Value to check
 * @returns boolean indicating if value is a positive number
 */
export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && value > 0;

/**
 * Checks if a value is an array of strings
 * @param value - Value to check
 * @returns boolean indicating if value is an array of strings
 */
export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

/**
 * Checks if a value is an Error instance
 * @param error - Value to check
 * @returns boolean indicating if value is an Error instance
 */
export const isError = (error: unknown): error is Error =>
  error instanceof Error;

/**
 * Validate file ID format (f followed by number)
 * @param fileId - The file ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidFileId(fileId: unknown): fileId is string {
  if (!isNonEmptyString(fileId)) {
    return false;
  }
  return /^f[0-9]+$/.test(fileId);
}
