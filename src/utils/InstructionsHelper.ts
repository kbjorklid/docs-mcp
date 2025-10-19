import { Section } from '../types';

/**
 * Constant for instructions to use section_table_of_contents tool
 */
export const INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS =
  'To explore deeper subsections under a specific subsection that are not currently shown (the "subsection_count" is > 0), use the section_table_of_contents tool with the section IDs of interest.';

/**
 * Check if any section in the array has hidden subsections
 * (subsection_count >= 1 means not all children are visible)
 *
 * @param sections - Array of sections to check
 * @returns true if any section has hidden subsections
 */
export function hasHiddenSubsections(sections: Section[]): boolean {
  return sections.some(section => section.subsection_count !== undefined && section.subsection_count >= 1);
}
