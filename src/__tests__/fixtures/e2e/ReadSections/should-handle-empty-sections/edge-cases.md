---
title: "Edge Cases & Special Characters"
description: "Testing edge cases with special characters and empty sections"
tags: ["test", "edge-cases", "special-chars"]
encoding: "UTF-8"
---

# Edge Cases & Special Characters

This document tests various edge cases and special character handling.

## Empty Section Test

This section has no content below the header.

## Special Characters & Encoding

### Unicode Characters

Testing various Unicode characters:

- accented: café, résumé, naïve
- symbols: ©, ®, ™, €, £, ¥
- math: ∑, ∏, ∫, √, ∞, ≠, ≤, ≥
- arrows: ←, →, ↑, ↓, ↔
- emojis: 🚀, ✅, ❌, ⚠️, ℹ️

### HTML Entities

Testing HTML entity encoding:

- ampersand: &amp;
- less than: &lt;
- greater than: &gt;
- quotes: &quot;, &#39;
- copyright: &copy;
- trademark: &trade;

### Markdown Special Characters

Testing markdown special characters in headers:

# Header with *asterisks* and _underscores_

## Header with `backticks` and [links](http://example.com)

### Header with "quotes" and 'apostrophes'

#### Header with # hash # symbols & other & chars

##### Header with math: 2 + 2 = 4, x > y, a ≤ b

## Code Blocks & Inline Code

Testing various code formatting:

### Inline Code

Use `console.log('Hello, World!')` for debugging.

### Fenced Code Blocks

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

const result = greet("World");
console.log(result); // Output: Hello, World!
```

```python
def calculate_sum(a, b):
    """Calculate the sum of two numbers."""
    return a + b

result = calculate_sum(10, 20)
print(f"Sum: {result}")
```

### Code with Special Characters

```bash
# Script with special characters
echo "Testing special chars: café, résumé, naïve"
grep -r "pattern.*regex" /path/to/files
find . -name "*.js" -exec grep "const.*=" {} \;
```

## Lists & Complex Formatting

### Nested Lists

Testing nested list structures:

1. First level item
   - Second level item
     - Third level item
       * Fourth level item
2. Another first level item
   1. Numbered nested item
   2. Another numbered item
      - Bullet item under numbered

### Complex Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Special chars: café, résumé | `code` | **bold** |
| [Link](http://example.com) | *italic* | `monospace` |

## Links & References

### Various Link Formats

Testing different link formats:

- Standard link: [Example](https://example.com)
- Link with title: [Example](https://example.com "Example Website")
- Reference link: [Reference][ref]
- Email link: <user@example.com>
- Auto link: https://github.com

[ref]: https://example.com "Reference link"

### Images with Alt Text

Testing image markdown:

![Example Image](https://example.com/image.jpg "Example image title")

## Blockquotes & Citations

### Simple Blockquote

> This is a simple blockquote to test parsing.

### Nested Blockquote

> This is the outer blockquote.
>
> > This is a nested blockquote.
> >
> > > This is a deeply nested blockquote.

### Blockquote with formatting

> **Important:** This blockquote contains **bold** text and `inline code`.
>
> It also spans multiple lines and contains [links](http://example.com).

## Section with Very Long Content

This section contains a lot of content to test parsing performance and handling of large sections.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

### Subsection with Code Examples

More content under the long section:

```json
{
  "name": "test-application",
  "version": "1.0.0",
  "description": "A test application with special characters: café, résumé",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "scripts": {
    "start": "node index.js",
    "test": "jest --coverage"
  }
}
```

## Headers with Special Characters

### Header & with Ampersand

Testing headers that contain special characters.

### Header <with> Brackets

More special characters in headers.

### Header "with 'quotes' inside"

Mixed quote types.

### Header with # hash # symbols

Testing hash symbols in header content.

### Header with back\\slash

Testing escape characters.

## Final Section

This is the final section of the document to ensure all sections are properly indexed and accessible.

### Conclusion

The document has covered various edge cases and special character scenarios to test the robustness of the markdown parsing system.