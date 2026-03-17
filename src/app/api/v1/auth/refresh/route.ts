import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { verifyRefreshToken, generateJwtToken } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1).max(1024),
});

type RefreshRequest = z.infer<typeof RefreshSchema>;

export async function refreshRoute(fastify: FastifyInstance) {
  fastify.post('/refresh', async (request, reply) => {
    const requestId = request.id;
    const startTime = Date.now();

    try {
      const { refreshToken } = RefreshSchema.parse(request.body);

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      if (!payload) {
        logger.warn({
          requestId,
          message: 'Refresh token validation failed',
          statusCode: 401,
          durationMs: Date.now() - startTime,
        });

        return reply.code(401).send({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          },
          requestId,
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          tenantId: true,
          createdAt: true,
        },
      });

      if (!user) {
        logger.warn({
          requestId,
          message: 'Refresh failed: user not found',
          statusCode: 404,
          durationMs: Date.now() - startTime,
          userId: payload.userId,
        });

        return reply.code(404).send({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          requestId,
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        logger.warn({
          requestId,
          message: 'Refresh failed: user account not active',
          statusCode: 403,
          durationMs: Date.now() - startTime,
          userId: user.id,
          status: user.status,
        });

        return reply.code(403).send({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'User account is not active',
          },
          requestId,
        });
      }

      // Generate new access token
      const accessToken = generateJwtToken(user.id, user.role, user.tenantId);

      const duration = Date.now() - startTime;

      logger.info({
        requestId,
        message: 'Access token refreshed',
        statusCode: 200,
        durationMs: duration,
        userId: user.id,
        email: user.email,
      });

      return reply.code(200).send({
        data: {
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600, // 1 hour
          },
        },
        requestId,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        logger.warn({
          requestId,
          message: 'Refresh validation failed',
          statusCode: 400,
          durationMs: duration,
          errors: error.errors,
        });

        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
          requestId,
        });
      }

      logger.error({
        requestId,
        message: 'Token refresh failed',
        statusCode: 500,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Token refresh failed',
        },
        requestId,
      });
    }
  });
}