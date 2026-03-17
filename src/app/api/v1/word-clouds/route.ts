import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authMiddleware, tenantMiddleware } from '@/middleware';
import { logger } from '@/lib/utils/logger';
import { createIdempotencyMiddleware } from '@/middleware';

const CreateWordCloudSchema = z.object({
  name: z.string().min(1).max(255),
  config: z.object({
    words: z.array(
      z.object({
        text: z.string().min(1).max(100),
        weight: z.number().min(1).max(100),
      }),
    ),
    colors: z.array(z.string()).optional(),
    fontFamily: z.string().optional(),
    fontSize: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    rotation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      steps: z.number().optional(),
    }).optional(),
    shape: z.enum(['circle', 'cardioid', 'diamond', 'square', 'triangle', 'pentagon', 'star']).optional(),
  }),
});

const UpdateWordCloudSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  config: z.object({
    words: z.array(
      z.object({
        text: z.string().min(1).max(100),
        weight: z.number().min(1).max(100),
      }),
    ).optional(),
    colors: z.array(z.string()).optional(),
    fontFamily: z.string().optional(),
    fontSize: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    rotation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      steps: z.number().optional(),
    }).optional(),
    shape: z.enum(['circle', 'cardioid', 'diamond', 'square', 'triangle', 'pentagon', 'star']).optional(),
  }).optional(),
});

const DeleteWordCloudSchema = z.object({
  id: z.string().uuid(),
});

type CreateWordCloudRequest = z.infer<typeof CreateWordCloudSchema>;
type UpdateWordCloudRequest = z.infer<typeof UpdateWordCloudSchema>;
type DeleteWordCloudRequest = z.infer<typeof DeleteWordCloudSchema>;

export async function wordCloudsRoute(fastify: FastifyInstance) {
  // GET /api/v1/word-clouds - List word clouds
  fastify.get(
    '/word-clouds',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;

      try {
        const page = parseInt(request.query.page as string) || 1;
        const pageSize = parseInt(request.query.pageSize as string) || 20;
        const cursor = request.query.cursor as string | undefined;

        // Build query
        const where: any = {
          tenantId,
          status: {
            not: 'deleted',
          },
        };

        if (cursor) {
          where.id = {
            gt: cursor,
          };
        }

        const wordClouds = await prisma.wordCloud.findMany({
          where,
          orderBy: {
            createdAt: 'asc',
          },
          take: pageSize + 1, // Fetch one extra to determine if there are more pages
          select: {
            id: true,
            name: true,
            config: true,
            status: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                exports: true,
              },
            },
          },
        });

        const hasMore = wordClouds.length > pageSize;
        const items = hasMore ? wordClouds.slice(0, -1) : wordClouds;
        const nextCursor = hasMore ? items[items.length - 1].id : undefined;

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Word clouds listed successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          count: items.length,
        });

        return reply.code(200).send({
          data: {
            wordClouds: items,
            pagination: {
              page,
              pageSize,
              hasMore,
              nextCursor,
            },
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to list word clouds',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list word clouds',
          },
          requestId,
        });
      }
    },
  );

  // POST /api/v1/word-clouds - Create word cloud
  fastify.post(
    '/word-clouds',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId, userId } = request;

      try {
        const data = CreateWordCloudSchema.parse(request.body);

        // Create word cloud
        const wordCloud = await prisma.wordCloud.create({
          data: {
            name: data.name,
            config: data.config,
            status: 'draft',
            version: 1,
            tenantId,
            userId,
          },
          select: {
            id: true,
            name: true,
            config: true,
            status: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Create initial config version
        await prisma.wordCloudConfigVersion.create({
          data: {
            wordCloudId: wordCloud.id,
            versionNumber: 1,
            snapshot: data.config,
            createdById: userId,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Word cloud created successfully',
          statusCode: 201,
          durationMs: duration,
          tenantId,
          userId,
          wordCloudId: wordCloud.id,
        });

        return reply.code(201).send({
          data: {
            wordCloud,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Word cloud creation validation failed',
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
          message: 'Failed to create word cloud',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create word cloud',
          },
          requestId,
        });
      }
    },
  );

  // PUT /api/v1/word-clouds - Update word cloud
  fastify.put(
    '/word-clouds',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId, userId } = request;

      try {
        const data = UpdateWordCloudSchema.parse(request.body);

        // Find existing word cloud
        const existingWordCloud = await prisma.wordCloud.findUnique({
          where: {
            id: data.id,
            tenantId,
          },
        });

        if (!existingWordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId: data.id,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'WORD_CLOUD_NOT_FOUND',
              message: 'Word cloud not found',
            },
            requestId,
          });
        }

        // Update word cloud
        const updatedConfig = {
          ...existingWordCloud.config,
          ...data.config,
        };

        const wordCloud = await prisma.wordCloud.update({
          where: {
            id: data.id,
            tenantId,
          },
          data: {
            name: data.name || existingWordCloud.name,
            config: updatedConfig,
            version: {
              increment: 1,
            },
          },
          select: {
            id: true,
            name: true,
            config: true,
            status: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Create new config version
        await prisma.wordCloudConfigVersion.create({
          data: {
            wordCloudId: wordCloud.id,
            versionNumber: wordCloud.version,
            snapshot: updatedConfig,
            createdById: userId,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Word cloud updated successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          userId,
          wordCloudId: wordCloud.id,
        });

        return reply.code(200).send({
          data: {
            wordCloud,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Word cloud update validation failed',
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
          message: 'Failed to update word cloud',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update word cloud',
          },
          requestId,
        });
      }
    },
  );

  // DELETE /api/v1/word-clouds - Delete word cloud
  fastify.delete(
    '/word-clouds',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;

      try {
        const data = DeleteWordCloudSchema.parse(request.body);

        // Find existing word cloud
        const existingWordCloud = await prisma.wordCloud.findUnique({
          where: {
            id: data.id,
            tenantId,
          },
        });

        if (!existingWordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId: data.id,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'WORD_CLOUD_NOT_FOUND',
              message: 'Word cloud not found',
            },
            requestId,
          });
        }

        // Soft delete word cloud
        await prisma.wordCloud.update({
          where: {
            id: data.id,
            tenantId,
          },
          data: {
            status: 'deleted',
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Word cloud deleted successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          wordCloudId: data.id,
        });

        return reply.code(200).send({
          data: {
            message: 'Word cloud deleted successfully',
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Word cloud deletion validation failed',
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
          message: 'Failed to delete word cloud',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete word cloud',
          },
          requestId,
        });
      }
    },
  );

  // GET /api/v1/word-clouds/:id - Get word cloud by ID
  fastify.get(
    '/word-clouds/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;
      const { id } = request.params as { id: string };

      try {
        // Find word cloud
        const wordCloud = await prisma.wordCloud.findUnique({
          where: {
            id,
            tenantId,
            status: {
              not: 'deleted',
            },
          },
          select: {
            id: true,
            name: true,
            config: true,
            status: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                exports: true,
              },
            },
          },
        });

        if (!wordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId: id,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'WORD_CLOUD_NOT_FOUND',
              message: 'Word cloud not found',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Word cloud retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          wordCloudId: id,
        });

        return reply.code(200).send({
          data: {
            wordCloud,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to retrieve word cloud',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve word cloud',
          },
          requestId,
        });
      }
    },
  );
}