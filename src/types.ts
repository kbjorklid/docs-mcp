import { FileId } from './types/FileId';
import { SectionId } from './types/SectionId';

// Re-export FileId and related utilities for convenience
export { FileId, createFileId, parseFileId, isValidFileId, getFileIdNumber, compareFileIds } from './types/FileId';

// Re-export SectionId and related utilities for convenience
export {
  SectionId,
  createSectionId,
  parseSectionId,
  isValidSectionId,
  getSectionParts,
  getSectionLevel,
  getParentSectionId,
  isChildOf,
  isDirectChild,
  compareSectionIds,
} from './types/SectionId';

// Configuration interface
export interface Configuration {
  documentationPaths: string[];
  maxHeaders?: number;
  maxTocDepth?: number;
}

// Alias for backward compatibility
export interface DocumentationConfig extends Configuration {}

// Interface for parsed command line arguments
export interface ParsedCommandLineArgs {
  docsPaths?: string[];
  maxHeaders?: number;
  maxTocDepth?: number;
}

// File metadata interface
export interface FileMetadata {
  title?: string;
  description?: string;
  keywords?: string | string[];
}

// File info interface
export interface FileInfo {
  fileId?: FileId;
  filename: string;
  title: string;
  description?: string;
  keywords?: string;
  size: string;
  sourceDirectory?: string;
}

// File info with ID interface (for list_documentation_files)
export interface FileInfoWithId {
  fileId: FileId;
  filename: string;
  title?: string;
  description?: string;
  keywords?: string | string[];
  size: string;
}

// Section interface
export interface Section {
  id: SectionId;
  title: string;
  level: number;
  character_count: number;
  subsection_count?: number;
}

// Section content interface
export interface SectionContent {
  title: string;
  content: string;
}

// Table of Contents response interface
export interface TableOfContentsResponse {
  fileId: FileId;
  filename: string;
  sections: Section[];
  instructions?: string;
}

// Search result interfaces
export interface SearchResult {
  query: string;
  results: FileSearchResult[];
  instructions?: string;
}

export interface FileSearchResult {
  fileId: FileId;
  filename: string;
  matches: Section[];
}

// Read sections response interface
export interface ReadSectionsResponse {
  fileId: FileId;
  filename: string;
  sections: SectionContent[];
}

// Internal file list item interface (matches ListDocumentationFiles output)
export interface FileListItem {
  filename: string;
  title: string;
  description?: string;
  keywords?: string;
  size: string;
}

// Note: ErrorResponse interface is no longer used
// Errors are now returned as simple text messages for better AI agent guidance

// Default configuration
export const DEFAULT_CONFIG: Configuration = {
  documentationPaths: [process.env.DOCS_PATH || './docs'],
  maxHeaders: 25,
  maxTocDepth: 3,
};
