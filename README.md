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

# Combine both options
npm start -- --docs-path /home/user/project-docs --max-toc-depth 3

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

### Advanced Examples

```bash
# Limit table of contents depth for large documents
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"comprehensive-guide.md","max_depth":2}}}' | npm start -- --docs-path /path/to/your/docs

# Use environment variable for persistent configuration
export DOCS_PATH=/home/user/my-docs
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start
```

### PowerShell Integration

```powershell
# Start server in background
Start-Job -ScriptBlock { npm start -- --docs-path "C:\Docs" } -Name "MCPServer"

# Use the server
$tools = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start
$files = '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start -- --docs-path "C:\Docs"
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

**Precedence:** Tool parameter `max_depth` overrides command line `--max-toc-depth` setting.

### read_sections
Reads specific sections from a markdown file by their IDs.

**Parameters:**
- `filename` (required) - The documentation file to read from
- `section_ids` (required) - Array of section identifiers to read

## Testing the Server

You can verify the server is working by sending JSON-RPC messages:

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start

# List documentation files (with your docs path)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start -- --docs-path /path/to/your/docs

# Get table of contents with max depth 2
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"example.md","max_depth":2}}}' | npm start -- --docs-path /path/to/your/docs

# Get table of contents with unlimited depth
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"example.md"}}}' | npm start -- --docs-path /path/to/your/docs

# Read specific sections
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"read_sections","arguments":{"filename":"example.md","section_ids":["section-id","another-section"]}}}' | npm start -- --docs-path /path/to/your/docs
```

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

## License

ISC
