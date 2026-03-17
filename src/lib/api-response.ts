import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  pagination?: {
    cursor?: string;
    limit: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export const API_ERRORS = {
  BAD_REQUEST: { code: 'BAD_REQUEST', message: 'Invalid request parameters', statusCode: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', statusCode: 404 },
  CONFLICT: { code: 'CONFLICT', message: 'Resource conflict', statusCode: 409 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many requests', statusCode: 429 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable', statusCode: 503 },
} as const;

export function createApiResponse<T>(
  data: T,
  requestId: string,
  options?: {
    pagination?: ApiResponse<T>['pagination'];
    headers?: Record<string, string>;
  }
): NextResponse {
  const response = NextResponse.json({
    data,
    requestId,
    ...(options?.pagination && { pagination: options.pagination }),
  });

  // Set required headers
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('API-Version', '1.0');
  response.headers.set('Content-Type', 'application/json');
  
  // Set custom headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export function createErrorResponse(
  error: ApiError,
  requestId: string,
  details?: Record<string, unknown>
): NextResponse {
  const response = NextResponse.json({
    error: {
      code: error.code,
      message: error.message,
      ...(details && { details }),
    },
    requestId,
  }, { status: error.statusCode });

  // Set required headers
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('API-Version', '1.0');
  response.headers.set('Content-Type', 'application/json');

  return response;
}

export function createPaginatedResponse<T>(
  items: T[],
  requestId: string,
  options: {
    limit: number;
    getCursor: (item: T) => string;
  }
): NextResponse {
  const hasMore = items.length > options.limit;
  const paginatedItems = hasMore ? items.slice(0, options.limit) : items;
  const cursor = paginatedItems.length > 0 
    ? options.getCursor(paginatedItems[paginatedItems.length - 1]) 
    : undefined;

  return createApiResponse(paginatedItems, requestId, {
    pagination: {
      cursor,
      limit: options.limit,
      hasMore,
    },
  });
}

// Deprecation header helper
export function addDeprecationWarning(
  response: NextResponse,
  sunsetDate: string,
  link: string
): NextResponse {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', sunsetDate);
  response.headers.set('Link', `<${link}>; rel="successor-version"`);
  return response;
}