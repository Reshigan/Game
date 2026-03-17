// src/lib/cache/client.ts
import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

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

  client.on('error', (error: Error) => {
    logger.error({
      message: 'Redis connection error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  });

  client.on('connect', () => {
    logger.info({ message: 'Redis client connected' });
  });

  client.on('ready', () => {
    logger.info({ message: 'Redis client ready' });
  });

  client.on('close', () => {
    logger.warn({ message: 'Redis connection closed' });
  });

  client.on('reconnecting', () => {
    logger.info({ message: 'Redis client reconnecting' });
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
 * Cache utility functions with typed serialization.
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      // If parsing fails, return the raw value for string caches
      return value as unknown as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
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

  async increment(key: string, by = 1): Promise<number> {
    return redis.incrby(key, by);
  },

  async decrement(key: string, by = 1): Promise<number> {
    return redis.decrby(key, by);
  },

  async setWithExpiry(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
  },

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await cache.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Acquire a distributed lock.
   */
  async acquireLock(
    key: string,
    ttlMs: number,
    retries = 3,
    retryDelayMs = 100
  ): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      const acquired = await redis.set(key, lockId, 'PX', ttlMs, 'NX');
      if (acquired === 'OK') {
        return lockId;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    
    return null;
  },

  /**
   * Release a distributed lock.
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, key, lockId);
    return result === 1;
  },
};

/**
 * Rate limiting helper.
 */
export const rateLimit = {
  async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    const count = await redis.zcard(key);
    
    if (count >= limit) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length >= 2 ? parseInt(oldest[1] as string, 10) + windowMs : now + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }
    
    // Add current request
    await redis.zadd(key, now.toString(), `${now}-${Math.random().toString(36).substring(2, 9)}`);
    await redis.expire(key, Math.ceil(windowMs / 1000));
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowMs,
    };
  },
};

/**
 * Graceful shutdown.
 */
export async function disconnectCache(): Promise<void> {
  await redis.quit();
}

export default redis;