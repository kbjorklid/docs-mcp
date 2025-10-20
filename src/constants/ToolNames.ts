/**
 * Tool name enum for type-safe tool references
 * Provides compile-time guarantees that tool names are valid
 */
export enum ToolName {
  LIST_DOCUMENTATION_FILES = 'list_documentation_files',
  TABLE_OF_CONTENTS = 'table_of_contents',
  READ_SECTIONS = 'read_sections',
  SECTION_TABLE_OF_CONTENTS = 'section_table_of_contents',
  SEARCH = 'search',
}

/**
 * Type guard to check if a string is a valid ToolName
 */
export function isToolName(value: string): value is ToolName {
  return Object.values(ToolName).includes(value as ToolName);
}
