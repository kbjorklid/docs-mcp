# Multi-Directory Support Implementation Plan

## Overview
Transform the single-path configuration (`documentationPath: string`) to support multiple directories (`documentationPaths: string[]`) with conflict resolution where earlier directories take precedence.

## Current Architecture Context
The project uses a **provider-based configuration system**:
- **ConfigurationManager**: Main orchestrator that merges configuration from multiple providers
- **Providers**: CommandLineProvider (priority 100), EnvironmentProvider (priority 50), DefaultProvider (priority 0)
- **Deprecated**: ArgumentParser.ts is marked as deprecated and should be removed
- **Test Structure**: E2E tests use isolated directories per test case via E2ETestHelper


### Step 1: Update Type Definitions
- **File**: `src/types.ts`
- **Changes**:
  - Add `documentationPaths: string[]` to `Configuration` interface
  - Keep `documentationPath: string` for backward compatibility during transition (but remove later)
  - Update `ParsedCommandLineArgs` to support `docsPaths?: string[]` (array support)
  - Update `DEFAULT_CONFIG` to use array format `['./docs']`
- **Run tests before moving to next step**

### Step 2: Update CommandLineProvider for Multiple Arguments
- **File**: `src/config/providers/CommandLineProvider.ts`
- **Changes**:
  - Modify `parseCommandLineArgs()` to collect multiple `-d/--docs-path` values
  - Update `ParsedCommandLineArgs` interface to use `docsPaths?: string[]`
  - Return array of paths in `ParsedCommandLineArgs.docsPaths`
  - Maintain order of arguments for precedence
  - Update `load()` method to handle array values
- **Note**: This replaces the old Step 2 that targeted the deprecated ArgumentParser
- **Run tests before moving to next step**

### Step 3: Update EnvironmentProvider for Comma-Separated Paths
- **File**: `src/config/providers/EnvironmentProvider.ts`
- **Changes**:
  - Add support for comma-separated paths in `DOCS_PATH` environment variable
  - Parse single paths as arrays with one element
  - Maintain precedence with other providers
- **Run tests before moving to next step**


### Step 4: Create Multi-Directory File Discovery Service
- **New File**: `src/services/FileDiscoveryService.ts`
- **Purpose**: Aggregate files from multiple directories with conflict resolution
- **Features**:
  - Scan all configured directories for `.md` files
  - Implement conflict resolution (first directory wins for duplicate filenames)
  - Provide unified file list with metadata
  - Track source directory for each file
  - Resolve file paths across multiple directories for tools
- **Run tests before moving to next step**

### Step 5: Refactor ListDocumentationFiles Tool
- **File**: `src/tools/ListDocumentationFiles.ts`
- **Changes**:
  - Replace direct glob calls with `FileDiscoveryService`
  - Update to work with aggregated file list from multiple directories
  - Ensure conflict resolution is applied

### Step 6: Update Path Resolution in All Tools
- **Files**: `src/tools/*.ts`
- **Changes**:
  - Update `TableOfContents.ts` to resolve file paths across multiple directories
  - Update `ReadSections.ts` to find files in any configured directory
  - Update `Search.ts` to search across all directories
  - Ensure all tools use the new file discovery service for path resolution

### Step 7: Enhance Configuration Manager
- **File**: `src/config/ConfigManager.ts`
- **Changes**:
  - Update `validateAndNormalize()` to handle array conversion from single paths
  - Ensure backward compatibility during transition
  - Update validation for multiple paths
  - Handle migration from `documentationPath` to `documentationPaths`

### Step 8: Create Multi-Directory Test Fixtures
- **Directory**: `src/__tests__/fixtures/e2e/MultiDirectory/` (note: using test class name pattern)
- **Structure** (using isolated test directory pattern):
  ```
  MultiDirectory/
  ├── should-handle-multiple-directories-with-unique-files/
  │   ├── dir1/
  │   │   └── unique-file-dir1.md
  │   └── dir2/
  │       └── unique-file-dir2.md
  ├── should-resolve-filename-conflicts-correctly/
  │   ├── dir1/
  │   │   └── shared-file.md (wins conflict)
  │   └── dir2/
  │       └── shared-file.md (loses conflict)
  ├── should-handle-empty-directories-gracefully/
  │   ├── dir1/
  │   │   └── content.md
  │   └── empty-dir/
  └── should-handle-single-directory-compatibility/
      └── single-dir/
          └── normal-file.md
  ```

### Step 9: Update End-to-End Tests
- **Files**: All `*.e2e.test.ts` files
- **Changes**:
  - Add tests for single directory (baseline compatibility)
  - Add tests for multiple directories with unique files
  - Add tests for conflict resolution scenarios
  - Add tests for edge cases (empty directories, invalid paths)
  - Use `E2ETestHelper` with isolated directory structure
- **Run tests before moving to next step**

### Step 10: Update Configuration Tests
- **File**: `src/__tests__/CLIConfiguration.e2e.test.ts`
- **Changes**:
  - Test multiple `-d` flag parsing
  - Test environment variable with multiple paths
  - Test mixed configuration scenarios
  - Test provider precedence with arrays
- **Run tests before moving to next step**

### Step 11: Update Main Server Integration
- **File**: `src/index.ts`
- **Changes**: Ensure tools work with new configuration (should be minimal)

### Step 12: Remove Legacy Code
- **Files**: `src/types.ts` and `src/config/ArgumentParser.ts`
- **Changes**:
  - Remove deprecated `documentationPath` and related aliases from types
  - Remove deprecated `ArgumentParser.ts` file
- **Run tests before moving to next step**

### Step 13: Full Test Suite Validation
- **Action**: Run complete test suite to ensure no regressions
- **Coverage**: Verify all tools work correctly with new multi-directory support

## Implementation Notes

### Conflict Resolution Strategy
- Process directories in the order specified
- For files with identical names, keep the first occurrence
- Skip subsequent files with the same filename
- Log conflicts for debugging (optional)

### Backward Compatibility
- Single `-d` flag works exactly as before (internal conversion to array format)
- Provider precedence system remains unchanged
- No breaking changes to tool interfaces
- Configuration migration handled transparently in `ConfigManager.validateAndNormalize()`

### Error Handling
- Validate all directories exist during configuration in providers
- Handle permission errors gracefully
- Provide clear error messages for invalid paths
- Fail fast if no valid directories found
- Maintain existing error response formats for MCP protocol

### Provider Integration Notes
- All providers must handle both single paths (convert to arrays) and arrays
- `CommandLineProvider` collects multiple `-d` flags maintaining order
- `EnvironmentProvider` splits comma-separated paths
- `DefaultProvider` provides array of default paths
- `ConfigurationManager` merges arrays maintaining precedence order