/**
 * Utility functions for formatting MCP tool responses.
 * Provides consistent response formatting across all tools.
 */

import { ErrorResponse } from '../types';

export type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

/**
 * Create a successful response with data
 * @param data - The data to return
 * @returns Formatted tool response
 */
export function createSuccessResponse(data: any): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error response
 * @param code - Error code
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Formatted error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ToolResponse {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2),
      },
    ],
  };
}
