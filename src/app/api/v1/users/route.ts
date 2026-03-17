import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authMiddleware, tenantMiddleware } from '@/middleware';
import { logger } from '@/lib/utils/logger';

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().min(1).max(255).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;

export async function usersRoute(fastify: FastifyInstance) {
  // GET /api/v1/users/me - Get current user
  fastify.get(
    '/users/me',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { userId, tenantId } = request;

      try {
        // Find user
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
            tenantId,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
            tenant: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        });

        if (!user) {
          logger.warn({
            requestId,
            message: 'User not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            userId,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'User profile retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          userId,
          tenantId,
        });

        return reply.code(200).send({
          data: {
            user,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to retrieve user profile',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve user profile',
          },
          requestId,
        });
      }
    },
  );

  // PUT /api/v1/users/me - Update current user
  fastify.put(
    '/users/me',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { userId, tenantId } = request;

      try {
        const data = UpdateUserSchema.parse(request.body);

        // Find user
        const existingUser = await prisma.user.findUnique({
          where: {
            id: userId,
            tenantId,
          },
        });

        if (!existingUser) {
          logger.warn({
            requestId,
            message: 'User not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            userId,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
            requestId,
          });
        }

        // Update user
        const user = await prisma.user.update({
          where: {
            id: userId,
            tenantId,
          },
          data: {
            name: data.name || existingUser.name,
            email: data.email || existingUser.email,
            role: data.role || existingUser.role,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'User profile updated successfully',
          statusCode: 200,
          durationMs: duration,
          userId,
          tenantId,
        });

        return reply.code(200).send({
          data: {
            user,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'User update validation failed',
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
          message: 'Failed to update user profile',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update user profile',
          },
          requestId,
        });
      }
    },
  );
}