# File ID Implementation Plan

## Overview

This document outlines the implementation plan for introducing a **File ID system** to replace filename-based file references in the multi-directory support.
File IDs will provide unambiguous references to files while maintaining semantic information through visible filenames.

## Problem Statement

In multi-directory setups, when two directories contain files with the same name (e.g., `README.md`), the current "first-wins" approach shadows the second file. Users cannot access shadowed files.

## Solution

Introduce a **separate file ID system** (`f1`, `f2`, `f3`, etc.) that:
- Uniquely identifies each file regardless of directory or filename
- Coexists with the filename (which agents can reason about semantically)
- Provides deterministic, consistent references across all tool calls

## Design Principles

1. **Separation of Concerns**: IDs for reference, filenames for semantics
2. **Deterministic**: Same ordering and IDs every session
3. **Session Consistency**: File IDs are generated once per session and remain static. Files changed during session require restart.
4. **Consistent**: Applied uniformly across all four tools
5. **Simple**: Linear numbering (`f1`, `f2`, `f3`) with `f` prefix to avoid confusion with section IDs

## Detailed Design

### File ID Assignment Strategy

**Ordering**: Directory-first, then alphabetical within each directory

```
Directory order from config: [/primary, /secondary, /fallback]

Process:
1. Scan /primary directory in alphabetical order (relative path, so if in subdirectory use 'subdir/filename.md' as the string to compare)
   - config.md     → f1
   - guide.md      → f2
   - README.md     → f3
   - subdir/README.md → f4

2. Scan /secondary directory in alphabetical order
   - README.md     → f5  (different from f3, even though same filename)
   - utils.md      → f6

3. Scan /fallback directory in alphabetical order
   - index.md      → f7
```

**Key properties**:
- IDs assigned sequentially as files are discovered
- Files with identical names get different IDs based on directory order
- All versions of a file are accessible (f3 and f4 both represent README.md)
- ID `f1` always refers to the same file across sessions (deterministic)
- File IDs remain static for the entire session; file system changes require restart

### Data Structures



### Tool API Changes

All four tools change to accept `fileId` instead of `filename`.

**Parameter Validation**: All tools will validate fileId format using `/^f[0-9]+$/` pattern and return an error for invalid formats.

#### 1. list_documentation_files

**Input**: No parameters (unchanged)

**Output change**:
```json
{
  "files": [
    {
      "fileId": "f1",
      "filename": "README.md",
      "title": "Main Documentation",
      "sourceDirectory": "/primary",
      "size": "2.5kb"
    },
    {
      "fileId": "f2",
      "filename": "README.md",
      "title": "Main README",
      "sourceDirectory": "/secondary",
      "size": "1.8kb"
    }
  ]
}
```

#### 2. table_of_contents

**Parameter change**:
- Old: `filename: string`
- New: `fileId: string`

**InputSchema**:
```json
{
  "type": "object",
  "properties": {
    "fileId": {
      "type": "string",
      "description": "The file ID (e.g., 'f1', 'f2') returned by list_documentation_files"
    }
  },
  "required": ["fileId"]
}
```

**Response includes**:
```json
{
  "fileId": "f1",
  "filename": "README.md",
  "toc": [...]
}
```

#### 3. read_sections

**Parameter change**:
- Old: `filename: string`
- New: `fileId: string`

**InputSchema**:
```json
{
  "type": "object",
  "properties": {
    "fileId": {
      "type": "string",
      "description": "The file ID (e.g., 'f1', 'f2') returned by list_documentation_files"
    },
    "section_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Section IDs from table_of_contents tool"
    }
  },
  "required": ["fileId", "section_ids"]
}
```

**Response includes**:
```json
{
  "fileId": "f1",
  "filename": "README.md",
  "sections": [...]
}
```

#### 4. search

**Parameter change**:
- Old: `filename: string`
- New: `fileId: string` (optional, if not provided searches all files)

**InputSchema**:
```json
{
  "type": "object",
  "properties": {
    "fileId": {
      "type": "string",
      "description": "The file ID (e.g., 'f1', 'f2') to search in. Optional; if not provided, searches all files."
    },
    "query": {
      "type": "string",
      "description": "Regular expression pattern to search for"
    }
  },
  "required": ["query"]
}
```

**Response includes**:
```json
{
  "results": [
    {
      "fileId": "f1",
      "filename": "README.md",
      "matches": [...]
    }
  ]
}
```

## Success Criteria

- [ ] All files with ID references are accessible
- [ ] Files with same names in the different directories can be all referred and are distinguished by the different ids.
- [ ] File IDs are deterministic as long as files are not added/renamed/deleted from the directories.
- [ ] All four tools work with fileId parameter
- [ ] Tool responses include fileId and filename
- [ ] Documentation updated
- [ ] Full test suite passes (~95% coverage maintained)

## Breaking Changes

This implementation introduces the following breaking changes:

1. **Parameter rename**: `filename` → `fileId` for table_of_contents, read_sections, and search
2. **Response format**: All tool responses now include `fileId` field
3. **Multi-directory behavior**: All versions of conflicting files now accessible (previously shadowed files are now visible)
4. **Session behavior**: File IDs are generated once per session and remain static. File system changes require server restart.

DO NOT THINK ABOUT 'migration strategies'. This is not a published system. There are no existing users. Prioritize simplicity, do not add complexity.

## Notes

- The `f` prefix is intentional to avoid confusion with numeric section IDs (e.g `1/2/3` or just `1`)
- File IDs are session-scoped; they are generated once per session and remain static for the duration of the session. Adding, removing or renaming files during a session is not supported (and does not need to be considered right now).
- File system changes during a session require server restart to regenerate file IDs
- All files that are currently considered by the system will receive an ID, regardless of extension or other file characteristics
- This change enables agents to access all versions of files in multi-directory setups, which was previously impossible
- This is a sweeping change, complex to get done. Do not add, for example, caching or anythign like that. Focus on getting the functionality right first (I will consider caching and things like that in the future).

