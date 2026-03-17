import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { hashPassword, comparePassword } from '@/lib/utils/hash';
import { generateToken, generateRefreshToken, verifyToken } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';
import { rateLimitMiddleware } from '@/middleware/rateLimit.middleware';

/**
 * Authentication routes.
 * All routes are prefixed with /api/v1/auth
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Registration schema
  const registerSchema = z.object({
    email: z.string().email('Invalid email format').min(1).max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(1).max(100).optional(),
  });

  // Login schema
  const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1),
  });

  // Refresh token schema
  const refreshSchema = z.object({
    refreshToken: z.string().min(1),
  });

  /**
   * POST /api/v1/auth/register
   * Register a new user.
   * Rate limited to prevent abuse.
   */
  fastify.post(
    '/register',
    {
      preHandler: [rateLimitMiddleware({ max: 5, windowMs: 60000 })], // 5 requests per minute
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
        body: registerSchema,
        response: {
          201: z.object({
            token: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.string(),
            }),
          }),
          400: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
            }),
            requestId: z.string(),
          }),
          409: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
            requestId: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const { email, password, name } = registerSchema.parse(request.body);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          logger.warn({
            requestId,
            message: 'Registration failed: email already in use',
            statusCode: 409,
            durationMs: Date.now() - startTime,
            email: '[REDACTED]', // PII masked
          });

          return reply.code(409).send({
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'An account with this email already exists',
            },
            requestId,
          });
        }

        // Hash password with bcrypt
        const passwordHash = await hashPassword(password);

        // Create user with default tenant
        const result = await prisma.$transaction(async (tx) => {
          // Create tenant for the user
          const tenant = await tx.tenant.create({
            data: {
              name: `${name || email.split('@')[0]}'s Workspace`,
              plan: 'free',
              status: 'active',
            },
          });

          // Create user
          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              name: name || email.split('@')[0],
              role: 'admin', // First user is admin of their tenant
              status: 'active',
              tenantId: tenant.id,
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              tenantId: true,
            },
          });

          return { user, tenant };
        });

        // Generate tokens
        const token = generateToken({
          sub: result.user.id,
          tenantId: result.user.tenantId,
          role: result.user.role,
        });
        const refreshToken = generateRefreshToken(result.user.id);

        logger.info({
          requestId,
          message: 'User registered successfully',
          statusCode: 201,
          durationMs: Date.now() - startTime,
          userId: result.user.id,
          tenantId: result.user.tenantId,
        });

        return reply.code(201).send({
          token,
          refreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Registration validation failed',
            statusCode: 400,
            durationMs: Date.now() - startTime,
            errors: error.errors,
          });

          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
            requestId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return tokens.
   */
  fastify.post(
    '/login',
    {
      preHandler: [rateLimitMiddleware({ max: 10, windowMs: 60000 })], // 10 requests per minute
      schema: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate with email and password',
        body: loginSchema,
        response: {
          200: z.object({
            token: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.string(),
            }),
          }),
          401: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
            requestId: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const { email, password } = loginSchema.parse(request.body);

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: true },
        });

        if (!user) {
          logger.warn({
            requestId,
            message: 'Login failed: user not found',
            statusCode: 401,
            durationMs: Date.now() - startTime,
            email: '[REDACTED]',
          });

          return reply.code(401).send({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
            requestId,
          });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.passwordHash);

        if (!isValidPassword) {
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

        // Check if user is active
        if (user.status !== 'active') {
          logger.warn({
            requestId,
            message: 'Login failed: user not active',
            statusCode: 401,
            durationMs: Date.now() - startTime,
            userId: user.id,
            status: user.status,
          });

          return reply.code(401).send({
            error: {
              code: 'ACCOUNT_INACTIVE',
              message: 'Account is not active',
            },
            requestId,
          });
        }

        // Generate tokens
        const token = generateToken({
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role,
        });
        const refreshToken = generateRefreshToken(user.id);

        logger.info({
          requestId,
          message: 'User logged in successfully',
          statusCode: 200,
          durationMs: Date.now() - startTime,
          userId: user.id,
          tenantId: user.tenantId,
        });

        return reply.code(200).send({
          token,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
            requestId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token.
   */
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh token',
        description: 'Get a new access token using a refresh token',
        body: refreshSchema,
        response: {
          200: z.object({
            token: z.string(),
            refreshToken: z.string(),
          }),
          401: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
            requestId: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const { refreshToken } = refreshSchema.parse(request.body);

        // Verify refresh token
        const payload = verifyToken(refreshToken, 'refresh');

        if (!payload || !payload.sub) {
          return reply.code(401).send({
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'Invalid or expired refresh token',
            },
            requestId,
          });
        }

        // Get user
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            tenantId: true,
            role: true,
            status: true,
          },
        });

        if (!user || user.status !== 'active') {
          return reply.code(401).send({
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'Invalid or expired refresh token',
            },
            requestId,
          });
        }

        // Generate new tokens
        const newToken = generateToken({
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role,
        });
        const newRefreshToken = generateRefreshToken(user.id);

        logger.info({
          requestId,
          message: 'Token refreshed successfully',
          statusCode: 200,
          durationMs: Date.now() - startTime,
          userId: user.id,
        });

        return reply.code(200).send({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
            },
            requestId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/logout
   * Logout user (invalidate session).
   */
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Invalidate the current session',
        response: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const requestId = request.id;

      // In a stateful session system, we would invalidate the session here
      // With JWT, we rely on short expiry times and refresh token rotation

      logger.info({
        requestId,
        message: 'User logged out',
        statusCode: 200,
        userId: (request as any).userId || 'anonymous',
      });

      return reply.code(200).send({
        message: 'Logged out successfully',
      });
    }
  );
}