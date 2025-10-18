import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MarkdownParser } from '../MarkdownParser';
import { FileMetadata } from '../types';

// Mock dependencies
jest.mock('fs');
jest.mock('js-yaml');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe('MarkdownParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFrontMatter', () => {
    it('should parse valid YAML front matter', () => {
      const content = `---
title: Test Document
description: A test document
keywords: [test, document]
---
# Main Content

This is the main content.`;

      const expectedMetadata: FileMetadata = {
        title: 'Test Document',
        description: 'A test document',
        keywords: ['test', 'document'],
      };

      mockYaml.load.mockReturnValue(expectedMetadata);

      const result = MarkdownParser.parseFrontMatter(content);

      expect(mockYaml.load).toHaveBeenCalledWith(
        'title: Test Document\ndescription: A test document\nkeywords: [test, document]'
      );
      expect(result).toEqual({
        metadata: expectedMetadata,
        content: '# Main Content\n\nThis is the main content.',
      });
    });

    it('should return empty metadata when no front matter', () => {
      const content = '# Main Content\n\nNo front matter here.';

      const result = MarkdownParser.parseFrontMatter(content);

      expect(mockYaml.load).not.toHaveBeenCalled();
      expect(result).toEqual({
        metadata: {},
        content,
      });
    });

    it('should handle YAML parsing errors gracefully', () => {
      const content = `---
invalid: yaml: content:
---
# Content`;

      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = MarkdownParser.parseFrontMatter(content);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing YAML front matter:',
        expect.any(Error)
      );
      expect(result).toEqual({
        metadata: {},
        content: `---
invalid: yaml: content:
---
# Content`,
      });

      consoleSpy.mockRestore();
    });

    it('should handle empty front matter', () => {
      const content = `---
---
# Content`;

      mockYaml.load.mockReturnValue({});

      const result = MarkdownParser.parseFrontMatter(content);

      expect(result).toEqual({
        metadata: {},
        content: `---
---
# Content`,
      });
    });
  });

  describe('generateSectionId', () => {
    it('should generate valid section IDs', () => {
      const testCases = [
        { input: 'Simple Title', expected: 'simple-title' },
        {
          input: 'Title with Special Characters!',
          expected: 'title-with-special-characters',
        },
        { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
        {
          input: '---Leading and Trailing---',
          expected: 'leading-and-trailing',
        },
        {
          input: 'Mixed-CASE_and_underscores',
          expected: 'mixed-case_and_underscores',
        },
        { input: '', expected: '' },
        { input: '123 Numbers', expected: '123-numbers' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(MarkdownParser.generateSectionId(input)).toBe(expected);
      });
    });
  });

  describe('parseMarkdownSections', () => {
    it('should parse simple markdown sections', () => {
      const content = `# Title 1

Content 1

## Title 2

Content 2

### Title 3

Content 3`;

      const result = MarkdownParser.parseMarkdownSections(content);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0]).toEqual({
        id: '1',
        title: 'Title 1',
        level: 1,
        character_count: expect.any(Number),
      });
      expect(result.sections[1]).toEqual({
        id: '1/1',
        title: 'Title 2',
        level: 2,
        character_count: expect.any(Number),
      });
      expect(result.sections[2]).toEqual({
        id: '1/1/1',
        title: 'Title 3',
        level: 3,
        character_count: expect.any(Number),
      });
    });

    it('should handle hierarchical section IDs', () => {
      const content = `# Root
## Child 1
### Grandchild 1
## Child 2
# Another Root`;

      const result = MarkdownParser.parseMarkdownSections(content);

      expect(result.sections.map((s) => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/2',
        '2',
      ]);
    });

    it('should handle content without headers', () => {
      const content = 'Just some content\nwithout any headers.';

      const result = MarkdownParser.parseMarkdownSections(content);

      expect(result.sections).toHaveLength(0);
      expect(result.sectionMap.size).toBe(0);
    });

    it('should calculate character counts correctly', () => {
      const content = `# Title

This is content.

## Subtitle

More content.`;

      const result = MarkdownParser.parseMarkdownSections(content);

      const titleSection = result.sections.find((s) => s.id === '1');
      const subtitleSection = result.sections.find(
        (s) => s.id === '1/1'
      );

      expect(titleSection?.character_count).toBeGreaterThan(0);
      expect(subtitleSection?.character_count).toBeGreaterThan(0);
    });

    it('should include subsection content in parent section character count', () => {
      // This tests the bug where parent sections were not including their subsections
      const content = `# Main Section

This is content for the main section.
It has multiple lines.

## Subsection A

Content for subsection A.

## Subsection B

Content for subsection B.

# Other Section

Content for other section.`;

      const result = MarkdownParser.parseMarkdownSections(content);

      const mainSection = result.sections.find((s) => s.id === '1');
      const subA = result.sections.find((s) => s.id === '1/1');
      const subB = result.sections.find((s) => s.id === '1/2');
      const otherSection = result.sections.find((s) => s.id === '2');

      // Parent section should include all subsection content
      // It should span from "# Main Section" to just before "# Other Section"
      expect(mainSection?.character_count).toBeGreaterThan(0);
      expect(subA?.character_count).toBeGreaterThan(0);
      expect(subB?.character_count).toBeGreaterThan(0);
      expect(otherSection?.character_count).toBeGreaterThan(0);

      // The parent section should be significantly larger than its subsections
      // because it includes both subsections' content
      expect(mainSection?.character_count).toBeGreaterThan(
        (subA?.character_count || 0) + (subB?.character_count || 0)
      );
    });

    it('should correctly calculate character counts with deep nesting', () => {
      const content = `# Level 1

Level 1 content

## Level 2

Level 2 content

### Level 3

Level 3 content

#### Level 4

Level 4 content

# Another Level 1

Another content`;

      const result = MarkdownParser.parseMarkdownSections(content);

      const level1 = result.sections.find((s) => s.id === '1');
      const level2 = result.sections.find((s) => s.id === '1/1');
      const level3 = result.sections.find((s) => s.id === '1/1/1');
      const level4 = result.sections.find((s) => s.id === '1/1/1/1');

      // Each parent should be larger than or equal to its children combined
      expect(level1?.character_count).toBeGreaterThan(0);
      expect(level2?.character_count).toBeGreaterThan(0);
      expect(level3?.character_count).toBeGreaterThan(0);
      expect(level4?.character_count).toBeGreaterThan(0);

      // Parent should include children
      expect(level1?.character_count).toBeGreaterThan(
        (level2?.character_count || 0)
      );
    });

    it('should handle headers with extra spaces', () => {
      const content = `#    Title with spaces
##   Another title`;

      const result = MarkdownParser.parseMarkdownSections(content);

      expect(result.sections[0].title).toBe('Title with spaces');
      expect(result.sections[1].title).toBe('Another title');
    });

    it('should handle headers up to level 6', () => {
      const content = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6`;

      const result = MarkdownParser.parseMarkdownSections(content);

      expect(result.sections).toHaveLength(6);
      expect(result.sections.map((s) => s.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('readSectionsFromContent', () => {
    it('should read specific sections from content', () => {
      const content = `# Title 1
Content 1
## Title 2
Content 2
### Title 3
Content 3`;

      const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

      // When requesting both parent and child, the child should be filtered out
      // to avoid duplication (the child is already included in the parent)
      const result = MarkdownParser.readSectionsFromContent(
        content,
        ['1', '1/1'],
        sectionMap
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Title 1');
      expect(result[0].content).toContain('Content 1');
      expect(result[0].content).toContain('Content 2'); // subsection is included
      expect(result[0].content).toContain('Content 3'); // nested subsection is included
    });

    it('should read sibling sections without filtering', () => {
      const content = `# Title 1
Content 1
## Title 2
Content 2
### Title 3
Content 3
## Title 4
Content 4
# Title 5
Content 5`;

      const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

      // Sibling sections should both be returned (not filtered)
      const result = MarkdownParser.readSectionsFromContent(
        content,
        ['1/1', '1/2'],
        sectionMap
      );

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Title 2');
      expect(result[0].content).toContain('Content 2');
      expect(result[1].title).toBe('Title 4');
      expect(result[1].content).toContain('Content 4');
    });

    it('should handle missing section IDs', () => {
      const content = `# Title 1
Content 1`;

      const { sectionMap } = MarkdownParser.parseMarkdownSections(content);
      const result = MarkdownParser.readSectionsFromContent(
        content,
        ['non-existent-section'],
        sectionMap
      );

      expect(result).toHaveLength(0);
    });

    it('should handle empty section IDs array', () => {
      const content = `# Title 1
Content 1`;

      const { sectionMap } = MarkdownParser.parseMarkdownSections(content);
      const result = MarkdownParser.readSectionsFromContent(
        content,
        [],
        sectionMap
      );

      expect(result).toHaveLength(0);
    });

    it('should not duplicate content when subsection is included in parent section', () => {
      const content = `# Introduction
Intro content

## Getting Started
Getting started content

## Advanced Topics
Advanced content`;

      const { sectionMap } = MarkdownParser.parseMarkdownSections(content);

      // Manually create the section map to ensure proper line ranges
      const customSectionMap = new Map([
        ['1', { start: 0, end: 7 }], // Includes all subsections
        ['1/1', { start: 3, end: 4 }],
        ['1/2', { start: 6, end: 7 }],
      ]);

      const result = MarkdownParser.readSectionsFromContent(
        content,
        ['1', '1/1'],
        customSectionMap
      );

      // Should only return the parent section to avoid duplication
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Introduction');

      // The parent section contains all content including the subsection
      expect(result[0].content).toContain('Getting started content');
      expect(result[0].content).toContain('Advanced content');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(MarkdownParser.formatFileSize(512)).toBe('512b');
      expect(MarkdownParser.formatFileSize(1024)).toBe('1.0kb');
      expect(MarkdownParser.formatFileSize(1536)).toBe('1.5kb');
      expect(MarkdownParser.formatFileSize(1048576)).toBe('1024.0kb');
    });

    it('should handle zero bytes', () => {
      expect(MarkdownParser.formatFileSize(0)).toBe('0b');
    });
  });

  describe('readMarkdownFile', () => {
    it('should read and parse markdown file', () => {
      const filePath = '/path/to/file.md';
      const fileContent = `---
title: Test
---
# Content`;

      const expectedMetadata = { title: 'Test' };

      mockFs.readFileSync.mockReturnValue(fileContent);
      mockYaml.load.mockReturnValue(expectedMetadata);

      const result = MarkdownParser.readMarkdownFile(filePath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(result).toEqual({
        content: '# Content',
        metadata: expectedMetadata,
      });
    });
  });

  describe('validateFile', () => {
    it('should validate existing file within size limit', () => {
      const filePath = '/path/to/file.md';
      const stats = { size: 1024 } as fs.Stats;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(stats);

      const result = MarkdownParser.validateFile(filePath);

      expect(result).toEqual({
        valid: true,
        stats,
      });
    });

    it('should reject non-existent file', () => {
      const filePath = '/path/to/nonexistent.md';

      mockFs.existsSync.mockReturnValue(false);

      const result = MarkdownParser.validateFile(filePath);

      expect(result).toEqual({
        valid: false,
        error: 'File not found',
      });
    });

    it('should validate any existing file regardless of size', () => {
      const filePath = '/path/to/large.md';
      const stats = { size: 2048 } as fs.Stats;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(stats);

      const result = MarkdownParser.validateFile(filePath);

      expect(result).toEqual({
        valid: true,
        stats,
      });
    });

    it('should handle file system errors', () => {
      const filePath = '/path/to/error.md';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = MarkdownParser.validateFile(filePath);

      expect(result).toEqual({
        valid: false,
        error: 'Error accessing file: Error: Permission denied',
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete markdown parsing workflow', () => {
      const filePath = '/path/to/document.md';
      const fileContent = `---
title: Complete Document
description: A complete test document
---

# Introduction

This is the introduction.

## Getting Started

Getting started content.

# Advanced Topics

Advanced content here.`;

      const metadata = {
        title: 'Complete Document',
        description: 'A complete test document',
      };

      mockFs.readFileSync.mockReturnValue(fileContent);
      mockYaml.load.mockReturnValue(metadata);

      // Read file
      const { content, metadata: parsedMetadata } =
        MarkdownParser.readMarkdownFile(filePath);
      expect(parsedMetadata).toEqual(metadata);

      // Parse sections
      const { sections, sectionMap } =
        MarkdownParser.parseMarkdownSections(content);
      expect(sections).toHaveLength(3);

      // Read specific sections
      const sectionContents = MarkdownParser.readSectionsFromContent(
        content,
        ['1', '2'],
        sectionMap
      );
      expect(sectionContents).toHaveLength(2);
      expect(sectionContents[0].title).toBe('Introduction');
      expect(sectionContents[1].title).toBe('Advanced Topics');
    });
  });
});
