import { FastifyInstance } from 'fastify';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/cache/client';
import { s3Client } from '@/lib/storage/client';
import { logger } from '@/lib/utils/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
    storage: 'ok' | 'error';
  };
}

/**
 * Health check endpoint.
 * Returns dependency status for database, cache, and storage.
 * Used by load balancers and monitoring systems.
 */
export async function healthRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (request, reply) => {
    const requestId = request.id;
    const startTime = Date.now();
    const dependencies: HealthStatus['dependencies'] = {
      database: 'ok',
      cache: 'ok',
      storage: 'ok',
    };

    try {
      // Check database connection with timeout
      const dbPromise = prisma.$queryRaw`SELECT 1 as result`.then(() => 'ok' as const);
      const dbTimeout = new Promise<'error'>((resolve) =>
        setTimeout(() => resolve('error'), 5000)
      );
      const dbResult = await Promise.race([dbPromise, dbTimeout]);
      dependencies.database = dbResult;
    } catch (error) {
      dependencies.database = 'error';
      logger.error({
        requestId,
        message: 'Database health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      // Check Redis connection with timeout
      const cachePromise = redis.ping().then(() => 'ok' as const);
      const cacheTimeout = new Promise<'error'>((resolve) =>
        setTimeout(() => resolve('error'), 5000)
      );
      const cacheResult = await Promise.race([cachePromise, cacheTimeout]);
      dependencies.cache = cacheResult;
    } catch (error) {
      dependencies.cache = 'error';
      logger.error({
        requestId,
        message: 'Cache health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      // Check S3-compatible storage connection with timeout
      const storagePromise = s3Client
        .listBuckets()
        .promise()
        .then(() => 'ok' as const);
      const storageTimeout = new Promise<'error'>((resolve) =>
        setTimeout(() => resolve('error'), 5000)
      );
      const storageResult = await Promise.race([storagePromise, storageTimeout]);
      dependencies.storage = storageResult;
    } catch (error) {
      dependencies.storage = 'error';
      logger.error({
        requestId,
        message: 'Storage health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Determine overall status
    const errorCount = Object.values(dependencies).filter((s) => s === 'error').length;
    const status: HealthStatus['status'] =
      errorCount === 0 ? 'healthy' : errorCount < 3 ? 'degraded' : 'unhealthy';

    const duration = Date.now() - startTime;

    logger.info({
      requestId,
      message: 'Health check completed',
      statusCode: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503,
      durationMs: duration,
      dependencies,
      status,
    });

    const response: HealthStatus = {
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies,
    };

    const statusCode = status === 'unhealthy' ? 503 : 200;
    return reply.code(statusCode).send(response);
  });

  // Liveness probe for Kubernetes
  fastify.get('/health/live', async (request, reply) => {
    return reply.code(200).send({ status: 'alive' });
  });

  // Readiness probe for Kubernetes
  fastify.get('/health/ready', async (request, reply) => {
    const requestId = request.id;

    try {
      // Quick check without detailed status
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();

      return reply.code(200).send({ status: 'ready' });
    } catch (error) {
      logger.error({
        requestId,
        message: 'Readiness check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(503).send({ status: 'not ready' });
    }
  });
}