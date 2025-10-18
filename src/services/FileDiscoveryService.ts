/**
 * File discovery service for multi-directory documentation support.
 * Provides centralized file discovery with conflict resolution.
 */

import { glob } from 'glob';
import * as path from 'path';
import { Configuration, FileMetadata, FileInfo } from '../types';
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
 * Service for discovering and managing files across multiple documentation directories
 */
export class FileDiscoveryService {
  private config: Configuration;
  private fileCache: DiscoveredFile[] | null = null;

  constructor(config: Configuration) {
    this.config = config;
  }

  /**
   * Get all discovered files with conflict resolution applied
   */
  async getAllFiles(): Promise<DiscoveredFile[]> {
    if (this.fileCache) {
      return this.fileCache;
    }

    const discoveredFiles: DiscoveredFile[] = [];
    const seenFilenames = new Set<string>();

    // Process directories in order to handle conflicts
    for (const directory of this.config.documentationPaths) {
      const filesInDir = await this.discoverFilesInDirectory(directory);

      for (const file of filesInDir) {
        // Skip if we've already seen this filename (conflict resolution)
        if (seenFilenames.has(file.filename)) {
          continue;
        }

        discoveredFiles.push(file);
        seenFilenames.add(file.filename);
      }
    }

    this.fileCache = discoveredFiles;
    return discoveredFiles;
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