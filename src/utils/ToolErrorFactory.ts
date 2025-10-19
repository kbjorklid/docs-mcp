/**
 * Factory functions for creating tool-specific errors
 * Ensures consistent error message formatting across all tools
 */

/**
 * Create a FILE_NOT_FOUND error with consistent formatting
 * @param filename - The file that was not found
 * @param errorMsg - Detailed error message
 * @returns Error with standardized format: "FILE_NOT_FOUND: filename|errorMsg"
 */
export function createFileNotFoundError(filename: string, errorMsg: string): Error {
  return new Error(`FILE_NOT_FOUND: ${filename}|${errorMsg}`);
}

/**
 * Create a SECTION_NOT_FOUND error with consistent formatting
 * @param filename - The file being searched
 * @param missingIds - Array of missing section IDs
 * @returns Error with standardized format: "SECTION_NOT_FOUND: filename: ["id1", "id2"]"
 */
export function createSectionNotFoundError(filename: string, missingIds: string[]): Error {
  return new Error(`SECTION_NOT_FOUND: ${filename}: ${JSON.stringify(missingIds)}`);
}
