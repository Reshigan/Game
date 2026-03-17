import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

const EmbedSchema = z.object({
  wordCloudId: z.string().uuid(),
});

type EmbedRequest = z.infer<typeof EmbedSchema>;

export async function embedRoute(fastify: FastifyInstance) {
  // GET /api/v1/embed - Get embeddable word cloud
  fastify.get(
    '/embed',
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const { wordCloudId } = EmbedSchema.parse(request.query);

        // Find word cloud
        const wordCloud = await prisma.wordCloud.findUnique({
          where: {
            id: wordCloudId,
            status: 'published',
          },
          select: {
            id: true,
            name: true,
            config: true,
            createdAt: true,
          },
        });

        if (!wordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found or not published',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId,
          });

          return reply.code(404).send({
            error: {
              code: 'WORD_CLOUD_NOT_FOUND',
              message: 'Word cloud not found or not published',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Embed data retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          wordCloudId,
        });

        return reply.code(200).send({
          data: {
            wordCloudId: wordCloud.id,
            name: wordCloud.name,
            config: wordCloud.config,
            embedUrl: `${process.env.CDN_BASE_URL}/embed/${wordCloud.id}.js`,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Embed request validation failed',
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
          message: 'Failed to retrieve embed data',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve embed data',
          },
          requestId,
        });
      }
    },
  );

  // GET /api/v1/embed/:id - Get word cloud for embedding
  fastify.get(
    '/embed/:id',
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { id } = request.params as { id: string };

      try {
        // Find word cloud
        const wordCloud = await prisma.wordCloud.findUnique({
          where: {
            id,
            status: 'published',
          },
          select: {
            id: true,
            name: true,
            config: true,
            createdAt: true,
          },
        });

        if (!wordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found or not published',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId: id,
          });

          return reply.code(404).send({
            error: {
              code: 'WORD_CLOUD_NOT_FOUND',
              message: 'Word cloud not found or not published',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Embed word cloud retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          wordCloudId: id,
        });

        // Set CORS headers for embedding
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type');

        return reply.code(200).send({
          data: {
            wordCloudId: wordCloud.id,
            name: wordCloud.name,
            config: wordCloud.config,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to retrieve embed word cloud',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve embed word cloud',
          },
          requestId,
        });
      }
    },
  );
}