/**
 * Utility functions for formatting MCP tool responses.
 * Provides consistent response formatting across all tools.
 */

export type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

/**
 * Fields that should be filtered when empty (truly optional metadata fields)
 * These fields provide no value when empty and can be safely omitted.
 */
const FILTERABLE_FIELDS = new Set([
  'description',  // Optional file/document description
  'keywords',     // Optional metadata keywords
]);

/**
 * Recursively remove empty optional fields from objects
 * Only removes: null, undefined, empty strings, empty arrays for specific optional fields
 * @param obj - Object to filter
 * @returns Filtered object without empty fields
 */
function filterEmptyFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => filterEmptyFields(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const filteredValue = filterEmptyFields(value);

      // Only filter empty values for known optional fields
      if (FILTERABLE_FIELDS.has(key)) {
        // Skip null, undefined, empty string, empty array for these fields
        if (
          filteredValue === null ||
          filteredValue === undefined ||
          (typeof filteredValue === 'string' && filteredValue === '') ||
          (Array.isArray(filteredValue) && filteredValue.length === 0)
        ) {
          continue;
        }
      } else {
        // For all other fields, only skip null/undefined
        if (filteredValue === null || filteredValue === undefined) {
          continue;
        }
      }

      filtered[key] = filteredValue;
    }
    return filtered;
  }

  return obj;
}

/**
 * Create a successful response with data
 * @param data - The data to return
 * @returns Formatted tool response
 */
export function createSuccessResponse(data: any): ToolResponse {
  const filteredData = filterEmptyFields(data);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(filteredData),
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

/**
 * Create a successful response with raw text (no JSON stringification)
 * Used for XML-like formatted responses and other plaintext output
 * @param text - The raw text to return
 * @returns Formatted tool response
 */
export function createSuccessResponseRawText(text: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
