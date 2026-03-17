import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authMiddleware, tenantMiddleware } from '@/middleware';
import { logger } from '@/lib/utils/logger';
import { createIdempotencyMiddleware } from '@/middleware';

const ExportSchema = z.object({
  wordCloudId: z.string().uuid(),
  format: z.enum(['png', 'svg', 'json', 'csv']),
});

type ExportRequest = z.infer<typeof ExportSchema>;

export async function exportRoute(fastify: FastifyInstance) {
  // POST /api/v1/export - Export word cloud
  fastify.post(
    '/export',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId, userId } = request;

      try {
        const data = ExportSchema.parse(request.body);

        // Find word cloud
        const wordCloud = await prisma.wordCloud.findUnique({
          where: {
            id: data.wordCloudId,
            tenantId,
            status: {
              not: 'deleted',
            },
          },
        });

        if (!wordCloud) {
          logger.warn({
            requestId,
            message: 'Word cloud not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            wordCloudId: data.wordCloudId,
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

        // Create export job
        const job = await prisma.job.create({
          data: {
            type: 'export_word_cloud',
            payload: {
              wordCloudId: data.wordCloudId,
              format: data.format,
              userId,
              tenantId,
            },
            status: 'pending',
            tenantId,
          },
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Export job created successfully',
          statusCode: 202,
          durationMs: duration,
          tenantId,
          userId,
          wordCloudId: data.wordCloudId,
          format: data.format,
          jobId: job.id,
        });

        return reply.code(202).send({
          data: {
            job,
            message: 'Export job queued successfully',
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Export request validation failed',
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
          message: 'Failed to create export job',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create export job',
          },
          requestId,
        });
      }
    },
  );

  // GET /api/v1/export/:id - Get export job status
  fastify.get(
    '/export/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;
      const { id } = request.params as { id: string };

      try {
        // Find export job
        const job = await prisma.job.findUnique({
          where: {
            id,
            tenantId,
          },
          select: {
            id: true,
            type: true,
            status: true,
            payload: true,
            result: true,
            error: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
          },
        });

        if (!job) {
          logger.warn({
            requestId,
            message: 'Export job not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            jobId: id,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'JOB_NOT_FOUND',
              message: 'Export job not found',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Export job status retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          jobId: id,
          status: job.status,
        });

        return reply.code(200).send({
          data: {
            job,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to retrieve export job status',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve export job status',
          },
          requestId,
        });
      }
    },
  );
}