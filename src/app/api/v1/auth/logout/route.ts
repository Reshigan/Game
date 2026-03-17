import { FastifyInstance } from 'fastify';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

export async function logoutRoute(fastify: FastifyInstance) {
  fastify.post('/logout', async (request, reply) => {
    const requestId = request.id;
    const startTime = Date.now();
    const userId = request.user?.userId;

    try {
      if (!userId) {
        logger.warn({
          requestId,
          message: 'Logout failed: not authenticated',
          statusCode: 401,
          durationMs: Date.now() - startTime,
        });

        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
          requestId,
        });
      }

      // In a real implementation, we would invalidate the refresh token in Redis
      // For now, we'll just log the logout event

      const duration = Date.now() - startTime;

      logger.info({
        requestId,
        message: 'User logged out',
        statusCode: 200,
        durationMs: duration,
        userId,
      });

      return reply.code(200).send({
        data: {
          message: 'Logged out successfully',
        },
        requestId,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        requestId,
        message: 'Logout failed',
        statusCode: 500,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
        },
        requestId,
      });
    }
  });
}