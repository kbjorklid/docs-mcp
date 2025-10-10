# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides documentation reading and navigation tools for markdown-based documentation repositories. The server follows MCP standards and communicates via stdio transport.

## Features

The server implements three core tools for documentation management:

1. **list_documentation_files** - Lists all available documentation files with metadata
2. **table_of_contents** - Provides structured table of contents for markdown files
3. **read_sections** - Reads specific sections from markdown files

## Configuration

The server uses environment variables and default configuration:

- `DOCS_PATH` - Root directory containing markdown files (default: "./docs")
- Supports YAML front matter parsing for metadata
- Configurable file size limits (default: 10MB) and exclusion patterns
- Glob-based file discovery with include/exclude patterns
- Auto-indexing with configurable refresh intervals

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in the `dist/` directory
- `npm run dev` - Run the server in development mode using tsx (no build step)
- `npm start` - Run the compiled server from `dist/index.js`

### PowerShell Scripts
- `.\run.ps1` - Build and run the server in production mode
- `.\run.ps1 -Development` - Run in development mode (no build)
- `.\run.ps1 -Clean` - Clean build directory before running
- `.\run.ps1 -Help` - Show help information

Note: The script refers to "Hello World MCP Server" in comments but this is actually the Documentation MCP Server.

### Testing the Server
Test the MCP server by sending JSON-RPC messages via stdin:

List tools:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start
```

List documentation files:
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start
```

Get table of contents:
```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"your-file.md"}}}' | npm start
```

Read specific sections:
```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_sections","arguments":{"filename":"your-file.md","section_ids":["section-id"]}}' | npm start
```

## Architecture

### Core Structure
- **src/index.ts** - Main MCP server implementation with tool registration and request handling
- **src/types.ts** - TypeScript interfaces and default configuration
- **src/MarkdownParser.ts** - Core markdown parsing and front matter extraction
- **src/tools/** - Individual tool implementations:
  - **ListDocumentationFiles.ts** - File discovery and metadata extraction
  - **TableOfContents.ts** - Section hierarchy parsing
  - **ReadSections.ts** - Selective content reading
- **MCP SDK** - Uses `@modelcontextprotocol/sdk` for server infrastructure and stdio transport
- **TypeScript Configuration** - Targets ES2020 with CommonJS modules

### MCP Server Pattern
The server follows the standard MCP pattern:
1. Creates a Server instance with capabilities (tools)
2. Registers request handlers for `ListToolsRequestSchema` and `CallToolRequestSchema`
3. Connects via StdioServerTransport for JSON-RPC communication
4. Handles tool execution with parameter validation

### Tool Implementation
Tools are implemented as:
1. Tool definition in the `ListToolsRequestSchema` handler (name, description, inputSchema)
2. Execution logic in the `CallToolRequestSchema` handler (case statement)
3. Individual tool classes in `src/tools/` with `execute()` methods

## Adding New Tools

To add a new tool:

1. Add tool definition to the tools array in the `ListToolsRequestSchema` handler
2. Add a new case in the `CallToolRequestSchema` handler
3. Implement the tool logic and return structured content

Example tool structure:
```typescript
{
  name: "my_tool",
  description: "Description of my tool",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Parameter description" }
    },
    required: ["param1"]
  }
}
```

## Dependencies

### Production Dependencies
- **@modelcontextprotocol/sdk** - Core MCP server functionality
- **js-yaml** - YAML front matter parsing
- **glob** - File pattern matching
- **tsx** - TypeScript execution for development
- **typescript** - TypeScript compiler with strict mode enabled

### Development Dependencies
- **jest** - Testing framework
- **@types/jest** - TypeScript types for Jest
- **ts-jest** - Jest preset for TypeScript
- **@types/js-yaml** - TypeScript types for js-yaml
- **@types/node** - TypeScript types for Node.js

## Binary Distribution

The package includes a binary entry point:
- `docs-mcp` command points to `dist/index.js`

## Error Handling

The server implements comprehensive error handling with structured error responses:

- **FILE_NOT_FOUND** - Requested file doesn't exist
- **INVALID_SECTION_ID** - Section identifier is malformed
- **SECTION_NOT_FOUND** - Requested section doesn't exist
- **FILE_TOO_LARGE** - File exceeds size limits
- **PARSE_ERROR** - Error parsing markdown or metadata
- **FILE_SYSTEM_ERROR** - Error accessing documentation files
- **UNKNOWN_TOOL** - Tool name not recognized
- **INTERNAL_ERROR** - General internal server error

All errors follow the JSON format specified in SPECIFICATION.md.

## Recent Changes

### Testing Implementation (Added 2025-10-10)
- Comprehensive test suite added for all three tools with 29 tests
- Jest framework configured with TypeScript support
- Test coverage achieved: ~96% for tools folder
- Test files created:
  - `src/__tests__/ListDocumentationFiles.test.ts` - 12 tests
  - `src/__tests__/TableOfContents.test.ts` - 8 tests  
  - `src/__tests__/ReadSections.test.ts` - 9 tests
- Test fixtures added for consistent testing scenarios
- Proper mocking implemented for all external dependencies

### Import Path Corrections
- Fixed incorrect `.js` extensions in TypeScript imports
- Updated source files to use proper TypeScript import conventions
- Configured Jest to handle TypeScript module resolution correctly

## Development Notes

### File Structure
- Tool classes use dependency injection with `DocumentationConfig`
- Markdown parsing supports ATX-style headers (`#`, `##`, etc.) but not Setext-style headers
- Section IDs are generated using path-based conventions (lowercase, hyphens, forward slashes)
- File size is displayed with 'kb' or 'b' suffixes for readability

### TypeScript Import Conventions
- **Source Files**: Use relative imports without file extensions for TypeScript modules (e.g., `import { Config } from '../types'`)
- **Compiled Output**: TypeScript compiles to CommonJS modules in `dist/` directory
- **Module Resolution**: The project uses Node.js module resolution with TypeScript's `moduleResolution: "node"`
- **CommonJS Target**: Output uses CommonJS modules (`"module": "commonjs"` in tsconfig.json)

### Common Pitfalls
- **Import Extensions**: Do not use `.js` extensions when importing TypeScript modules within the source code
- **Test Imports**: In test files, import TypeScript modules directly without extensions
- **Jest Configuration**: Jest requires special configuration to handle TypeScript module resolution correctly
- **Mocking**: When mocking modules, mock the actual TypeScript module, not the compiled JavaScript version

### Testing
The project uses Jest for testing with TypeScript support. Test configuration is in `jest.config.js`.

#### Test Commands
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

#### Test Structure
- Tests are located in `src/__tests__/`
- Test fixtures are in `src/__tests__/fixtures/`
- Each tool has its own test file: `ListDocumentationFiles.test.ts`, `TableOfContents.test.ts`, `ReadSections.test.ts`

#### Important Notes for Testing
- **Import Paths**: Use `.ts` extensions when importing TypeScript modules in tests (not `.js`)
- **Mocking**: Mock dependencies like `MarkdownParser` and `glob` using Jest's mock functionality
- **Module Resolution**: Jest is configured to handle TypeScript module resolution correctly
- **Coverage**: Current test coverage is ~96% for the tools folder

#### Example Test Structure
```typescript
import { ToolName } from '../tools/ToolName';
import { DocumentationConfig } from '../types';
import { MarkdownParser } from '../MarkdownParser';

// Mock dependencies
jest.mock('../MarkdownParser');
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;
```

### Environment Variables
- `DOCS_PATH` - Override default documentation directory
- Configuration can be extended through the `DocumentationConfig` interface in `types.ts`

## Testing Best Practices

### When Adding New Tests
1. **Mock External Dependencies**: Always mock `MarkdownParser`, `glob`, and file system operations
2. **Test Error Cases**: Include tests for all error conditions (file not found, invalid parameters, etc.)
3. **Parameter Validation**: Test all input validation scenarios
4. **Edge Cases**: Test empty arrays, null values, and malformed inputs
5. **Coverage**: Aim for high test coverage (>90%) for tool implementations

### Test File Naming
- Use `.test.ts` extension for test files
- Match test file names to source files (e.g., `ToolName.test.ts` for `ToolName.ts`)
- Place tests in `src/__tests__/` directory

### Mock Patterns
```typescript
// Mock MarkdownParser static methods
jest.mock('../MarkdownParser');
const mockMarkdownParser = MarkdownParser as jest.Mocked<typeof MarkdownParser>;

// Setup mock return values
mockMarkdownParser.validateFile.mockReturnValue({
  valid: true,
  stats: { size: 1024 } as fs.Stats
});
```