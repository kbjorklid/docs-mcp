/**
 * Utility functions and helpers
 */

export { createSuccessResponse, createErrorResponse, createSuccessResponseRawText, type ToolResponse } from './ResponseFormatter';
export { validateAndResolveFile, type FileValidationResult } from './FileValidator';
export {
  isNonEmptyString,
  isPositiveNumber,
  isStringArray,
  isError,
  isValidFileId,
} from './TypeGuards';
export {
  parseToolError,
  getErrorMessage,
  type FileNotFoundError,
  type SectionNotFoundError,
  type ParseError,
  type ParsedError,
} from './ErrorParser';
export { normalizeLineEndings } from './LineNormalizer';
export {
  createFileNotFoundError,
  createSectionNotFoundError,
} from './ToolErrorFactory';
export {
  hasHiddenSubsections,
  INSTRUCTIONS_FOR_HIDDEN_SUBSECTIONS,
} from './InstructionsHelper';
export { isTitleRedundant } from './TitleComparator';
export { formatTableOfContentsAsXml } from './TableOfContentsFormatter';
