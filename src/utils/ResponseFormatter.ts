/**
 * Utility functions for formatting MCP tool responses.
 * Provides consistent response formatting across all tools.
 */

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
 * Create an error response with a simple, conversational error message
 * @param message - Human-readable error message explaining what went wrong and how to fix it
 * @returns Formatted error response as plain text
 */
export function createErrorResponse(message: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message || 'An error occurred',
      },
    ],
  };
}
