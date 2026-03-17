import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    tenantId?: string;
    userId?: string;
    startTime: number;
  }
}

/**
 * Middleware that generates a unique request ID and extracts tenant/user context.
 * Adds X-Request-ID header to all responses and includes context in all log entries.
 */
export function requestContextMiddleware() {
  return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // Generate or extract request ID
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.requestId = requestId;
    request.startTime = Date.now();

    // Set response header
    reply.header('X-Request-ID', requestId);
    reply.header('API-Version', '1.0');

    // Extract tenant and user from JWT if present
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // JWT payload is attached by auth middleware if token is valid
        const payload = (request as any).user;
        if (payload) {
          request.tenantId = payload.tenantId;
          request.userId = payload.sub;
        }
      } catch (error) {
        // Token invalid, will be caught by auth middleware
      }
    }

    done();
  };
}

/**
 * Middleware that logs request completion with duration.
 */
export function requestLoggerMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - request.startTime;

    logger.info({
      requestId: request.requestId,
      tenantId: request.tenantId || 'anonymous',
      userId: request.userId || 'anonymous',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
  };
}