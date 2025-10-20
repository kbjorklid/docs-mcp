/**
 * Utility for comparing filenames and titles to detect redundancy
 */

/**
 * Normalizes a string for comparison:
 * - Convert to lowercase
 * - Replace hyphens and underscores with spaces
 * - Trim and normalize spaces
 * @param str The string to normalize
 * @returns Normalized string
 */
function normalizeStringForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a title is redundant compared to a filename
 * A title is considered redundant if the normalized title is a substring of the normalized filename
 *
 * @param filename The filename to compare against
 * @param title The title to check
 * @returns true if the title is redundant, false otherwise
 *
 * @example
 * isTitleRedundant('api-reference.md', 'API Reference') // true
 * isTitleRedundant('REST_CONVENTIONS.md', 'Rest conventions') // true
 * isTitleRedundant('guide.md', 'Complete Installation Guide') // false
 */
export function isTitleRedundant(filename: string, title: string): boolean {
  const normalizedFilename = normalizeStringForComparison(filename);
  const normalizedTitle = normalizeStringForComparison(title);

  return normalizedFilename.includes(normalizedTitle);
}
