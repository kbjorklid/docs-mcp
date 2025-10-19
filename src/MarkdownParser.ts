import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FileMetadata, Section, SectionContent } from './types';
import { normalizeLineEndings } from './utils/LineNormalizer';
import {
  HEADER_PATTERN,
  FRONT_MATTER_PATTERN,
  SECTION_TITLE_PATTERN,
  SPECIAL_CHAR_PATTERN,
  WHITESPACE_PATTERN,
  HYPHEN_PATTERN,
  TRIM_HYPHEN_PATTERN,
} from './constants/MarkdownPatterns';

export class MarkdownParser {
  /**
   * Parse YAML front matter from markdown content
   */
  static parseFrontMatter(content: string): {
    metadata: FileMetadata;
    content: string;
  } {
    const match = content.match(FRONT_MATTER_PATTERN);

    if (!match) {
      return { metadata: {}, content };
    }

    try {
      const metadata = yaml.load(match[1]) as FileMetadata;
      return { metadata, content: match[2] };
    } catch (error) {
      console.error('Error parsing YAML front matter:', error);
      return { metadata: {}, content };
    }
  }

  /**
   * Generate section ID from header text
   */
  static generateSectionId(title: string): string {
    return title
      .toLowerCase()
      .replace(SPECIAL_CHAR_PATTERN, '')
      .replace(WHITESPACE_PATTERN, '-')
      .replace(HYPHEN_PATTERN, '-')
      .replace(TRIM_HYPHEN_PATTERN, '');
  }

  /**
   * Parse markdown sections and generate table of contents
   * Uses numeric IDs in format "1/2/3" where numbers represent header positions at each level
   */
  static parseMarkdownSections(content: string): {
    sections: Section[];
    sectionMap: Map<string, { start: number; end: number }>;
  } {
    const normalizedContent = normalizeLineEndings(content);
    const lines = normalizedContent.split('\n');
    const sections: Section[] = [];
    const sectionMap = new Map<string, { start: number; end: number }>();

    const sectionStack: {
      id: string;
      title: string;
      level: number;
      startLine: number;
    }[] = [];

    // Track position counters for each header level (1-6)
    const headerLevelCounters: number[] = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(HEADER_PATTERN);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        // Increment counter for current level
        headerLevelCounters[level - 1]++;

        // Reset all deeper level counters
        for (let j = level; j < 6; j++) {
          headerLevelCounters[j] = 0;
        }

        // Build numeric ID from active counters
        const id = headerLevelCounters.slice(0, level).join('/');

        // Close all sections at the same or higher level (when a new header of same/higher level is encountered)
        // A section should only close when we encounter a header of the same or higher level (shallower nesting)
        while (
          sectionStack.length > 0 &&
          sectionStack[sectionStack.length - 1].level >= level
        ) {
          const closedSection = sectionStack.pop();
          if (closedSection) {
            sectionMap.set(closedSection.id, {
              start: closedSection.startLine,
              end: i - 1,
            });
          }
        }

        sectionStack.push({ id, title, level, startLine: i });

        sections.push({
          id,
          title,
          level,
          character_count: 0, // Will be calculated later
        });
      }
    }

    // Close all remaining sections at end of file
    while (sectionStack.length > 0) {
      const closedSection = sectionStack.pop();
      if (closedSection) {
        sectionMap.set(closedSection.id, {
          start: closedSection.startLine,
          end: lines.length - 1,
        });
      }
    }

    // Calculate character counts
    sections.forEach((section) => {
      const range = sectionMap.get(section.id);
      if (range) {
        const sectionLines = lines.slice(range.start, range.end + 1);
        section.character_count = sectionLines.join('\n').length;
      }
    });

    return { sections, sectionMap };
  }

  /**
   * Read specific sections from markdown content
   */
  static readSectionsFromContent(
    content: string,
    sectionIds: string[],
    sectionMap: Map<string, { start: number; end: number }>
  ): SectionContent[] {
    const lines = content.split('\n');
    const results: SectionContent[] = [];

    // Filter out subsections that are already included in requested parent sections
    const filteredSectionIds = this.filterSubsections(sectionIds, sectionMap);

    for (const sectionId of filteredSectionIds) {
      const range = sectionMap.get(sectionId);
      if (!range) {
        continue;
      }

      const sectionLines = lines.slice(range.start, range.end + 1);
      const sectionContent = sectionLines.join('\n');

      // Extract title from first line
      const titleMatch = sectionContent.match(SECTION_TITLE_PATTERN);
      const title = titleMatch ? titleMatch[1].trim() : sectionId;

      results.push({
        title,
        content: sectionContent,
      });
    }

    return results;
  }

  /**
   * Filter out subsections that are already included in requested parent sections
   */
  private static filterSubsections(
    sectionIds: string[],
    sectionMap: Map<string, { start: number; end: number }>
  ): string[] {
    const filteredIds: string[] = [];

    // Sort sections by hierarchy level (parents before children)
    const sortedIds = [...sectionIds].sort((a, b) => {
      const aLevel = a.split('/').length;
      const bLevel = b.split('/').length;
      return aLevel - bLevel;
    });

    for (const sectionId of sortedIds) {
      const range = sectionMap.get(sectionId);
      if (!range) {
        // Section doesn't exist, keep it in the list to let the main method handle the error
        filteredIds.push(sectionId);
        continue;
      }

      // Check if this section is already included in any previously accepted section
      let isAlreadyIncluded = false;
      for (const acceptedId of filteredIds) {
        const acceptedRange = sectionMap.get(acceptedId);
        if (
          acceptedRange &&
          range.start >= acceptedRange.start &&
          range.end <= acceptedRange.end &&
          sectionId.startsWith(acceptedId + '/')
        ) {
          isAlreadyIncluded = true;
          break;
        }
      }

      if (!isAlreadyIncluded) {
        filteredIds.push(sectionId);
      }
    }

    return filteredIds;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}kb`;
    }
    return `${bytes}b`;
  }

  /**
   * Read and parse a markdown file
   */
  static readMarkdownFile(filePath: string): {
    content: string;
    metadata: FileMetadata;
  } {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return this.parseFrontMatter(fileContent);
  }

  /**
   * Check if file exists
   */
  static validateFile(
    filePath: string
  ): { valid: boolean; error?: string; stats?: fs.Stats } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File not found' };
      }

      const stats = fs.statSync(filePath);
      return { valid: true, stats };
    } catch (error) {
      return { valid: false, error: `Error accessing file: ${error}` };
    }
  }
}
