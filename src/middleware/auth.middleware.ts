import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, JwtPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

// Extend FastifyRequest with user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    tenantId?: string;
  }
}

export interface AuthOptions {
  required?: boolean;
  roles?: ('user' | 'admin' | 'editor' | 'viewer')[];
}

export function createAuthMiddleware(options: AuthOptions = {}) {
  const { required = true, roles = [] } = options;

  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const requestId = request.id;
    const authHeader = request.headers.authorization;

    // No auth header
    if (!authHeader) {
      if (required) {
        logger.warn({
          requestId,
          message: 'Authentication required but no token provided',
          statusCode: 401,
          path: request.url,
          method: request.method,
        });

        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          requestId,
        });
      }
      return;
    }

    // Invalid auth header format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.warn({
        requestId,
        message: 'Invalid authorization header format',
        statusCode: 401,
        path: request.url,
      });

      return reply.code(401).send({
        error: {
          code: 'INVALID_AUTH_HEADER',
          message: 'Invalid authorization header format',
        },
        requestId,
      });
    }

    const token = parts[1];

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      logger.warn({
        requestId,
        message: 'Invalid or expired token',
        statusCode: 401,
        path: request.url,
      });

      return reply.code(401).send({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        requestId,
      });
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, tenantId: true, role: true },
    });

    if (!user) {
      logger.warn({
        requestId,
        message: 'Token references non-existent user',
        statusCode: 401,
        userId: payload.userId,
      });

      return reply.code(401).send({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        requestId,
      });
    }

    if (user.status !== 'active') {
      logger.warn({
        requestId,
        message: 'Token references inactive user',
        statusCode: 403,
        userId: payload.userId,
        status: user.status,
      });

      return reply.code(403).send({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is not active',
        },
        requestId,
      });
    }

    // Check role if specified
    if (roles.length > 0 && !roles.includes(user.role as 'user' | 'admin' | 'editor' | 'viewer')) {
      logger.warn({
        requestId,
        message: 'User does not have required role',
        statusCode: 403,
        userId: payload.userId,
        requiredRoles: roles,
        actualRole: user.role,
      });

      return reply.code(403).send({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource',
        },
        requestId,
      });
    }

    // Attach user to request
    request.user = payload;
    request.tenantId = user.tenantId;
  };
}

// Convenience exports for common auth patterns
export const requireAuth = createAuthMiddleware({ required: true });
export const requireAdmin = createAuthMiddleware({ required: true, roles: ['admin'] });
export const requireEditor = createAuthMiddleware({ required: true, roles: ['admin', 'editor'] });
export const optionalAuth = createAuthMiddleware({ required: false });