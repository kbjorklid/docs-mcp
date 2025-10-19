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
  keywords?: string[];
}

// File info interface
export interface FileInfo {
  filename: string;
  title: string;
  description?: string;
  keywords: string[];
  size: string;
}

// Section interface
export interface Section {
  id: string;
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
  filename: string;
  matches: Section[];
}

// Internal file list item interface (matches ListDocumentationFiles output)
export interface FileListItem {
  filename: string;
  title: string;
  description?: string;
  keywords: string[];
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
