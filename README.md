# Documentation MCP Server

A Model Context Protocol (MCP) server that provides tools for reading and navigating markdown-based documentation repositories.

## Features

- **List Documentation Files**: Discover and browse available documentation files with metadata
- **Table of Contents**: Generate structured table of contents with configurable depth and header limit control
- **Read Sections**: Read specific sections of documentation by their IDs
- **Search**: Find text patterns using regular expressions across documentation files with multiline matching support
- **Multi-Directory Support**: Configure multiple documentation directories with conflict resolution
- **Configurable Max Depth**: Limit table of contents depth for better navigation
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
- `--max-headers <number>` - Maximum number of headers to include in table of contents (default: 25)
- `--pretty-print` - Enable JSON pretty-printing for tool responses (useful for debugging and readability; default: disabled for token efficiency)
- `--help` or `-h` - Show help information

### JSON Output Format

By default, the server returns JSON output in compact format to minimize token usage. This compact format is suitable for programmatic consumption by AI agents and clients.

#### Compact Format (Default)
```bash
npm start -- --docs-path ./docs
# Returns: {"filename":"readme.md","title":"ReadMe","keywords":[],"size":"2.5kb"}
```

#### Pretty-Printed Format
Use the `--pretty-print` flag to enable indented, human-readable JSON output for debugging and exploration:

```bash
npm start -- --docs-path ./docs --pretty-print
# Returns:
# {
#   "filename": "readme.md",
#   "title": "ReadMe",
#   "keywords": [],
#   "size": "2.5kb"
# }
```

**Token Savings**: Compact format saves approximately 20% on response size compared to pretty-printed output, which can result in significant token savings across multiple API calls.

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

The server provides four tools for working with documentation:

### list_documentation_files
Lists all available documentation files with metadata including file size, modification time, and front matter information.
No parameters required.

### table_of_contents
Provides a structured table of contents for a markdown file, showing section hierarchy with IDs.

**Parameters:**
- `filename` (required) - The documentation file to analyze
- `max_depth` (optional) - Maximum header depth to include (0 = disabled/unlimited)

**Max Depth Values:**
- `1` - Only `#` headers
- `2` - `#` and `##` headers
- `3` - `#`, `##`, and `###` headers
- `0` - Disabled (returns all sections)
- Not specified - Returns all sections (unlimited)

**Configuration:**
- `--max-headers <number>` (CLI) or `MAX_HEADERS` (environment) - Limits the total number of headers returned
- **Default**: 25 headers
- **Behavior**: When enabled, progressively includes header levels (starting with level-1) until adding another level would exceed the limit
- **Level-1 preservation**: Top-level headers (`#`) are always included to preserve document structure, even if they exceed the limit

**Example with max_headers:**
```bash
# Set server limit to 20 total headers
npm start -- --max-headers 20

# Now when querying a 50-header document, only up to 20 headers are returned
# (all level-1 headers + as many deeper levels as fit within the 20-header limit)
```

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
