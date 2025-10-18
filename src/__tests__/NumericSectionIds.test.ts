import { MarkdownParser } from '../MarkdownParser';
import { Section } from '../types';

describe('NumericSectionIds', () => {
  describe('Basic Numeric ID Generation', () => {
    it('should generate numeric ID "1" for a single level-1 header', () => {
      const content = '# Title 1';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(1);
      expect(sections[0].id).toBe('1');
      expect(sections[0].title).toBe('Title 1');
      expect(sections[0].level).toBe(1);
    });

    it('should generate sequential numeric IDs for multiple level-1 headers', () => {
      const content = `# First Section
# Second Section
# Third Section`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(3);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('2');
      expect(sections[2].id).toBe('3');
    });

    it('should generate nested numeric IDs for parent-child headers', () => {
      const content = `# Parent
## Child`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('1/1');
    });

    it('should generate numeric IDs for three-level nesting', () => {
      const content = `# Level 1
## Level 2
### Level 3`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(3);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('1/1');
      expect(sections[2].id).toBe('1/1/1');
    });
  });

  describe('Multiple Siblings at Same Level', () => {
    it('should increment numeric IDs for sibling level-2 headers', () => {
      const content = `# Parent
## First Child
## Second Child
## Third Child`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(4);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('1/1');
      expect(sections[2].id).toBe('1/2');
      expect(sections[3].id).toBe('1/3');
    });

    it('should increment numeric IDs for sibling level-3 headers', () => {
      const content = `# Root
## Parent
### Child 1
### Child 2
### Child 3
### Child 4`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(6);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('1/1');
      expect(sections[2].id).toBe('1/1/1');
      expect(sections[3].id).toBe('1/1/2');
      expect(sections[4].id).toBe('1/1/3');
      expect(sections[5].id).toBe('1/1/4');
    });

    it('should handle multiple siblings across different parent sections', () => {
      const content = `# Parent 1
## Child 1.1
## Child 1.2
# Parent 2
## Child 2.1
## Child 2.2
## Child 2.3`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(7);
      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/2',
        '2',
        '2/1',
        '2/2',
        '2/3',
      ]);
    });
  });

  describe('Level Resets When Moving to Shallower Levels', () => {
    it('should reset level-2 counter when encountering new level-1 header', () => {
      const content = `# First Section
## Subsection 1.1
## Subsection 1.2
# Second Section
## Subsection 2.1`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/2',
        '2',
        '2/1',
      ]);
    });

    it('should reset level-3 counter when encountering new level-2 header', () => {
      const content = `# Root
## Section A
### Subsection A.1
### Subsection A.2
## Section B
### Subsection B.1
### Subsection B.2`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/2',
        '1/2',
        '1/2/1',
        '1/2/2',
      ]);
    });

    it('should reset all deeper counters when moving to shallower level', () => {
      const content = `# Root
## Level 2
### Level 3
#### Level 4
# New Root
## New Level 2`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
        '2',
        '2/1',
      ]);
    });

    it('should reset multiple levels when jumping from deep to shallow', () => {
      const content = `# Root
## Level 2
### Level 3
#### Level 4
##### Level 5
## Back to Level 2`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
        '1/1/1/1/1',
        '1/2',
      ]);
    });
  });

  describe('Complex Nesting Scenarios', () => {
    it('should handle complex hierarchical document structure', () => {
      const content = `# Introduction
## Overview
## Prerequisites
### Software Requirements
### Hardware Requirements
# Setup
## Installation
### Step 1
### Step 2
## Configuration
# Advanced Topics`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',       // Introduction
        '1/1',     // Overview
        '1/2',     // Prerequisites
        '1/2/1',   // Software Requirements
        '1/2/2',   // Hardware Requirements
        '2',       // Setup
        '2/1',     // Installation
        '2/1/1',   // Step 1
        '2/1/2',   // Step 2
        '2/2',     // Configuration
        '3',       // Advanced Topics
      ]);
    });

    it('should handle multiple nested branches at same level', () => {
      const content = `# Root
## Branch A
### Leaf A1
### Leaf A2
## Branch B
### Leaf B1
### Leaf B2
### Leaf B3
## Branch C
### Leaf C1`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/2',
        '1/2',
        '1/2/1',
        '1/2/2',
        '1/2/3',
        '1/3',
        '1/3/1',
      ]);
    });

    it('should handle alternating nesting depths', () => {
      const content = `# Level 1
## Level 2
# Level 1 again
### Level 3 directly
# Another Level 1
## Level 2 again`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '2',
        '2/0/1',  // Level 3 under second Level 1 (level 2 counter was reset, so it's 0)
        '3',
        '3/1',
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle document with no headers', () => {
      const content = `This is just plain text
with no headers at all.
Just regular content.`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(0);
    });

    it('should handle single level-2 header without parent', () => {
      const content = '## Orphan Header';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(1);
      expect(sections[0].id).toBe('0/1'); // Level 1 counter is 0, level 2 counter is 1
      expect(sections[0].level).toBe(2);
    });

    it('should handle single level-3 header without parents', () => {
      const content = '### Deep Orphan';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(1);
      expect(sections[0].id).toBe('0/0/1'); // Level 1 and 2 counters are 0, level 3 counter is 1
      expect(sections[0].level).toBe(3);
    });

    it('should handle skipped levels (# then ###)', () => {
      const content = `# Level 1
### Level 3 (skipped 2)
## Level 2 after`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/0/1',  // Level 3: level 2 counter was reset to 0 by level 1, then level 3 increments to 1
        '1/1',    // Level 2: comes after, level 2 counter increments to 1
      ]);
    });

    it('should handle multiple skipped levels', () => {
      const content = `# Level 1
##### Level 5 (skipped 2, 3, 4)
## Level 2`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/0/0/0/1',  // Level 5: intermediate counters (2,3,4) are 0, level 5 is 1
        '1/1',        // Level 2: comes after, level 2 counter increments to 1
      ]);
    });

    it('should handle empty lines and whitespace', () => {
      const content = `

# First Header


## Second Header


### Third Header

`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(3);
      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
    });

    it('should handle headers with special characters', () => {
      const content = `# Header with !@#$%
## Header with (parentheses)
### Header with [brackets]`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(3);
      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
      expect(sections[0].title).toBe('Header with !@#$%');
      expect(sections[1].title).toBe('Header with (parentheses)');
      expect(sections[2].title).toBe('Header with [brackets]');
    });
  });

  describe('Very Deep Nesting (All 6 Levels)', () => {
    it('should handle all 6 header levels sequentially', () => {
      const content = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(6);
      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
        '1/1/1/1/1',
        '1/1/1/1/1/1',
      ]);
      expect(sections.map(s => s.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle multiple branches at maximum depth', () => {
      const content = `# Root
## A
### A1
#### A1a
##### A1a1
###### A1a1i
###### A1a1ii
## B
### B1
#### B1a
##### B1a1
###### B1a1i`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',           // Root
        '1/1',         // A
        '1/1/1',       // A1
        '1/1/1/1',     // A1a
        '1/1/1/1/1',   // A1a1
        '1/1/1/1/1/1', // A1a1i
        '1/1/1/1/1/2', // A1a1ii
        '1/2',         // B
        '1/2/1',       // B1
        '1/2/1/1',     // B1a
        '1/2/1/1/1',   // B1a1
        '1/2/1/1/1/1', // B1a1i
      ]);
    });

    it('should reset deep counters when returning to shallow levels', () => {
      const content = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6
## Back to Level 2
### Level 3 again
#### Level 4 again`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
        '1/1/1/1/1',
        '1/1/1/1/1/1',
        '1/2',         // Counter reset for level 2
        '1/2/1',       // Counter reset for level 3
        '1/2/1/1',     // Counter reset for level 4
      ]);
    });
  });

  describe('Mixed Headers with Content', () => {
    it('should generate correct IDs regardless of content', () => {
      const content = `# Introduction

This is the introduction content with multiple paragraphs.

It has several lines.

## Getting Started

More content here.

### Prerequisites

- Item 1
- Item 2
- Item 3

## Installation

Step by step instructions.

# Advanced Topics

Complex material here.`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/2',
        '2',
      ]);
    });

    it('should handle content with code blocks', () => {
      const content = `# Code Examples

Some intro text.

\`\`\`javascript
function example() {
  return "test";
}
\`\`\`

## JavaScript Examples

More code:

\`\`\`js
const x = 1;
\`\`\`

## Python Examples

\`\`\`python
def test():
    pass
\`\`\``;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/2',
      ]);
    });

    it('should handle inline code and headers that look like code', () => {
      const content = `# Using \`code\` in headers

## \`npm install\` command

### The \`--save-dev\` flag`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections).toHaveLength(3);
      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
      expect(sections[0].title).toBe('Using `code` in headers');
    });
  });

  describe('Section ID Hierarchy Validation', () => {
    it('should create valid parent-child ID relationships', () => {
      const content = `# Parent
## Child 1
### Grandchild 1
## Child 2`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      const parent = sections[0];
      const child1 = sections[1];
      const grandchild1 = sections[2];
      const child2 = sections[3];

      // Verify parent-child relationships through ID structure
      expect(child1.id.startsWith(parent.id + '/')).toBe(true);
      expect(grandchild1.id.startsWith(child1.id + '/')).toBe(true);
      expect(child2.id.startsWith(parent.id + '/')).toBe(true);

      // Verify grandchild is not direct child of parent
      expect(grandchild1.id.startsWith(parent.id + '/')).toBe(true);
      const grandchildParts = grandchild1.id.split('/');
      const parentParts = parent.id.split('/');
      expect(grandchildParts.length).toBe(parentParts.length + 2);
    });

    it('should maintain correct ID depth for each level', () => {
      const content = `# L1
## L2
### L3
#### L4
##### L5
###### L6`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      sections.forEach((section, index) => {
        const expectedDepth = index + 1;
        const actualDepth = section.id.split('/').length;
        expect(actualDepth).toBe(expectedDepth);
        expect(section.level).toBe(expectedDepth);
      });
    });
  });

  describe('isDirectChild Compatibility with Numeric IDs', () => {
    // Helper function to test isDirectChild logic with numeric IDs
    const isDirectChild = (childSection: Section, parentSection: Section): boolean => {
      if (!childSection.id.startsWith(parentSection.id + '/')) {
        return false;
      }

      const childParts = childSection.id.split('/');
      const parentParts = parentSection.id.split('/');

      return childParts.length === parentParts.length + 1;
    };

    it('should correctly identify direct children', () => {
      const content = `# Parent
## Direct Child
### Grandchild`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      const parent = sections[0];
      const directChild = sections[1];
      const grandchild = sections[2];

      expect(isDirectChild(directChild, parent)).toBe(true);
      expect(isDirectChild(grandchild, parent)).toBe(false);
      expect(isDirectChild(grandchild, directChild)).toBe(true);
    });

    it('should correctly identify siblings as non-children', () => {
      const content = `# Parent
## Child 1
## Child 2
## Child 3`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      const parent = sections[0];
      const child1 = sections[1];
      const child2 = sections[2];
      const child3 = sections[3];

      // All are direct children of parent
      expect(isDirectChild(child1, parent)).toBe(true);
      expect(isDirectChild(child2, parent)).toBe(true);
      expect(isDirectChild(child3, parent)).toBe(true);

      // But siblings are not children of each other
      expect(isDirectChild(child2, child1)).toBe(false);
      expect(isDirectChild(child3, child1)).toBe(false);
      expect(isDirectChild(child3, child2)).toBe(false);
    });

    it('should work correctly with complex hierarchies', () => {
      const content = `# Root
## Section A
### Subsection A1
#### Item A1a
### Subsection A2
## Section B
### Subsection B1`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      const root = sections[0];          // 1
      const sectionA = sections[1];      // 1/1
      const subsectionA1 = sections[2];  // 1/1/1
      const itemA1a = sections[3];       // 1/1/1/1
      const subsectionA2 = sections[4];  // 1/1/2
      const sectionB = sections[5];      // 1/2
      const subsectionB1 = sections[6];  // 1/2/1

      // Test direct child relationships
      expect(isDirectChild(sectionA, root)).toBe(true);
      expect(isDirectChild(sectionB, root)).toBe(true);
      expect(isDirectChild(subsectionA1, sectionA)).toBe(true);
      expect(isDirectChild(subsectionA2, sectionA)).toBe(true);
      expect(isDirectChild(itemA1a, subsectionA1)).toBe(true);
      expect(isDirectChild(subsectionB1, sectionB)).toBe(true);

      // Test non-direct relationships
      expect(isDirectChild(subsectionA1, root)).toBe(false);
      expect(isDirectChild(itemA1a, sectionA)).toBe(false);
      expect(isDirectChild(subsectionB1, root)).toBe(false);
      expect(isDirectChild(subsectionB1, sectionA)).toBe(false);
    });

    it('should handle multi-digit numeric IDs correctly', () => {
      const content = `# Root
## Child 1
## Child 2
## Child 3
## Child 4
## Child 5
## Child 6
## Child 7
## Child 8
## Child 9
## Child 10
## Child 11`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      const root = sections[0];
      const child10 = sections[10];
      const child11 = sections[11];

      expect(child10.id).toBe('1/10');
      expect(child11.id).toBe('1/11');
      expect(isDirectChild(child10, root)).toBe(true);
      expect(isDirectChild(child11, root)).toBe(true);
      expect(isDirectChild(child11, child10)).toBe(false);
    });
  });

  describe('Character Count with Numeric IDs', () => {
    it('should calculate character counts correctly with numeric IDs', () => {
      const content = `# Main Section

This is content for the main section.

## Subsection

Subsection content.

# Another Section

More content.`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.every(s => s.character_count > 0)).toBe(true);
      expect(sections[0].id).toBe('1');
      expect(sections[1].id).toBe('1/1');
      expect(sections[2].id).toBe('2');

      // Parent section should include subsection content
      expect(sections[0].character_count).toBeGreaterThan(sections[1].character_count);
    });

    it('should handle character counts for deeply nested sections', () => {
      const content = `# Level 1
Content 1
## Level 2
Content 2
### Level 3
Content 3
#### Level 4
Content 4`;

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
      ]);

      // Each parent should have larger character count than its child
      expect(sections[0].character_count).toBeGreaterThan(sections[1].character_count);
      expect(sections[1].character_count).toBeGreaterThan(sections[2].character_count);
      expect(sections[2].character_count).toBeGreaterThan(sections[3].character_count);
    });
  });

  describe('Windows and Unix Line Endings', () => {
    it('should handle Unix line endings (LF)', () => {
      const content = '# Header 1\n## Header 2\n### Header 3';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const content = '# Header 1\r\n## Header 2\r\n### Header 3';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
    });

    it('should handle old Mac line endings (CR)', () => {
      const content = '# Header 1\r## Header 2\r### Header 3';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
      ]);
    });

    it('should handle mixed line endings', () => {
      const content = '# Header 1\r\n## Header 2\n### Header 3\r#### Header 4';

      const { sections } = MarkdownParser.parseMarkdownSections(content);

      expect(sections.map(s => s.id)).toEqual([
        '1',
        '1/1',
        '1/1/1',
        '1/1/1/1',
      ]);
    });
  });
});
