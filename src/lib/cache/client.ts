import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

/**
 * Redis client singleton for caching and rate limiting.
 * Supports both standalone and cluster modes.
 */
let redis: Redis;

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    lazyConnect: false,
    // TLS configuration for production
    tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  });

  client.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  client.on('ready', () => {
    console.log('Redis ready');
  });

  return client;
}

// Use global in development to prevent multiple connections
if (process.env.NODE_ENV === 'production') {
  redis = createRedisClient();
} else {
  if (!global.redis) {
    global.redis = createRedisClient();
  }
  redis = global.redis;
}

export { redis };

/**
 * Cache utility functions.
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },

  async deletePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return redis.del(...keys);
  },

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const result = await redis.incr(key);
    if (ttlSeconds && result === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return result;
  },
};

/**
 * Session management utilities.
 */
export const session = {
  async create(sessionId: string, data: Record<string, any>, ttlSeconds = 3600): Promise<void> {
    await cache.set(`session:${sessionId}`, data, ttlSeconds);
  },

  async get<T>(sessionId: string): Promise<T | null> {
    return cache.get<T>(`session:${sessionId}`);
  },

  async delete(sessionId: string): Promise<void> {
    await cache.delete(`session:${sessionId}`);
  },

  async refresh(sessionId: string, ttlSeconds = 3600): Promise<boolean> {
    const exists = await cache.exists(`session:${sessionId}`);
    if (exists) {
      await redis.expire(`session:${sessionId}`, ttlSeconds);
      return true;
    }
    return false;
  },
};

/**
 * Rate limiting utilities.
 */
export const rateLimit = {
  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const current = await cache.increment(key, windowSeconds);
    const remaining = Math.max(0, maxRequests - current);
    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000);

    return {
      allowed: current <= maxRequests,
      remaining,
      resetAt,
    };
  },
};

/**
 * Graceful shutdown handler.
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

/**
 * Health check for Redis connection.
 */
export async function checkRedisConnection(): Promise<{
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}