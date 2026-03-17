import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';
import { createIdempotencyMiddleware } from '@/middleware';

const EventSchema = z.object({
  type: z.enum(['word_click', 'word_hover', 'word_exit', 'cloud_view', 'export_click']),
  wordCloudId: z.string().uuid(),
  word: z.string().min(1).max(100).optional(),
  sessionId: z.string().min(1).max(100),
  pageUrl: z.string().url().optional(),
  duration: z.number().min(0).optional(),
  metadata: z.record(z.string()).optional(),
});

type EventRequest = z.infer<typeof EventSchema>;

export async function eventsRoute(fastify: FastifyInstance) {
  // POST /api/v1/events - Record word cloud event
  fastify.post(
    '/events',
    {
      preHandler: [createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        const data = EventSchema.parse(request.body);

        // Extract country from IP if available
        const ip = request.ip || request.headers['x-forwarded-for'] || '0.0.0.0';
        
        // In production, we would use a geolocation service to get country from IP
        // For now, we'll use a placeholder
        const country = 'Unknown';

        // Create event record
        const event = await prisma.wordCloudClickEvent.create({
          data: {
            type: data.type,
            wordCloudId: data.wordCloudId,
            word: data.word || null,
            sessionId: data.sessionId,
            pageUrl: data.pageUrl || null,
            clickDuration: data.duration || 0,
            country,
            deviceType: data.metadata?.deviceType || 'unknown',
            ipAddress: ip,
            metadata: data.metadata || {},
          },
          select: {
            id: true,
            type: true,
            wordCloudId: true,
            word: true,
            sessionId: true,
            createdAt: true,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Event recorded successfully',
          statusCode: 201,
          durationMs: duration,
          eventType: data.type,
          wordCloudId: data.wordCloudId,
          sessionId: data.sessionId,
        });

        return reply.code(201).send({
          data: {
            event,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Event recording validation failed',
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
          message: 'Failed to record event',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to record event',
          },
          requestId,
        });
      }
    },
  );
}