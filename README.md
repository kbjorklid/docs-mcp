# Documentation MCP Server

A Model Context Protocol (MCP) server that provides tools for reading and navigating markdown-based documentation repositories.

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

# Use environment variable for multiple commands
export DOCS_PATH=/home/user/project-docs
npm start

# Run with relative path
npm start -- -d ../documentation

# Development mode with custom path
npm run dev -- --docs-path /path/to/docs
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
```

## License

ISC
