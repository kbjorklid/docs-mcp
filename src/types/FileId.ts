/**
 * Branded type for File IDs
 *
 * FileId is a string that follows the format "f{number}" (e.g., "f1", "f2", "f100")
 * Using a branded type prevents mixing file IDs with arbitrary strings at compile-time.
 *
 * @example
 * const fileId = createFileId(1); // FileId: "f1"
 * const number = getFileIdNumber(fileId); // 1
 */
export type FileId = string & { readonly __brand: 'FileId' };

/**
 * Create a FileId from a numeric index
 *
 * @param index - The numeric index (must be positive)
 * @returns FileId in format "f{index}"
 * @throws Error if index is not a positive integer
 *
 * @example
 * createFileId(1) // Returns "f1" as FileId
 * createFileId(42) // Returns "f42" as FileId
 */
export function createFileId(index: number): FileId {
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`FileId index must be a positive integer, got: ${index}`);
  }
  return `f${index}` as FileId;
}

/**
 * Parse and validate a value as a FileId
 *
 * @param value - The value to parse
 * @returns FileId if valid, null if invalid
 *
 * @example
 * parseFileId("f1") // Returns "f1" as FileId
 * parseFileId("invalid") // Returns null
 * parseFileId(123) // Returns null
 */
export function parseFileId(value: unknown): FileId | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!isValidFileId(value)) {
    return null;
  }

  return value as FileId;
}

/**
 * Type guard to check if a value is a valid FileId
 *
 * @param value - The value to check
 * @returns true if value is a valid FileId format
 *
 * @example
 * isValidFileId("f1") // true
 * isValidFileId("f42") // true
 * isValidFileId("invalid") // false
 * isValidFileId("f") // false
 * isValidFileId("f0") // false (must be positive)
 */
export function isValidFileId(value: unknown): value is FileId {
  if (typeof value !== 'string') {
    return false;
  }

  // Match pattern: f followed by one or more digits
  const match = value.match(/^f(\d+)$/);
  if (!match) {
    return false;
  }

  // Ensure the number is positive (not 0)
  const number = parseInt(match[1], 10);
  return number > 0;
}

/**
 * Extract the numeric part from a FileId
 *
 * @param fileId - The FileId to extract from
 * @returns The numeric index
 * @throws Error if fileId is invalid
 *
 * @example
 * getFileIdNumber(createFileId(42)) // Returns 42
 */
export function getFileIdNumber(fileId: FileId): number {
  const match = fileId.match(/^f(\d+)$/);
  if (!match) {
    throw new Error(`Invalid FileId format: ${fileId}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Compare two FileIds numerically
 * Useful for sorting file IDs in the correct order
 *
 * @param a - First FileId
 * @param b - Second FileId
 * @returns Negative if a < b, 0 if equal, positive if a > b
 *
 * @example
 * const ids = [createFileId(10), createFileId(2), createFileId(5)];
 * ids.sort(compareFileIds); // [f2, f5, f10]
 */
export function compareFileIds(a: FileId, b: FileId): number {
  return getFileIdNumber(a) - getFileIdNumber(b);
}
