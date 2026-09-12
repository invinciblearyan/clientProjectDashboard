export interface ErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Resource not found'): ApiError {
  return new ApiError(404, 'NOT_FOUND', message);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, 'CONFLICT', message);
}

export function validationError(details: ErrorDetail[]): ApiError {
  return new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
}
