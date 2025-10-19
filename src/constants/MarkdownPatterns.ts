/**
 * Regular expression patterns for markdown parsing
 * Centralized patterns to ensure consistency and improve maintainability
 */

/**
 * Pattern to match markdown headers
 * Matches ATX-style headers: #, ##, ###, etc. up to ######
 * Captures the header level (hashes) and the title text
 * Example: "## My Section" matches with level="##" and title="My Section"
 */
export const HEADER_PATTERN = /^(#{1,6})\s+(.+)$/;

/**
 * Pattern to match YAML front matter blocks
 * Matches content between --- delimiters at the start of the file
 * Captures the YAML content and the remaining markdown content
 * Example: ---\ntitle: "Doc"\n---\nContent here
 */
export const FRONT_MATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * Pattern to extract title from section content
 * Similar to HEADER_PATTERN but uses multiline flag for content already split
 * Used when searching within existing section content
 */
export const SECTION_TITLE_PATTERN = /^#{1,6}\s+(.+)$/m;

/**
 * Pattern to remove special characters from section IDs
 * Removes all non-word characters except spaces and hyphens
 * Used when generating slug-like IDs from headers
 */
export const SPECIAL_CHAR_PATTERN = /[^\w\s-]/g;

/**
 * Pattern to normalize whitespace for section IDs
 * Replaces multiple spaces with a single hyphen
 */
export const WHITESPACE_PATTERN = /\s+/g;

/**
 * Pattern to normalize consecutive hyphens
 * Replaces multiple hyphens with a single hyphen
 */
export const HYPHEN_PATTERN = /-+/g;

/**
 * Pattern to trim hyphens from start and end of strings
 * Used after ID normalization to remove leading/trailing hyphens
 */
export const TRIM_HYPHEN_PATTERN = /^-|-$/g;

/**
 * Pattern to normalize path separators across platforms
 * Replaces backslashes (Windows) with forward slashes (Unix-style)
 * Used when normalizing file paths for consistent cross-platform handling
 */
export const PATH_SEPARATOR_PATTERN = /\\/g;
