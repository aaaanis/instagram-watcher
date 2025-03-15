/**
 * Standard API error response interface
 */
export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  details?: any;
}

/**
 * API error class for consistent error handling
 */
export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * Format the error for API response
   */
  toResponse(): ApiErrorResponse {
    return {
      status: this.status,
      error: this.name,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Helper function to handle errors in API routes
 */
export function handleApiError(error: unknown): ApiErrorResponse {
  // If it's already an ApiError, just return its response
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  // If it's a regular Error, convert to ApiError with 500 status
  if (error instanceof Error) {
    return {
      status: 500,
      error: error.name || 'ServerError',
      message: error.message || 'An unexpected error occurred',
    };
  }

  // For unknown errors
  return {
    status: 500,
    error: 'UnknownError',
    message: 'An unknown error occurred',
    details: error
  };
}

/**
 * Common API errors for reuse
 */
export const ApiErrors = {
  NotFound: (resource: string) => 
    new ApiError(404, `${resource} not found`),
  
  BadRequest: (message: string, details?: any) => 
    new ApiError(400, message, details),
  
  Unauthorized: () => 
    new ApiError(401, 'Unauthorized access'),
  
  Forbidden: () => 
    new ApiError(403, 'Forbidden access'),
  
  InternalServerError: (message?: string) => 
    new ApiError(500, message || 'Internal server error'),
  
  ServiceUnavailable: (service: string) => 
    new ApiError(503, `${service} service unavailable`),
}; 