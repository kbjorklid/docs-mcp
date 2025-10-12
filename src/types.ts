// Configuration interface
export interface Configuration {
  documentationPath: string;
  maxTocDepth?: number;
  discountSingleTopHeader?: boolean;
}

// Alias for backward compatibility
export interface DocumentationConfig extends Configuration {}

// Interface for parsed command line arguments
export interface ParsedCommandLineArgs {
  docsPath?: string;
  maxTocDepth?: number;
  discountSingleTopHeader?: boolean;
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
}

// Section content interface
export interface SectionContent {
  title: string;
  content: string;
}

// Search result interfaces
export interface SearchResult {
  query: string;
  results: FileSearchResult[];
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

// Error response interface
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Default configuration
export const DEFAULT_CONFIG: Configuration = {
  documentationPath: process.env.DOCS_PATH || './docs',
  discountSingleTopHeader: false,
};
