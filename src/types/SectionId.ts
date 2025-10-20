/**
 * Branded type for Section IDs
 *
 * SectionId is a string that follows the numeric format "1/2/3" where each number
 * represents the position of a header at each level in the document hierarchy.
 * Using a branded type prevents mixing section IDs with arbitrary strings at compile-time.
 *
 * @example
 * const sectionId = createSectionId([1, 2, 3]); // SectionId: "1/2/3"
 * const parts = getSectionParts(sectionId); // [1, 2, 3]
 * const level = getSectionLevel(sectionId); // 3
 */
export type SectionId = string & { readonly __brand: 'SectionId' };

/**
 * Create a SectionId from numeric parts
 *
 * @param parts - Array of positive integers representing the section hierarchy
 * @returns SectionId in format "1/2/3"
 * @throws Error if parts array is empty or contains invalid values
 *
 * @example
 * createSectionId([1]) // Returns "1" as SectionId
 * createSectionId([1, 2, 3]) // Returns "1/2/3" as SectionId
 */
export function createSectionId(parts: number[]): SectionId {
  if (parts.length === 0) {
    throw new Error('SectionId parts array cannot be empty');
  }

  for (let i = 0; i < parts.length; i++) {
    if (!Number.isInteger(parts[i]) || parts[i] < 0) {
      throw new Error(`SectionId parts must be non-negative integers, got: ${parts[i]} at index ${i}`);
    }
  }

  return parts.join('/') as SectionId;
}

/**
 * Parse and validate a value as a SectionId
 *
 * @param value - The value to parse
 * @returns SectionId if valid, null if invalid
 *
 * @example
 * parseSectionId("1") // Returns "1" as SectionId
 * parseSectionId("1/2/3") // Returns "1/2/3" as SectionId
 * parseSectionId("invalid") // Returns null
 * parseSectionId(123) // Returns null
 */
export function parseSectionId(value: unknown): SectionId | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!isValidSectionId(value)) {
    return null;
  }

  return value as SectionId;
}

/**
 * Type guard to check if a value is a valid SectionId
 *
 * @param value - The value to check
 * @returns true if value is a valid SectionId format
 *
 * @example
 * isValidSectionId("1") // true
 * isValidSectionId("1/2/3") // true
 * isValidSectionId("invalid") // false
 * isValidSectionId("1/0") // false (must be positive)
 * isValidSectionId("1/2/") // false (trailing slash)
 */
export function isValidSectionId(value: unknown): value is SectionId {
  if (typeof value !== 'string') {
    return false;
  }

  // Must not be empty
  if (value.length === 0) {
    return false;
  }

  // Match pattern: one or more digits, optionally followed by "/" and more digits
  const match = value.match(/^(\d+)(\/\d+)*$/);
  if (!match) {
    return false;
  }

  // Ensure all numbers are non-negative (allow 0 for edge cases)
  const parts = value.split('/');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0;
  });
}

/**
 * Get the numeric parts from a SectionId
 *
 * @param sectionId - The SectionId to extract from
 * @returns Array of positive integers representing the section hierarchy
 * @throws Error if sectionId is invalid
 *
 * @example
 * getSectionParts(createSectionId([1, 2, 3])) // Returns [1, 2, 3]
 * getSectionParts(createSectionId([5])) // Returns [5]
 */
export function getSectionParts(sectionId: SectionId): number[] {
  const parts = sectionId.split('/').map(part => parseInt(part, 10));

  // Validate that all parts are valid non-negative integers
  if (parts.some(part => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid SectionId format: ${sectionId}`);
  }

  return parts;
}

/**
 * Get the nesting level of a section (number of parts in the ID)
 *
 * @param sectionId - The SectionId to check
 * @returns The nesting level (1 for "1", 2 for "1/2", 3 for "1/2/3", etc.)
 *
 * @example
 * getSectionLevel(createSectionId([1])) // Returns 1
 * getSectionLevel(createSectionId([1, 2])) // Returns 2
 * getSectionLevel(createSectionId([1, 2, 3])) // Returns 3
 */
export function getSectionLevel(sectionId: SectionId): number {
  return sectionId.split('/').length;
}

/**
 * Get the parent SectionId (removes the last part)
 *
 * @param sectionId - The SectionId to get parent of
 * @returns Parent SectionId, or null if this is a root-level section
 *
 * @example
 * getParentSectionId(createSectionId([1, 2, 3])) // Returns "1/2" as SectionId
 * getParentSectionId(createSectionId([1])) // Returns null (root level)
 */
export function getParentSectionId(sectionId: SectionId): SectionId | null {
  const parts = getSectionParts(sectionId);

  if (parts.length <= 1) {
    return null; // Root level section has no parent
  }

  return createSectionId(parts.slice(0, -1));
}

/**
 * Check if one section is a child of another
 *
 * @param child - Potential child SectionId
 * @param parent - Potential parent SectionId
 * @returns true if child is a direct or indirect descendant of parent
 *
 * @example
 * isChildOf(createSectionId([1, 2, 3]), createSectionId([1])) // true
 * isChildOf(createSectionId([1, 2]), createSectionId([1])) // true
 * isChildOf(createSectionId([2, 1]), createSectionId([1])) // false
 */
export function isChildOf(child: SectionId, parent: SectionId): boolean {
  // Child must start with parent's ID followed by a "/"
  return child.startsWith(parent + '/');
}

/**
 * Check if one section is a direct child of another (one level deeper)
 *
 * @param child - Potential child SectionId
 * @param parent - Potential parent SectionId
 * @returns true if child is exactly one level deeper than parent
 *
 * @example
 * isDirectChild(createSectionId([1, 2]), createSectionId([1])) // true
 * isDirectChild(createSectionId([1, 2, 3]), createSectionId([1])) // false (indirect)
 * isDirectChild(createSectionId([2, 1]), createSectionId([1])) // false (different branch)
 */
export function isDirectChild(child: SectionId, parent: SectionId): boolean {
  const childParts = getSectionParts(child);
  const parentParts = getSectionParts(parent);

  // Must be exactly one level deeper
  if (childParts.length !== parentParts.length + 1) {
    return false;
  }

  // All parent parts must match
  return parentParts.every((part, index) => childParts[index] === part);
}

/**
 * Compare two SectionIds for sorting
 * Compares level by level numerically
 *
 * @param a - First SectionId
 * @param b - Second SectionId
 * @returns Negative if a < b, 0 if equal, positive if a > b
 *
 * @example
 * const ids = [createSectionId([1, 10]), createSectionId([1, 2]), createSectionId([2, 1])];
 * ids.sort(compareSectionIds); // [1/2, 1/10, 2/1]
 */
export function compareSectionIds(a: SectionId, b: SectionId): number {
  const aParts = getSectionParts(a);
  const bParts = getSectionParts(b);

  const minLength = Math.min(aParts.length, bParts.length);

  // Compare level by level
  for (let i = 0; i < minLength; i++) {
    if (aParts[i] !== bParts[i]) {
      return aParts[i] - bParts[i];
    }
  }

  // If all compared parts are equal, shorter ID comes first
  return aParts.length - bParts.length;
}
