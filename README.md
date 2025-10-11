# Documentation MCP Server

A Model Context Protocol (MCP) server that provides tools for reading and navigating markdown-based documentation repositories.

## Features

- **List Documentation Files**: Discover and browse available documentation files with metadata
- **Table of Contents**: Generate structured table of contents with configurable depth control
- **Read Sections**: Read specific sections of documentation by their IDs
- **Configurable Max Depth**: Limit table of contents depth for better navigation
- **Multiple Path Configuration**: Support for command line, environment variables, and default paths
- **Comprehensive Error Handling**: Clear error messages and validation

## Requirements

- **Node.js**: Version 16 or higher
- **npm**: Version 7 or higher

## Installation

```bash
npm install
```

## Configuration

The server needs to know where your documentation files are located. You can configure the documentation path in several ways:

### Command Line Arguments (Recommended)

Use the `--docs-path` or `-d` flag to specify your documentation directory:

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

### Environment Variables

Set the `DOCS_PATH` environment variable:

```bash
# Linux/macOS
DOCS_PATH=/path/to/your/docs npm start

# Windows (Command Prompt)
set DOCS_PATH=C:\path\to\your\docs && npm start

# Windows (PowerShell)
$env:DOCS_PATH="C:\path\to\your\docs"; npm start
```

### Default Path

If no path is specified, the server will look for documentation in a `docs` folder in the same directory as the project.

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

- `--docs-path <path>` or `-d <path>` - Specify documentation directory
- `--max-toc-depth <number>` - Set maximum depth for table of contents (default: unlimited)
- `--discount-single-top-header` - Increase max depth by 1 for documents with single/no top-level headers
- `--help` or `-h` - Show help information

### Path Configuration Precedence

The server uses documentation paths in this order of priority:

1. Command line `--docs-path` argument (highest)
2. `DOCS_PATH` environment variable
3. Default `./docs` folder (lowest)

### Examples

```bash
# Use custom documentation path
npm start -- --docs-path /home/user/project-docs

# Limit table of contents to top 2 levels
npm start -- --max-toc-depth 2

# Enable discount for single top-level headers
npm start -- --discount-single-top-header

# Combine multiple options
npm start -- --docs-path /home/user/project-docs --max-toc-depth 2 --discount-single-top-header

# Use environment variable for multiple commands
export DOCS_PATH=/home/user/project-docs
npm start

# Run with relative path
npm start -- -d ../documentation

# Development mode with custom path
npm run dev -- --docs-path /path/to/docs
```

### Table of Contents Max Depth

The `--max-toc-depth` option controls how many header levels are included in table of contents:

- `1` - Only `#` headers (top-level sections)
- `2` - `#` and `##` headers (top-level and second-level sections)
- `3` - `#`, `##`, and `###` headers
- `0` - Disabled (returns all sections, same as not specifying)
- No value specified - Returns all sections (unlimited)

**Examples:**
```bash
# Only show top-level sections in table of contents
npm start -- --max-toc-depth 1

# Show up to 3 levels of headers
npm start -- --max-toc-depth 3

# Disable depth limiting (show all sections)
npm start -- --max-toc-depth 0
```

### Single Top Header Discount

The `--discount-single-top-header` option enhances the max depth functionality for documents with simple structure:

**When enabled, the server will:**
- Count the number of top-level (`#`) headers in the document
- If the document has **0 or 1** top-level headers: increase the effective max depth by 1
- If the document has **2 or more** top-level headers: use the max depth as specified

**This is useful for:**
- Documents that start directly with `##` sections (no main title)
- Simple documents with only one main chapter/section
- Technical notes and articles with flat structure

**Examples:**
```bash
# Enable discount for single top-level headers
npm start -- --discount-single-top-header

# Combine with max depth for optimal results
npm start -- --max-toc-depth 2 --discount-single-top-header

# Full example with custom path
npm start -- --docs-path ./docs --max-toc-depth 2 --discount-single-top-header
```

**Behavior Examples:**

1. **Document with single top header:**
   ```
   # Main Title
   ## Section 1
   ### Subsection 1.1
   ## Section 2
   ```
   - With `--max-toc-depth 2` + `--discount-single-top-header`: Shows levels 1, 2, and 3
   - With `--max-toc-depth 2` alone: Shows only levels 1 and 2

2. **Document with no top headers:**
   ```
   ## Section 1
   ### Subsection 1.1
   ## Section 2
   ```
   - With `--max-toc-depth 2` + `--discount-single-top-header`: Shows levels 2 and 3
   - With `--max-toc-depth 2` alone: Shows only level 2

3. **Document with multiple top headers:**
   ```
   # Chapter 1
   ## Section 1.1
   # Chapter 2
   ## Section 2.1
   ```
   - With `--max-toc-depth 2` + `--discount-single-top-header`: Shows levels 1 and 2 (no change)
   - With `--max-toc-depth 2` alone: Shows levels 1 and 2 (no change)

## Usage Examples

### Basic Workflow

```bash
# 1. Start the server with your documentation
npm start -- --docs-path /path/to/your/docs

# 2. List available documentation files
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start -- --docs-path /path/to/your/docs

# 3. Get table of contents for a specific file
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"user-guide.md"}}}' | npm start -- --docs-path /path/to/your/docs

# 4. Read specific sections
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_sections","arguments":{"filename":"user-guide.md","section_ids":["introduction","getting-started"]}}}' | npm start -- --docs-path /path/to/your/docs
```


## Available Tools

The server provides three tools for working with documentation:

### list_documentation_files
Lists all available documentation files with metadata including file size, modification time, and front matter information.

**Usage:** No parameters required

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

**Single Top Header Discount:** When the `--discount-single-top-header` feature is enabled and the document has only one or no top-level (`#`) headers, the effective max depth will be increased by 1.

**Precedence:** Tool parameter `max_depth` overrides command line `--max-toc-depth` setting.

### read_sections
Reads specific sections from a markdown file by their IDs.

**Parameters:**
- `filename` (required) - The documentation file to read from
- `section_ids` (required) - Array of section identifiers to read


## Configuration Precedence

Settings are applied in this order (highest to lowest priority):
1. Command line arguments
2. Environment variables
3. Default values

## Error Handling

The server provides structured error responses with these error codes:
- `INVALID_PARAMETER` - Missing or invalid parameters
- `FILE_NOT_FOUND` - Requested file doesn't exist
- `FILE_TOO_LARGE` - File exceeds size limits
- `PARSE_ERROR` - Error parsing markdown or metadata
- `UNKNOWN_TOOL` - Tool name not recognized
- `INTERNAL_ERROR` - General server errors
