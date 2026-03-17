import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '@/lib/utils/logger';

/**
 * Global error handler middleware.
 * Ensures no sensitive information is leaked in error responses.
 * All errors are logged with request context for audit trail.
 */
export async function errorHandlerMiddleware(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.id;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log all errors with full context
  logger.error({
    requestId,
    message: 'Request error',
    statusCode: error.statusCode || 500,
    error: {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: sanitizeHeaders(request.headers),
      query: request.query,
      // Never log request body in production (may contain PII)
      body: isProduction ? '[REDACTED]' : request.body,
    },
    user: request.user ? {
      userId: request.user.userId,
      tenantId: request.user.tenantId,
    } : undefined,
  });

  // Handle specific error types
  if (error instanceof ZodError) {
    // Validation errors from Zod
    const validationErrors = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    await reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
      },
      requestId,
    });
    return;
  }

  if (error.statusCode === 401) {
    await reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      requestId,
    });
    return;
  }

  if (error.statusCode === 403) {
    await reply.code(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      },
      requestId,
    });
    return;
  }

  if (error.statusCode === 404) {
    await reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
      requestId,
    });
    return;
  }

  if (error.statusCode === 409) {
    await reply.code(409).send({
      error: {
        code: 'CONFLICT',
        message: error.message || 'Resource already exists',
      },
      requestId,
    });
    return;
  }

  if (error.statusCode === 429) {
    await reply.code(429).send({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
      requestId,
    });
    return;
  }

  // Database errors - never expose internal details
  if (error.message?.includes('Prisma') || error.message?.includes('database')) {
    logger.error({
      requestId,
      message: 'Database error',
      error: error.message,
    });

    await reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction
          ? 'An internal error occurred. Please try again later.'
          : error.message,
      },
      requestId,
    });
    return;
  }

  // Generic server error
  const statusCode = error.statusCode || 500;
  await reply.code(statusCode).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : error.message,
    },
    requestId,
  });
}

/**
 * Sanitize headers to remove sensitive information before logging.
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-refresh-token',
  ];

  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create not-found handler for undefined routes.
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
    requestId: request.id,
  });
}