// Configuration interface
export interface DocumentationConfig {
  documentation_path: string;
  auto_index: boolean;
  index_refresh_interval: number;
  max_file_size: number;
  exclude_patterns: string[];
  include_patterns: string[];
  max_toc_depth?: number;
  discount_single_top_header?: boolean;
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

// Error response interface
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Default configuration
export const DEFAULT_CONFIG: DocumentationConfig = {
  documentation_path: process.env.DOCS_PATH || './docs',
  auto_index: true,
  index_refresh_interval: 300,
  max_file_size: 10485760, // 10MB
  exclude_patterns: ['node_modules/**', '*.tmp.md'],
  include_patterns: ['**/*.md'],
  discount_single_top_header: false,
};
