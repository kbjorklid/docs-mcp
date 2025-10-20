# Documentation MCP Server

A Model Context Protocol (MCP) server that provides tools for reading and navigating markdown-based documentation repositories.

## Features

- **List Documentation Files**: Discover and browse available documentation files with metadata
- **Table of Contents**: Generate structured table of contents with configurable depth and header limit control
- **Section Table of Contents**: Get subsections within specified parent sections for targeted exploration
- **Read Sections**: Read specific sections of documentation by their IDs
- **Search**: Find text patterns using regular expressions across documentation files with multiline matching support
- **Multi-Directory Support**: Configure multiple documentation directories with conflict resolution
- **Configurable Max TOC Depth**: Limit table of contents header depth (e.g., only show `#`, `##`, and `###` headers, default: 3)
- **Configurable Max Headers**: Limit total number of headers returned by table of contents (default: 25)
- **Flexible Configuration**: Support for command line, environment variables, and default paths
- **Comprehensive Error Handling**: Clear error messages and validation

## Installation

### Claude Code (Mac, Linux)
```bash
claude mcp add docs-reader -- npx local-dev-docs-reader-mcp@latest -d &lt;documentation_directory> 
```

### Claud Code (Windows)
```bash
claude mcp add docs-reader -- cmd /c -- npx local-dev-docs-reader-mcp@latest -d &lt;documentation_directory> 
```

## Command Line Arguments

### Documentation directories

Use the `--docs-path` or `-d` flag to specify your documentation directory or directories. You can provide 

```bash
# Single directory
npm start -- -d /path/to/your/docs

# Multiple directories
npm start -- -d /path/to/docs1 -d /path/to/docs2 -d /path/to/docs3
```

#### Max ToC Depth

Use `--max-toc-depth` to limit the header levels shown in table of contents (default: 3, shows `#`, `##`, `###`).

```bash
npm start -- --max-toc-depth 2  # Only show # and ## headers
```

#### Max Headers

Use `--max-headers` to limit the total number of headers returned (default: 25).

```bash
npm start -- --max-headers 50  # Return up to 50 headers
```

## Typical workflow

This is how the agent should typically use this MCP server.

1. Agent calls `list_documentation_files` to see which .md files are available for reading
2. Agent deduces which file(s) it would like to read based on file name and metadata (if metadata provided)
3. Agnet calls `table_of_contents` for the file it wants to read
4. (optional) Agent sees a section that might contain what it wants to read, but is not sure. The section has hidden subsections. Therefore, Agent calls `section_table_of_contents` for the file and section.
5. Agent deduces whihc sections (header + text under it) it wants to read.
6. Agent asks for the section contents with `read_sections`



## Available MCP Tools

### list_documentation_files
Lists all available documentation files with metadata including file size, modification time, and front matter information.
No parameters required.

### table_of_contents
Provides a structured table of contents for a markdown file, showing section hierarchy with IDs.

**Parameters:**
- `filename` (required) - The documentation file to analyze

**Response Format:**

The tool returns a response object with the following structure:
```json
{
  "sections": [
    {
      "id": "1",
      "title": "Section Title",
      "level": 1,
      "character_count": 1234,
      "subsection_count": 3
    }
  ],
  "instructions": "To explore deeper subsections (under a specific subsection that are not currently shown (the \"subsection_count\" is > 0), use the section_table_of_contents tool with the section IDs of interest.)"
}
```

The `--max-toc-depth` and `--max-headers` command line parameters control what is shown in the table of contents.


### section_table_of_contents
Similar to `table_of_contents` tool, but instead of starting from document root, starts from a section.

Typically for a large document - to save tokens - `table_of_content` will not show all sections (all headers). Instead, the agent can choose to go deeper under one or more sections asking the table of contents (the subheaders) under a section that was in the results of a `table_of_contents` or another `section_table_of_contents` call.

**Parameters:**
- `filename` (required) - The documentation file to analyze
- `section_ids` (required) - Non-empty array of section identifiers to get subsections for

**Response Format:**

Same as for `table_of_contents`.

The `--max-toc-depth` and `--max-headers` command line parameters control what is shown in the table of contents.


### read_sections
Reads specific sections from a markdown file by their IDs.

**Parameters:**
- `filename` (required) - The documentation file to read from
- `section_ids` (required) - Array of section identifiers to read

### search
Searches for text patterns using regular expressions in documentation files, returning headers and section IDs where the search pattern is found. Supports full regular expression syntax with multiline matching (the "s" flag is enabled automatically for dotAll behavior).

**Parameters:**
- `query` (required) - The regular expression pattern to search for (case-insensitive). The pattern automatically includes the "i" and "s" flags for case-insensitive and multiline matching
- `filename` (optional) - Specific file to search in. If not provided, searches all available documentation files
