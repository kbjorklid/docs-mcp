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

## Requirements

- **Node.js**: Version 16 or higher
- **npm**: Version 7 or higher

## Installation

```bash
npm install
```

## Configuration

The server needs to know where your documentation files are located. You can configure the documentation path in several ways. The server now supports **multiple documentation directories** for managing distributed documentation.

### Command Line Arguments (Recommended)

Use the `--docs-path` or `-d` flag to specify your documentation directory or directories:

#### Single Directory
```bash
# Using long form
npm start -- --docs-path /path/to/your/docs

# Using shorthand
npm start -- -d /path/to/your/docs

# Windows path example
npm start -- --docs-path "C:\Users\YourName\Documents\docs"

# Relative path example
npm start -- --docs-path ./my-documentation
```

#### Multiple Directories
```bash
# Specify multiple directories (each with its own flag)
npm start -- -d /path/to/docs1 -d /path/to/docs2 -d /path/to/docs3

# Mix long and short forms
npm start -- --docs-path /path/to/api-docs -d /path/to/user-docs -d /path/to/dev-docs

# Windows example with multiple paths
npm start -- --docs-path "C:\docs\api" --docs-path "C:\docs\guides"

# Relative paths for multiple directories
npm start -- -d ./docs -d ../shared-docs -d ./vendor-docs
```

### Environment Variables

The server supports the following environment variables:

#### DOCS_PATH

Set the `DOCS_PATH` environment variable to specify documentation directory/directories:

#### Single Directory
```bash
# Linux/macOS
DOCS_PATH=/path/to/your/docs npm start

# Windows (Command Prompt)
set DOCS_PATH=C:\path\to\your\docs && npm start

# Windows (PowerShell)
$env:DOCS_PATH="C:\path\to\your\docs"; npm start
```

#### Multiple Directories
Use comma-separated paths to specify multiple directories:

```bash
# Linux/macOS - comma-separated paths
DOCS_PATH="/path/to/docs1,/path/to/docs2,/path/to/docs3" npm start

# Windows (Command Prompt) - comma-separated paths
set DOCS_PATH=C:\docs\api,C:\docs\guides,C:\docs\examples && npm start

# Windows (PowerShell) - comma-separated paths
$env:DOCS_PATH="C:\docs\api,C:\docs\guides,C:\docs\examples"; npm start

# Mix absolute and relative paths
DOCS_PATH="./docs,../shared-docs,/opt/documentation" npm start
```

#### MAX_TOC_DEPTH

Set the `MAX_TOC_DEPTH` environment variable to limit the maximum depth/level of headers returned by the `table_of_contents` tool:

```bash
# Linux/macOS - include headers up to level 2 (# and ##)
MAX_TOC_DEPTH=2 npm start

# Windows (Command Prompt) - include headers up to level 2
set MAX_TOC_DEPTH=2 && npm start

# Windows (PowerShell) - include headers up to level 2
$env:MAX_TOC_DEPTH="2"; npm start
```

**Default value**: 3 (includes `#`, `##`, and `###` headers)

**Depth Values:**
- `1` - Only `#` (level-1) headers
- `2` - `#` and `##` (level-1 and level-2) headers
- `3` - `#`, `##`, and `###` headers (default)
- `4` - Up to `####` headers
- And so on...

**Example**: With `MAX_TOC_DEPTH=2`, the table of contents will only show top-level (`#`) and second-level (`##`) headers, excluding any deeper headers (`###`, `####`, etc.) from the document.

#### MAX_HEADERS

Set the `MAX_HEADERS` environment variable to limit the number of headers returned by the `table_of_contents` tool:

```bash
# Linux/macOS - set max headers to 20
MAX_HEADERS=20 npm start

# Windows (Command Prompt) - set max headers to 20
set MAX_HEADERS=20 && npm start

# Windows (PowerShell) - set max headers to 20
$env:MAX_HEADERS="20"; npm start
```

**Default value**: 25 headers

**Behavior**: When a document has more headers than the limit, the tool progressively includes header levels starting from level-1 (top-level) until adding another level would exceed the limit. Level-1 headers are always included to preserve document structure, even if they exceed the limit.

### Default Path

If no path is specified, the server will look for documentation in a `docs` folder in the same directory as the project.

### Conflict Resolution

When multiple directories contain files with the same name:

- **Directory Order Matters**: Directories are processed in the order specified
- **First Match Wins**: The file from the first directory containing the filename takes precedence
- **Example**: With `-d /dir1 -d /dir2`, if both contain `guide.md`, only `/dir1/guide.md` is available

```bash
# Example: /api-docs contains reference.md, /user-docs also contains reference.md
npm start -- -d /api-docs -d /user-docs
# Result: Only /api-docs/reference.md is available (first directory takes precedence)
```

## Running the Server

### Development Mode

For development with automatic TypeScript compilation:

```bash
npm run dev
```

### Production Mode

For production use:

```bash
npm run build
npm start
```

### Quick Start Script

A simple PowerShell script is available:

```powershell
# Run with default docs path
.\run.ps1
```

Note: You may need to edit `run.ps1` to specify your documentation path.


## Command Line Reference

### Options

- `--docs-path <path>` or `-d <path>` - Specify documentation directory (can be used multiple times for multiple directories)
- `--max-toc-depth <number>` - Maximum depth for table of contents headers (default: 3, e.g., 2 = only `#` and `##` headers)
- `--max-headers <number>` - Maximum number of headers to include in table of contents (default: 25)
- `--help` or `-h` - Show help information

### Path Configuration Precedence

The server uses documentation paths in this order of priority:

1. Command line `--docs-path` arguments (highest) - All specified directories are used in order
2. `DOCS_PATH` environment variable - Comma-separated paths are processed in order
3. Default `./docs` folder (lowest)

### Examples

#### Single Directory Examples
```bash
# Use custom documentation path
npm start -- --docs-path /home/user/project-docs

# Run with relative path
npm start -- -d ../documentation

# Development mode with custom path
npm run dev -- --docs-path /path/to/docs
```

#### Multiple Directory Examples
```bash
# Use multiple documentation directories
npm start -- -d /home/user/api-docs -d /home/user/guides -d /home/user/examples

# Mix API documentation and user guides
npm start -- --docs-path ./api-docs --docs-path ./user-guides

# Windows with multiple directories
npm start -- --docs-path "C:\Project\docs" --docs-path "C:\Shared\documentation"
```

#### Environment Variable Examples
```bash
# Use environment variable for documentation path
export DOCS_PATH=/home/user/project-docs
npm start

# Use environment variable with multiple directories
export DOCS_PATH="/home/user/api-docs,/home/user/guides,/home/user/examples"
npm start

# Limit table of contents headers to 20 headers maximum
MAX_HEADERS=20 npm start
```

#### Max TOC Depth Examples
```bash
# Limit table of contents to only level-1 and level-2 headers
npm start -- --max-toc-depth 2

# Combine with documentation path
npm start -- --docs-path ./docs --max-toc-depth 3

# Use environment variable for max toc depth
MAX_TOC_DEPTH=2 npm start

# Use both CLI and environment variables (CLI takes precedence)
MAX_TOC_DEPTH=2 npm start -- --max-toc-depth 4  # Uses 4 from CLI

# Combine max-toc-depth and max-headers
npm start -- --docs-path ./docs --max-toc-depth 3 --max-headers 20
# Result: Headers limited to levels 1-3, then limited to 20 total headers
```

#### Max Headers Examples
```bash
# Limit table of contents to 15 headers
npm start -- --max-headers 15

# Combine with documentation path
npm start -- --docs-path ./docs --max-headers 20

# Use environment variable for max headers
MAX_HEADERS=30 npm start

# Use both CLI and environment variables (CLI takes precedence)
MAX_HEADERS=10 npm start -- --max-headers 25  # Uses 25 from CLI
```

## Available Tools

The server provides five tools for working with documentation:

### list_documentation_files
Lists all available documentation files with metadata including file size, modification time, and front matter information.
No parameters required.

### table_of_contents
Provides a structured table of contents for a markdown file, showing section hierarchy with IDs.

**Parameters:**
- `filename` (required) - The documentation file to analyze

**Configuration Options:**

The table of contents tool behavior is controlled by two server-wide configuration options:

1. **Max TOC Depth** - Limits the maximum header level to include:
   - `--max-toc-depth <number>` (CLI) or `MAX_TOC_DEPTH` (environment variable)
   - **Default**: 3 (includes `#`, `##`, and `###` headers)
   - **Values**:
     - `1` - Only `#` headers
     - `2` - `#` and `##` headers
     - `3` - `#`, `##`, and `###` headers (default)
     - `4` - Up to `####` headers
     - And so on...

2. **Max Headers** - Limits the total number of headers to include:
   - `--max-headers <number>` (CLI) or `MAX_HEADERS` (environment variable)
   - **Default**: 25 headers
   - **Behavior**: When a document exceeds this limit, the tool progressively includes header levels (starting with level-1) until adding another level would exceed the limit
   - **Level-1 preservation**: Top-level headers (`#`) are always included to preserve document structure, even if they exceed the limit

**How They Interact:**
1. First, max-toc-depth filtering is applied (removes headers deeper than the configured depth)
2. Then, max-headers limiting is applied (selects the most important headers within the limit)

**Examples:**

```bash
# Set max toc depth to 2 (only # and ## headers)
npm start -- --max-toc-depth 2

# Set max headers to 20 total
npm start -- --max-headers 20

# Combine both settings
npm start -- --docs-path ./docs --max-toc-depth 3 --max-headers 20
# Result: Shows headers up to ### level, limited to 20 total headers

# Use environment variables
MAX_TOC_DEPTH=2 MAX_HEADERS=15 npm start

# CLI takes precedence over environment
MAX_TOC_DEPTH=2 npm start -- --max-toc-depth 4  # Uses 4 from CLI
```

### section_table_of_contents
Provides a structured table of contents for subsections within specified parent sections. Unlike `table_of_contents` which starts from the file root, this tool returns only the direct children of the specified section IDs.

**Parameters:**
- `filename` (required) - The documentation file to analyze
- `section_ids` (required) - Non-empty array of section identifiers to get subsections for

**Configuration Options:**

Only the **Max Headers** option is respected for this tool:
- `--max-headers <number>` (CLI) or `MAX_HEADERS` (environment variable)
- **Default**: 25 headers
- **Note**: The `max-toc-depth` setting is NOT applied to this tool (all subsection levels are returned)

**Examples:**

```bash
# Get subsections of section "1" (direct children only, no grandchildren)
# Usage via Claude with parameters: {"filename": "guide.md", "section_ids": ["1"]}

# Get subsections from multiple parent sections
# Usage: {"filename": "guide.md", "section_ids": ["1", "2"]}

# Get subsections with max headers limit
npm start -- --docs-path ./docs --max-headers 10
# Usage: {"filename": "guide.md", "section_ids": ["1"]}
```

**Workflow Example:**

1. Use `table_of_contents` to see all sections and get section IDs
2. Pick one or more section IDs to explore further
3. Use `section_table_of_contents` to get only the direct children of those sections
4. Use `read_sections` to read the full content of specific children

**Key Differences from table_of_contents:**

| Feature | table_of_contents | section_table_of_contents |
|---------|-------------------|---------------------------|
| **Starting point** | Document root (all level-1 headers) | Specified parent sections |
| **Returns** | All descendants (hierarchy) | Only direct children (flat) |
| **max-toc-depth** | Applied ✓ | NOT applied ✗ |
| **max-headers** | Applied ✓ | Applied ✓ |
| **Use case** | Get overall structure | Explore specific section subtree |

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

**Regular Expression Features:**
- **Case-insensitive matching**: Patterns automatically ignore case
- **Multiline matching**: `.` matches newlines (dotAll flag enabled)
- **Full regex syntax**: Supports character classes, quantifiers, alternation, groups, etc.
- **Backward compatibility**: Simple text strings work as exact matches

**Error Handling:**
Invalid regular expressions will return an `INVALID_PARAMETER` error with a descriptive message.


## Configuration Precedence

Documentation paths are resolved in this order (highest to lowest priority):

1. **Command Line Arguments**: All `--docs-path` or `-d` arguments are processed in the order specified
2. **Environment Variables**: The `DOCS_PATH` environment variable (comma-separated paths are processed in order)
3. **Default Values**: The `./docs` folder in the project root

**Multi-Directory Resolution**: When multiple paths are specified at the same precedence level (e.g., multiple command line arguments), they are processed in the order they appear. The first directory containing a file with a given name takes precedence over later directories.

**Example**: If both `/docs/api` and `/docs/user-guide` contain `reference.md`, using `-d /docs/api -d /docs/user-guide` will make only `/docs/api/reference.md` available to the tools.

## Error Handling

The server provides structured error responses with these error codes:
- `INVALID_PARAMETER` - Missing or invalid parameters
- `FILE_NOT_FOUND` - Requested file doesn't exist
- `FILE_TOO_LARGE` - File exceeds size limits
- `PARSE_ERROR` - Error parsing markdown or metadata
- `UNKNOWN_TOOL` - Tool name not recognized
- `INTERNAL_ERROR` - General server errors

## Troubleshooting

### Multi-Directory Configuration Issues

**Files Not Found**: If files are not showing up in `list_documentation_files`:
1. Verify all directory paths exist and are accessible
2. Check directory order - files in earlier directories override files with the same name in later directories
3. Ensure paths are correctly escaped, especially on Windows (use quotes for paths with spaces)

**Unexpected File Content**: If you're seeing content from the wrong file:
1. Check if multiple directories contain files with the same name
2. Reorder your directory arguments to prioritize the correct source
3. Use unique filenames across directories when possible

**Permission Errors**:
1. Ensure the server process has read access to all specified directories
2. On Unix systems, check directory permissions with `ls -la`
3. On Windows, verify file/folder permissions in Properties → Security

**Common Command Line Mistakes**:
```bash
# ❌ Wrong - missing flags for additional directories
npm start -- --docs-path /docs1 /docs2  # /docs2 will be ignored

# ✅ Correct - each directory needs its own flag
npm start -- --docs-path /docs1 --docs-path /docs2

# ❌ Wrong - spaces in comma-separated env var
export DOCS_PATH="/docs1, /docs2"  # Will treat as part of path

# ✅ Correct - no spaces around commas
export DOCS_PATH="/docs1,/docs2"
```

### Getting Help

Use the help command to see all available options:
```bash
npm start -- --help
```

The help command will display all configuration options including multi-directory support examples.
