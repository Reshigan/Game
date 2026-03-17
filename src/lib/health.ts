import { db } from './db/client';
import { sql } from 'drizzle-orm';
import { createLogger } from './logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  requestId: string;
  dependencies: {
    database: 'ok' | 'error' | 'timeout';
    cache: 'ok' | 'error' | 'timeout' | 'not_configured';
    storage: 'ok' | 'error' | 'timeout' | 'not_configured';
  };
  checks: {
    name: string;
    status: 'pass' | 'fail';
    duration: number;
    message?: string;
  }[];
}

export async function checkHealth(requestId: string): Promise<HealthStatus> {
  const logger = createLogger(requestId);
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = [];
  
  const dependencies: HealthStatus['dependencies'] = {
    database: 'ok',
    cache: 'not_configured',
    storage: 'not_configured',
  };

  // Check database
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.push({
      name: 'database',
      status: 'pass',
      duration: Date.now() - dbStart,
    });
    dependencies.database = 'ok';
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown database error');
    logger.error('system', 'Database health check failed', err);
    checks.push({
      name: 'database',
      status: 'fail',
      duration: Date.now() - startTime,
      message: err.message,
    });
    dependencies.database = 'error';
  }

  // Check cache (Redis/Upstash) if configured
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    const cacheStart = Date.now();
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      await redis.ping();
      checks.push({
        name: 'cache',
        status: 'pass',
        duration: Date.now() - cacheStart,
      });
      dependencies.cache = 'ok';
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown cache error');
      logger.warn('system', 'Cache health check failed', { error: err.message });
      checks.push({
        name: 'cache',
        status: 'fail',
        duration: Date.now() - cacheStart,
        message: err.message,
      });
      dependencies.cache = 'error';
    }
  }

  // Check storage (Vercel Blob / S3) if configured
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.AWS_ACCESS_KEY_ID) {
    const storageStart = Date.now();
    try {
      // For Vercel Blob, we just check if the token is present
      // A full check would require making an actual API call
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        checks.push({
          name: 'storage',
          status: 'pass',
          duration: Date.now() - storageStart,
        });
        dependencies.storage = 'ok';
      } else if (process.env.AWS_ACCESS_KEY_ID) {
        // For S3, we could do a ListBuckets or HeadBucket call
        // For now, we'll just mark as configured
        checks.push({
          name: 'storage',
          status: 'pass',
          duration: Date.now() - storageStart,
        });
        dependencies.storage = 'ok';
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown storage error');
      logger.warn('system', 'Storage health check failed', { error: err.message });
      checks.push({
        name: 'storage',
        status: 'fail',
        duration: Date.now() - storageStart,
        message: err.message,
      });
      dependencies.storage = 'error';
    }
  }

  // Determine overall status
  const hasErrors = checks.some(c => c.status === 'fail');
  const status: HealthStatus['status'] = hasErrors ? 'unhealthy' : 'healthy';

  logger.info('system', 'Health check completed', {
    status,
    dependencyCount: Object.keys(dependencies).length,
    checkCount: checks.length,
  });

  return {
    status,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    requestId,
    dependencies,
    checks,
  };
}