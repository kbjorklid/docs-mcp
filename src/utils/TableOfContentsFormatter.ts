import { TableOfContentsResponse, Section } from '../types';

/**
 * Formats a table of contents response as XML-like text with instructions
 * Format: section IDs followed by titles, with hidden subsection counts
 * Example output:
 * <TableOfContents>
 * 1 REST API
 * 1.1 Sorting
 * 1.1.1 Multi-field sorting {hiddenSubsections: 2}
 * </TableOfContents>
 * <Instructions>
 * The number before each section title is the section ID...
 * </Instructions>
 */
export function formatTableOfContentsAsXml(response: TableOfContentsResponse): string {
  // Format the table of contents
  const tocLines = response.sections.map(section => formatSectionLine(section));
  const tocContent = tocLines.join('\n');

  // Build instructions
  const instructions = buildInstructions(response.sections);

  // Combine into XML-like format
  const result = `<TableOfContents>
${tocContent}
</TableOfContents>
<Instructions>
${instructions}
</Instructions>`;

  return result;
}

/**
 * Format a single section line as "id title {hiddenSubsections: n}"
 */
function formatSectionLine(section: Section): string {
  let line = `${section.id} ${section.title}`;

  // Add hidden subsections count if present and > 0
  if (section.subsection_count !== undefined && section.subsection_count > 0) {
    line += ` {hiddenSubsections: ${section.subsection_count}}`;
  }

  return line;
}

/**
 * Build the instructions section
 */
function buildInstructions(sections: Section[]): string {
  const hasHiddenSubsections = sections.some(
    s => s.subsection_count !== undefined && s.subsection_count > 0
  );

  let instructions =
    'The number before each section title is the section ID (e.g., "1.1.1"). Use these section IDs with the read_sections tool to read specific sections.';

  if (hasHiddenSubsections) {
    instructions +=
      '\n\nTo explore deeper subsections under a specific subsection that are not currently shown (indicated by "{hiddenSubsections: N}"), use the section_table_of_contents tool with the section IDs of interest.';
  }

  return instructions;
}
