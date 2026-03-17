import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { comparePassword, generateJwtToken, generateRefreshToken } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { createIdempotencyMiddleware } from '@/middleware';

const LoginSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(1).max(128),
});

type LoginRequest = z.infer<typeof LoginSchema>;

export async function loginRoute(fastify: FastifyInstance) {
  fastify.post(
    '/login',
    {
      preHandler: [createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const { email, password } = LoginSchema.parse(request.body);

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            status: true,
            tenantId: true,
            createdAt: true,
          },
        });

        if (!user) {
          logger.warn({
            requestId,
            message: 'Login failed: user not found',
            statusCode: 401,
            durationMs: Date.now() - startTime,
            email,
          });

          return reply.code(401).send({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
            requestId,
          });
        }

        // Check if user is active
        if (user.status !== 'active') {
          logger.warn({
            requestId,
            message: 'Login failed: user account not active',
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

        // Verify password
        const isPasswordValid = await comparePassword(password, user.passwordHash);

        if (!isPasswordValid) {
          logger.warn({
            requestId,
            message: 'Login failed: invalid password',
            statusCode: 401,
            durationMs: Date.now() - startTime,
            userId: user.id,
          });

          return reply.code(401).send({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
            requestId,
          });
        }

        // Generate tokens
        const accessToken = generateJwtToken(user.id, user.role, user.tenantId);
        const refreshToken = generateRefreshToken(user.id);

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'User logged in successfully',
          statusCode: 200,
          durationMs: duration,
          userId: user.id,
          email: user.email,
        });

        return reply.code(200).send({
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              status: user.status,
              tenantId: user.tenantId,
              createdAt: user.createdAt,
            },
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
            message: 'Login validation failed',
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
          message: 'Login failed',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Login failed',
          },
          requestId,
        });
      }
    },
  );
}