/**
 * Line ending normalization utilities
 * Handles cross-platform line ending differences
 */

/**
 * Normalize line endings to Unix style (\n)
 * Handles Windows (\r\n), old Mac (\r), and Unix (\n) line endings
 * @param content - Text content that may have mixed line endings
 * @returns Content with all line endings normalized to \n
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
