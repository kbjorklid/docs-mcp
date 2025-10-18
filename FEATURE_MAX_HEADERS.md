# Feature: Max Headers Limit for Table of Contents

## Overview
Add configurable maximum header limit to the `table_of_contents` tool. When the total number of headers exceeds the configured maximum, only the shallowest header levels are returned.

## Configuration
- **Option**: `max_headers`
- **Type**: `number`
- **Default**: `25`
- **Scope**: Global configuration, applies to all `table_of_contents` calls

## Behavior
1. Parse all headers from the markdown file
2. **ALWAYS include all level-1 headers (`#`), regardless of limit**
3. For deeper levels, count total headers and stop including new levels when total would exceed `max_headers`
4. Return included headers in their original structure

## Example
Given a document with:
- 3 level-1 headers (`#`)
- 20 level-2 headers (`##`)
- 5 level-3 headers (`###`)
- **Total: 28 headers**

With `max_headers: 25`:
- Include all 3 level-1 headers (always included, total: 3)
- Include all 20 level-2 headers (total: 23)
- Exclude level-3 headers (would exceed limit: 28 > 25)
- **Result: 23 headers returned**

## Edge Case: Many Level-1 Headers
If a document has 26 or more level-1 headers:
- Include all level-1 headers (always included, even though it exceeds max_headers: 25)
- Exclude all deeper levels
- **Result: 26 or more headers returned** (exceeds limit to ensure top-level structure is visible)

## Implementation Details
- Add `max_headers` property to `DocumentationConfig` in `types.ts`
- Update CLI argument parsing to accept `--max-headers` flag
- Update environment variable support for `MAX_HEADERS`
- Modify `TableOfContents.ts` to apply the limit when building the table of contents
- Update e2e tests to verify limiting behavior and edge cases
