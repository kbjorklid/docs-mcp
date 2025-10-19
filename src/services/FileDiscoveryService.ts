/**
 * File discovery service for multi-directory documentation support.
 * Provides centralized file discovery with conflict resolution.
 */

import { glob } from 'glob';
import * as path from 'path';
import { Configuration, FileMetadata, FileInfo, FileInfoWithId } from '../types';
import { MarkdownParser } from '../MarkdownParser';

/**
 * Represents a discovered file with full metadata
 */
export interface DiscoveredFile {
  filename: string;           // Relative filename (used for conflict resolution key)
  fullPath: string;          // Absolute path to the file
  sourceDirectory: string;   // Which documentation directory it came from
  metadata: FileMetadata;
  size: string;
}

/**
 * File ID mapping for session-scoped file references
 */
export interface FileIdMapping {
  fileId: string;
  filename: string;
  fullPath: string;
  sourceDirectory: string;
  discoveredFile: DiscoveredFile;
}

/**
 * Service for discovering and managing files across multiple documentation directories
 */
export class FileDiscoveryService {
  private config: Configuration;
  private fileCache: DiscoveredFile[] | null = null;
  private fileIdRegistry: Map<string, FileIdMapping> = new Map();
  private filenameToFileId: Map<string, string> = new Map();
  private isInitialized: boolean = false;

  constructor(config: Configuration) {
    this.config = config;
  }

  /**
   * Get all discovered files with file IDs assigned
   */
  async getAllFiles(): Promise<DiscoveredFile[]> {
    if (this.isInitialized && this.fileCache) {
      return this.fileCache;
    }

    const discoveredFiles: DiscoveredFile[] = [];

    // Process directories in config order
    for (const directory of this.config.documentationPaths) {
      const filesInDir = await this.discoverFilesInDirectory(directory);
      discoveredFiles.push(...filesInDir);
    }

    // Sort files deterministically: directory-first, then alphabetical within each directory
    const sortedFiles = this.sortFilesByDirectoryAndAlphabet(discoveredFiles);

    // Assign file IDs
    this.assignFileIds(sortedFiles);

    this.fileCache = sortedFiles;
    this.isInitialized = true;

    return sortedFiles;
  }

  /**
   * Resolve a filename to its full path
   */
  async resolveFilePath(filename: string): Promise<string | null> {
    const allFiles = await this.getAllFiles();
    const discoveredFile = allFiles.find(file => file.filename === filename);
    return discoveredFile?.fullPath || null;
  }

  /**
   * Get file metadata for a specific filename
   */
  async getFileMetadata(filename: string): Promise<DiscoveredFile | null> {
    const allFiles = await this.getAllFiles();
    return allFiles.find(file => file.filename === filename) || null;
  }

  /**
   * Convert discovered files to FileInfo format (for backward compatibility)
   */
  async getFileInfoList(): Promise<FileInfo[]> {
    const discoveredFiles = await this.getAllFiles();

    return discoveredFiles.map(file => ({
      filename: file.filename,
      title: file.metadata.title || path.basename(file.filename, '.md'),
      description: file.metadata.description,
      keywords: file.metadata.keywords || [],
      size: file.size,
    }));
  }

  /**
   * Clear the file cache (useful for testing or when directories change)
   */
  clearCache(): void {
    this.fileCache = null;
    this.fileIdRegistry.clear();
    this.filenameToFileId.clear();
    this.isInitialized = false;
  }

  /**
   * Get file mapping by file ID
   */
  async getFileByFileId(fileId: string): Promise<FileIdMapping | null> {
    // Ensure files are discovered and IDs assigned
    await this.getAllFiles();

    return this.fileIdRegistry.get(fileId) || null;
  }

  /**
   * Get all files with file IDs included
   */
  async getAllFilesWithIds(): Promise<FileInfoWithId[]> {
    const files = await this.getAllFiles();

    return files.map((file, index) => ({
      fileId: `f${index + 1}`,
      filename: file.filename,
      title: file.metadata.title || path.basename(file.filename, '.md'),
      description: file.metadata.description,
      keywords: file.metadata.keywords || [],
      size: file.size,
      sourceDirectory: file.sourceDirectory,
    }));
  }

  /**
   * Sort files deterministically: directory-first (config order), then alphabetical within each directory
   */
  private sortFilesByDirectoryAndAlphabet(files: DiscoveredFile[]): DiscoveredFile[] {
    // Group files by source directory
    const filesByDir = new Map<string, DiscoveredFile[]>();

    for (const file of files) {
      if (!filesByDir.has(file.sourceDirectory)) {
        filesByDir.set(file.sourceDirectory, []);
      }
      filesByDir.get(file.sourceDirectory)!.push(file);
    }

    // Process directories in config order
    const sortedFiles: DiscoveredFile[] = [];

    for (const directory of this.config.documentationPaths) {
      const filesInDir = filesByDir.get(directory) || [];

      // Sort files alphabetically within directory (by filename, which includes subdirectory paths)
      filesInDir.sort((a, b) => a.filename.localeCompare(b.filename));

      sortedFiles.push(...filesInDir);
    }

    return sortedFiles;
  }

  /**
   * Assign file IDs to discovered files
   */
  private assignFileIds(files: DiscoveredFile[]): void {
    this.fileIdRegistry.clear();
    this.filenameToFileId.clear();

    files.forEach((file, index) => {
      const fileId = `f${index + 1}`;

      const mapping: FileIdMapping = {
        fileId,
        filename: file.filename,
        fullPath: file.fullPath,
        sourceDirectory: file.sourceDirectory,
        discoveredFile: file,
      };

      this.fileIdRegistry.set(fileId, mapping);

      // Note: Multiple files can have same filename in different directories
      // We only store the first occurrence for backward compatibility lookups
      if (!this.filenameToFileId.has(file.filename)) {
        this.filenameToFileId.set(file.filename, fileId);
      }
    });
  }

  /**
   * Discover files in a single directory
   */
  private async discoverFilesInDirectory(directory: string): Promise<DiscoveredFile[]> {
    const files: DiscoveredFile[] = [];

    try {
      // Find all markdown files using **/*.md pattern
      const filePaths = await glob('**/*.md', {
        cwd: directory,
        absolute: false,
      });

      for (const filePath of filePaths) {
        const discoveredFile = await this.processFile(filePath, directory);
        if (discoveredFile) {
          files.push(discoveredFile);
        }
      }
    } catch (error) {
      console.error(`Error discovering files in directory ${directory}:`, error);
      // Return empty array for this directory, don't fail the entire operation
    }

    return files;
  }

  /**
   * Process a single file and extract metadata
   */
  private async processFile(filePath: string, sourceDirectory: string): Promise<DiscoveredFile | null> {
    const fullPath = path.resolve(sourceDirectory, filePath);
    const normalizedFilename = filePath.replace(/\\/g, '/'); // Normalize path separators

    try {
      const validation = MarkdownParser.validateFile(fullPath);
      if (!validation.valid || !validation.stats) {
        return null;
      }

      const { metadata } = MarkdownParser.readMarkdownFile(fullPath);

      const discoveredFile: DiscoveredFile = {
        filename: normalizedFilename,
        fullPath,
        sourceDirectory,
        metadata,
        size: MarkdownParser.formatFileSize(validation.stats.size),
      };

      return discoveredFile;
    } catch (error) {
      console.error(`Error processing file ${filePath} in directory ${sourceDirectory}:`, error);
      return null;
    }
  }
}