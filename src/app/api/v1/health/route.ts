import { FastifyInstance } from 'fastify';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/cache/client';
import { logger } from '@/lib/utils/logger';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    const requestId = request.id;
    const startTime = Date.now();

    try {
      // Check database connection
      const dbStatus = await prisma.$queryRaw`SELECT 1 as result;`
        .then(() => 'ok')
        .catch(() => 'error');

      // Check Redis connection
      const cacheStatus = await redis.ping()
        .then(() => 'ok')
        .catch(() => 'error');

      const uptime = process.uptime();
      const duration = Date.now() - startTime;

      const response = {
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime,
        dependencies: {
          db: dbStatus,
          cache: cacheStatus,
        },
      };

      logger.info({
        requestId,
        message: 'Health check completed',
        statusCode: 200,
        durationMs: duration,
        dependencies: response.dependencies,
      });

      return reply.code(200).send(response);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        requestId,
        message: 'Health check failed',
        statusCode: 503,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(503).send({
        status: 'unhealthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          db: 'error',
          cache: 'error',
        },
      });
    }
  });
}