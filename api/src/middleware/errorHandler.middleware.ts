import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger, sendCriticalAlert } from '@/lib/utils/logger';

/**
 * Error response structure that never leaks internal details.
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  requestId: string;
}

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns appropriate response.
 * Stack traces are only included in development mode.
 */
export function errorHandlerMiddleware() {
  return async (
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const requestId = request.requestId || 'unknown';
    const statusCode = 'statusCode' in error ? error.statusCode : 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Log the error with full context
    logger.error({
      requestId,
      tenantId: (request as any).tenantId,
      userId: (request as any).userId,
      method: request.method,
      url: request.url,
      statusCode,
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
    });

    // Send critical alert for 5xx errors
    if (statusCode >= 500) {
      await sendCriticalAlert({
        requestId,
        tenantId: (request as any).tenantId,
        error: error.message,
        stack: isProduction ? undefined : error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle validation errors
    if (error instanceof ZodError) {
      const response: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        requestId,
      };
      reply.code(400).send(response);
      return;
    }

    // Handle known Fastify errors
    if ('statusCode' in error) {
      const code = error.code || 'UNKNOWN_ERROR';
      const message = isProduction
        ? getSafeErrorMessage(statusCode, code)
        : error.message;

      const response: ErrorResponse = {
        error: {
          code,
          message,
        },
        requestId,
      };
      reply.code(statusCode).send(response);
      return;
    }

    // Handle unknown errors
    const response: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
      },
      requestId,
    };

    reply.code(500).send(response);
  };
}

/**
 * Returns safe error messages for production.
 * Never reveals internal implementation details.
 */
function getSafeErrorMessage(statusCode: number, code: string): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred with the current state.',
    422: 'Unable to process the request.',
    429: 'Too many requests. Please try again later.',
    500: 'An unexpected error occurred. Please try again later.',
    502: 'Service temporarily unavailable.',
    503: 'Service temporarily unavailable.',
    504: 'Request timed out.',
  };

  return messages[statusCode] || 'An error occurred.';
}

export default errorHandlerMiddleware;