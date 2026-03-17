import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authMiddleware, tenantMiddleware } from '@/middleware';
import { logger } from '@/lib/utils/logger';

const GetAnalyticsSchema = z.object({
  wordCloudId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
});

type GetAnalyticsRequest = z.infer<typeof GetAnalyticsSchema>;

export async function analyticsRoute(fastify: FastifyInstance) {
  // GET /api/v1/analytics - Get word cloud analytics
  fastify.get(
    '/analytics',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;

      try {
        const { wordCloudId, startDate, endDate, granularity } = GetAnalyticsSchema.parse(request.query);

        // Find word cloud
        const wordCloud = await prisma.wordCloud.findUnique({
          where: {
            id: wordCloudId,
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
            wordCloudId,
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

        // Build date range filter
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
          dateFilter.lte = new Date(endDate);
        }

        // Get click counts by word
        const wordClicks = await prisma.$queryRaw`
          SELECT 
            word,
            COUNT(*) as click_count,
            AVG(click_duration) as avg_duration
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()}
          GROUP BY word
          ORDER BY click_count DESC
          LIMIT 100;
        `;

        // Get hourly click distribution
        const hourlyDistribution = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('${granularity || 'day'}', created_at) as time_bucket,
            COUNT(*) as click_count
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()}
          GROUP BY time_bucket
          ORDER BY time_bucket ASC;
        `;

        // Get top pages/urls
        const topPages = await prisma.$queryRaw`
          SELECT 
            page_url,
            COUNT(*) as click_count,
            COUNT(DISTINCT session_id) as unique_sessions
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()}
          GROUP BY page_url
          ORDER BY click_count DESC
          LIMIT 10;
        `;

        // Get device breakdown
        const deviceBreakdown = await prisma.$queryRaw`
          SELECT 
            device_type,
            COUNT(*) as click_count,
            COUNT(DISTINCT session_id) as unique_sessions
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()}
          GROUP BY device_type
          ORDER BY click_count DESC;
        `;

        // Get geographic distribution (country level)
        const geographicDistribution = await prisma.$queryRaw`
          SELECT 
            country,
            COUNT(*) as click_count,
            COUNT(DISTINCT session_id) as unique_sessions
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()}
          GROUP BY country
          ORDER BY click_count DESC
          LIMIT 20;
        `;

        // Calculate summary metrics
        const totalClicks = await prisma.$queryRaw`
          SELECT COUNT(*) as total
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()};
        `;

        const totalSessions = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT session_id) as total
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()};
        `;

        const avgClickDuration = await prisma.$queryRaw`
          SELECT AVG(click_duration) as avg
          FROM word_cloud_click_events
          WHERE word_cloud_id = ${wordCloudId}
            AND created_at >= ${startDate || '1970-01-01'}
            AND created_at <= ${endDate || new Date()};
        `;

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Analytics retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
          wordCloudId,
        });

        return reply.code(200).send({
          data: {
            wordCloudId,
            summary: {
              totalClicks: totalClicks[0]?.total || 0,
              totalSessions: totalSessions[0]?.total || 0,
              avgClickDuration: avgClickDuration[0]?.avg || 0,
            },
            wordClicks,
            hourlyDistribution,
            topPages,
            deviceBreakdown,
            geographicDistribution,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Analytics request validation failed',
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
          message: 'Failed to retrieve analytics',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve analytics',
          },
          requestId,
        });
      }
    },
  );
}