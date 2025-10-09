# Documentation MCP Server Specification

## Overview

This is a Model Context Protocol (MCP) server designed for efficient reading and navigation of markdown-based documentation. The server provides tools to discover, search, and selectively read content from structured documentation repositories.

### Use Case

Users maintain folders of `.md` documentation files (potentially with subfolders) intended for AI agent consumption. The MCP server receives the documentation folder path as a configuration parameter and provides intelligent tools to locate relevant information and read it efficiently.

## Document Structure

### Metadata Format

Each `.md` file may optionally include a YAML front matter section with metadata:

```yaml
---
Title: REST Conventions
Description: Conventions for RESTful API design, including naming conventions, versioning conventions, and best practices.
Keywords: ["REST", "RESTful", "HTTP", "API", "Design"]
---
```

### Metadata Fields

- **Title** (optional): Human-readable title of the document
- **Description** (optional): Concise but complete summary of document content
- **Keywords** (optional): Array of relevant keywords for search

## Core Tools

### 1. list_documentation_files

Lists all available documentation files with their metadata. Subfolders are included also.

**Parameters:**
None

**Returns:**
Array of file objects with:
- `filename`: Relative path to the file (relative from the main documentation folder)
- `title`: Document title from metadata or filename
- `description`: Document description
- `keywords`: Array of keywords
- `size`: File size in bytes (string with 'kb' or 'b' suffix)

### 2. table_of_contents

Provides a structured table of contents for a markdown file.

**Parameters:**
- `filename`: Path to the markdown file

**Returns:**
Array of section objects with:
- `id`: Section identifier (path-based)
- `title`: Header text
- `level`: Header level (1-6)
- `character_count`: number of characters in the section, if read with read_sections.

### 3. read_sections

Reads specific sections from a markdown file.

**Parameters:**
- `filename`: Path to the markdown file
- `section_ids`: Array of section identifiers to read

**Returns:**
Array of section objects with:
- `title`: Header text
- `content`: Section content


## Data Structures

### Section Definition

A section consists of a markdown header and all content up to the next header of the same or higher level.

**Example:**
```markdown
# REST Conventions

This is the introduction content.

## Introduction

Welcome to REST conventions...
```

Here:
- Section 1: `# REST Conventions` + its content (including the ## Introduction subsection)
- Section 2: `## Introduction` + its content

### Section Identifier

Section IDs are path-based identifiers derived from header text:
- Convert to lowercase
- Replace spaces and special characters with hyphens
- Use forward slashes for hierarchical structure

**Example Mapping:**
- `# REST Conventions` → `rest-conventions`
- `## Introduction` → `rest-conventions/introduction`
- `### HTTP Methods` → `rest-conventions/introduction/http-methods`

### Section Hierarchy

The system maintains the natural hierarchy of markdown headers:
- H1 (`#`) → Level 1 (document root)
- H2 (`##`) → Level 2
- H3 (`###`) → Level 3
- And so on...

## Configuration

### Server Configuration

```json
{
  "documentation_path": "/path/to/documentation",
  "auto_index": true,
  "index_refresh_interval": 300,
  "max_file_size": 10485760,
  "exclude_patterns": ["node_modules/**", "*.tmp.md"],
  "include_patterns": ["**/*.md"]
}
```

### Configuration Options

- **documentation_path**: Root directory containing markdown files
- **auto_index**: Automatically rebuild file index on changes
- **index_refresh_interval**: Index refresh interval in seconds
- **max_file_size**: Maximum file size to process (bytes)
- **exclude_patterns**: Glob patterns for files to exclude
- **include_patterns**: Glob patterns for files to include

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "The specified file was not found",
    "details": {
      "filename": "nonexistent.md",
      "search_path": "/docs"
    }
  }
}
```

### Common Error Codes

- `FILE_NOT_FOUND`: Requested file doesn't exist
- `INVALID_SECTION_ID`: Section identifier is malformed
- `SECTION_NOT_FOUND`: Requested section doesn't exist
- `PERMISSION_DENIED`: Insufficient permissions to access file
- `FILE_TOO_LARGE`: File exceeds size limits
- `PARSE_ERROR`: Error parsing markdown or metadata

## Implementation Notes

- YAML front matter metadata
- Does not support Setext-style headers (underlined)
- Front matter must be valid YAML