# CLAUDE.md

This file provides guidance to AI agents working with code in this repository.

## README.md Scope

**README.md should only contain user-facing documentation** - information that users of the MCP server need to install, configure, and use the server.

**DO NOT add to README.md:**
- Internal architecture details
- Development commands and testing procedures
- Implementation details

**INCLUDE in README.md:**
- Installation instructions
- Configuration options (command line, environment variables)
- Usage examples for end users
- Available tools and their parameters
- Error codes users might encounter
- System requirements

All developer-focused information should be documented in this file (CLAUDE.md) instead.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides documentation reading and navigation tools for markdown-based documentation repositories. The server follows MCP standards and communicates via stdio transport.

### Features

The server implements four core tools for documentation management:

1. **list_documentation_files** - Lists all available documentation files with metadata
2. **table_of_contents** - Provides structured table of contents for markdown files
3. **read_sections** - Reads specific sections from markdown files
4. **search** - Searches for text patterns across documentation files using regular expressions

## Development Commands

### Build and Run

- `npm run build` - Compile TypeScript to JavaScript in the `dist/` directory
- `npm run dev` - Run the server in development mode using tsx (no build step)
- `npm start` - Run the compiled server from `dist/index.js`

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Important: Run TypeScript compilation first
npx tsc
```

### PowerShell Scripts

- `.\run.ps1` - Build and run the server in production mode
- `.\run.ps1 -Development` - Run in development mode (no build)
- `.\run.ps1 -Clean` - Clean build directory before running
- `.\run.ps1 -Help` - Show help information

Note: The script refers to "Hello World MCP Server" in comments but this is actually the Documentation MCP Server.

### Server Testing

Test the MCP server by sending JSON-RPC messages via stdin:

```bash
# List tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start

# List documentation files
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_documentation_files","arguments":{}}}' | npm start

# Get table of contents
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"table_of_contents","arguments":{"filename":"your-file.md"}}}' | npm start

# Read specific sections
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_sections","arguments":{"filename":"your-file.md","section_ids":["section-id"]}}}' | npm start

# Search for content
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"search","arguments":{"query":"search pattern","filename":"your-file.md"}}}' | npm start
```

## Configuration

The server supports multiple ways to configure the documentation path with the following precedence:

1. **Command line arguments** (highest precedence)
2. **Environment variables**
3. **Default values** (lowest precedence)

### Documentation Path Configuration

- **Command line**: `--docs-path` or `-d` followed by the path
  ```bash
  npm start -- --docs-path /path/to/docs
  npm start -- -d /path/to/docs
  ```
- **Environment variable**: `DOCS_PATH`
  ```bash
  DOCS_PATH=/path/to/docs npm start
  ```
- **Default**: `"./docs"` folder in project root

### Other Configuration

- Supports YAML front matter parsing for metadata
- Configurable file size limits (default: 10MB) and exclusion patterns
- Glob-based file discovery with include/exclude patterns
- Auto-indexing with configurable refresh intervals

## Architecture

### Core Structure

- **src/index.ts** - Main MCP server implementation with tool registration and request handling
- **src/types.ts** - TypeScript interfaces and default configuration
- **src/MarkdownParser.ts** - Core markdown parsing and front matter extraction
- **src/tools/** - Individual tool implementations:
  - **ListDocumentationFiles.ts** - File discovery and metadata extraction
  - **TableOfContents.ts** - Section hierarchy parsing
  - **ReadSections.ts** - Selective content reading
  - **Search.ts** - Text pattern search with regular expression support

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

## Testing

### Overview

The project uses Jest for testing with TypeScript support. Test configuration is in `jest.config.js`.

**Test Strategy**: End-to-end black-box testing is the primary approach. The bulk of tests (70+%) are e2e tests that exercise the actual MCP server process through JSON-RPC protocol communication. Only edge cases, error conditions, and scenarios that are impractical to test via the full server process are tested with unit/integration tests.

**Test Coverage**: ~95% overall with 283 tests, including comprehensive e2e coverage for all 4 MCP tools.

ALWAYS after any code, test, or test data modification, RUN ALL TESTS to make sure nothing is broken.

### Test Structure

- Tests are located in `src/__tests__/`
- **End-to-End Tests** (Primary testing approach - 85% of tests):
  - `ListDocumentationFiles.e2e.test.ts` - Black-box e2e tests for file listing tool
  - `TableOfContents.e2e.test.ts` - Black-box e2e tests for TOC tool (14 tests)
  - `ReadSections.e2e.test.ts` - Black-box e2e tests for section reading tool (19 tests)
  - `Search.e2e.test.ts` - Black-box e2e tests for search tool (29 tests, including advanced patterns)
  - `CLIConfiguration.e2e.test.ts` - Black-box e2e tests for CLI argument handling
  - `ToolIntegration.e2e.test.ts` - Black-box e2e tests for complete workflow scenarios
- **Unit/Integration Tests** (Secondary - for edge cases only - 15% of tests):
  - `MarkdownParser.test.ts` - Core parsing logic tests (performance-critical component)
  - `command-line-args.test.ts` - CLI configuration and environment variable handling
  - `ConfigIntegration.test.ts` - Complex configuration integration scenarios
  - `ListDocumentationFiles.test.ts` - Edge cases not covered by e2e tests
  - `types.test.ts` - TypeScript configuration and DEFAULT_CONFIG
  - `index.test.ts` - Basic module import tests

### End-to-End Test Architecture

#### Black-Box Testing Approach
E2E tests follow a true black-box methodology:
- **Real Server Process**: Spawns actual MCP server using `child_process.spawn()`
- **JSON-RPC Protocol**: Communicates via stdin/stdout using the actual MCP protocol
- **No Internal Imports**: Tests only through the public server API
- **Real File System**: Uses actual markdown files from dedicated e2e fixtures
- **Complete Request Lifecycle**: Tests initialization, tool execution, and cleanup

#### E2E Test Fixtures
Located in `src/__tests__/fixtures/e2e/`:
- **list-documentations/** - Files for testing file discovery and metadata:
  - `user-guide.md` - Basic user documentation
  - `api-reference.md` - Documentation with YAML front matter
  - `README.md` - Simple documentation file
- **table-of-contents/** - Files for testing TOC generation:
  - `simple-headers.md` - Basic header structure
  - `complex-nested.md` - Deep nested hierarchy
  - `with-front-matter.md` - Document with metadata
  - `no-headers.md` - Edge case with no headers
  - `single-header.md` - Minimal content
  - `special-characters.md` - Headers with symbols
- **read-sections/** - Files for testing section content extraction:
  - `complex-guide.md` - Comprehensive nested documentation
  - `api-docs.md` - Technical API documentation
  - `edge-cases.md` - Unicode and special characters
- **search/** - Files for testing search functionality:
  - `api-documentation.md` - REST API content
  - `user-guide.md` - General user documentation
  - `technical-specs.md` - Technical specifications
  - `code-examples.md` - Multi-language code snippets
  - `special-characters.md` - International and special content

#### E2E Test Coverage
Each tool's e2e tests cover:
- **Happy Path Scenarios** - Normal usage patterns
- **Tool Availability** - Verification via `tools/list`
- **Parameter Validation** - Required and optional parameters
- **Error Handling** - File not found, invalid inputs, malformed requests
- **Edge Cases** - Empty files, special characters, large content
- **Integration Scenarios** - Real-world usage patterns

### TypeScript Import Rules

- **Source Files**: Use relative imports without file extensions (e.g., `import { Config } from '../types'`)
- **Test Files**: Import TypeScript modules directly without extensions
- **Jest Configuration**: Configured to handle TypeScript module resolution correctly

### Testing Best Practices

#### End-to-End Tests (Primary)
1. **Black-Box Approach**: Never import internal modules, test only through JSON-RPC protocol
2. **Real Server Process**: Always spawn actual MCP server process for each test
3. **Dedicated Fixtures**: Use separate e2e fixtures, don't share with unit tests
4. **Complete Lifecycle**: Test server initialization, tool execution, and cleanup
5. **Real File System**: Use actual markdown files and file system operations
6. **Error Response Testing**: Validate JSON-RPC error responses, not exceptions

#### Unit Tests (Secondary - Edge Cases Only)
1. **Mock External Dependencies**: Only for edge cases that can't be tested via e2e
2. **Parameter Validation**: Test input validation scenarios that are impractical via full server
3. **Business Logic**: Test complex configuration combinations and edge case logic
4. **Performance Edge Cases**: Test scenarios that would be too slow in e2e (large data, etc.)

### Test File Naming

- **E2E Tests**: Use `.e2e.test.ts` extension (e.g., `ToolName.e2e.test.ts`)
- **Unit Tests**: Use `.test.ts` extension (e.g., `ToolName.test.ts`)
- Place all tests in `src/__tests__/` directory
- E2E fixtures go in `src/__tests__/fixtures/e2e/tool-name/`

### E2E Test Pattern

```typescript
// Standard e2e test structure
describe('ToolName E2E Tests', () => {
  let serverProcess: ChildProcess;
  const testDocsPath = join(__dirname, 'fixtures', 'e2e', 'tool-name');

  beforeAll(async () => {
    // Spawn actual MCP server
    serverProcess = spawn('node', [join(__dirname, '..', '..', 'dist', 'index.js'), '--docs-path', testDocsPath]);
    // Initialize server
  });

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) serverProcess.kill();
  });

  async function sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    // JSON-RPC communication logic
  }

  describe('tool_name tool', () => {
    it('should test functionality via real MCP server', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'tool_name', arguments: { /* params */ } }
      };
      const response = await sendRequest(request);
      // Validate real server response
    });
  });
});
```

### Unit Test Pattern (When Needed)

```typescript
// Only for edge cases that can't be tested via e2e
describe('ToolName Unit Tests', () => {
  describe('Parameter Validation', () => {
    it('should handle edge case inputs', () => {
      // Test specific edge cases
    });
  });

  describe('Business Logic', () => {
    it('should handle complex configuration', () => {
      // Test business logic that's hard to test via e2e
    });
  });
});
```

## Development Notes

### File Structure

- Tool classes use dependency injection with `DocumentationConfig`
- Markdown parsing supports ATX-style headers (`#`, `##`, etc.) but not Setext-style headers
- Section IDs are generated using path-based conventions (lowercase, hyphens, forward slashes)
- File size is displayed with 'kb' or 'b' suffixes for readability

### TypeScript Configuration

- **Module Resolution**: Node.js module resolution with `moduleResolution: "node"`
- **Target**: ES2020 with CommonJS modules
- **Compiled Output**: TypeScript compiles to CommonJS modules in `dist/` directory

### Common Pitfalls

- **Import Extensions**: Do not use `.js` extensions when importing TypeScript modules within source code
- **Module Resolution**: Jest requires special configuration for TypeScript module resolution
- **Mocking**: Mock the actual TypeScript module, not the compiled JavaScript version

### Environment Variables

- `DOCS_PATH` - Override default documentation directory
- Configuration can be extended through the `DocumentationConfig` interface in `types.ts`

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

## Binary Distribution

The package includes a binary entry point:

- `docs-mcp` command points to `dist/index.js`

