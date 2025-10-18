# Multi-Directory Support Enhancement

## Objective
Extend the documentation MCP server to support multiple documentation directories instead of a single directory.

## Current Implementation
- **Configuration**: Single directory path in `Configuration.documentationPath: string`
- **Command Line**: `-d mydocsdir` or `--docs-path mydocsdir` via `CommandLineProvider`
- **Environment**: `DOCS_PATH` environment variable via `EnvironmentProvider`
- **Configuration Architecture**: Provider-based system with `ConfigurationManager` orchestrating multiple providers
- **Internal Representation**: Single string path
- **File Discovery**: Each tool scans one directory using `glob('**/*.md', { cwd: this.config.documentationPath })`

## Target Implementation
- **Configuration**: Array of directory paths in `Configuration.documentationPaths: string[]`
- **Command Line**: `-d dir1 -d dir2` (multiple `-d` flags supported) via enhanced `CommandLineProvider`
- **Environment**: Comma-separated paths in `DOCS_PATH` environment variable via enhanced `EnvironmentProvider`
- **Configuration Architecture**: Same provider-based system with updated providers handling arrays
- **Internal Representation**: Array of directory paths with automatic single-to-array conversion
- **File Discovery**: New `FileDiscoveryService` aggregates files from all directories with conflict resolution

## Functional Requirements

### 1. Configuration Interface
- Accept multiple `-d`/`--docs-path` command line arguments
- Store directories as an array in the configuration
- Support also single directory usage (one `-d` argument should work as before). This is essentially just like other cases, the array of directories is just one item long.

### 2. File Discovery Logic
- Consider `.md` files from all specified directories
- Each tool should work with files from any directory in the array
- Preserve relative paths for file identification

### 3. Conflict Resolution Strategy
- **Rule**: When files have identical names across directories, the file in the earlier directory takes precedence
- **Implementation**: Process directories in the order specified, skip files with existing names
- **Example**: With `-d /dir1 -d /dir2`, if both contain `guide.md`, only `/dir1/guide.md` is available

## Technical Constraints

### Scope Limitations
- **DO NOT**: Add new MCP tools
- **DO NOT**: Implement migration utilities
- **DO NOT**: Add new features beyond multi-directory support
- **DO NOT**: Consider backward compatibility (application is not yet distributed)
- **DO NOT**: Add caching if it adds complexity.


### Implementation Guidelines
- **Internal Data Structure**: Always use arrays for directory storage, even with single values
- **Configuration Processing**: Convert single paths to arrays internally in `ConfigManager.validateAndNormalize()`
- **File Operations**: All tools will use the new `FileDiscoveryService` for file discovery and path resolution
- **Provider Architecture**: Update existing providers (`CommandLineProvider`, `EnvironmentProvider`) to handle arrays while maintaining precedence rules
- **Breaking changes** to tool interfaces are allowed if necessary, aim to keep the implementation clean and clear.

### Current Architecture Context
- **Provider-based configuration system** with `ConfigurationManager` as orchestrator
- **Provider precedence**: CLI args (100) > Environment (50) > Defaults (0)
- **Deprecated components**: `ArgumentParser.ts` (marked as deprecated, should be removed)
- **Test structure**: E2E tests use isolated directories per test case via `E2ETestHelper`


## Testing Requirements

### Primary Testing Strategy
- **End-to-End Black-Box Testing**: Verify functionality through MCP protocol
- **Test Scenarios**:
  - Single directory configuration (baseline)
  - Multiple directories with unique files
  - Multiple directories with conflicting filenames
  - Empty directories and edge cases
  - Command line argument parsing variations

### Test Fixtures Required
- Directory structures with overlapping filenames
- Directory structures with unique files
- Mixed content scenarios
- Edge case configurations

## Success Criteria
1. Users can specify multiple directories via repeated `-d` flags
2. Users can specify single directory via single `-d` flag
3. All MCP tools work with files from any specified directory
4. Filename conflicts are resolved according to precedence rules
5. End-to-end tests verify complete functionality
