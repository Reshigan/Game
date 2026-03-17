import { Redis } from '@upstash/redis';
import { createId } from '@paralleldrive/cuid2';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Redis client for distributed rate limiting
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `${config.keyPrefix || 'rl'}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Use Redis transaction for atomic operations
    const results = await redis
      .multi()
      .zremrangebyscore(key, 0, windowStart)
      .zcard(key)
      .zadd(key, { nx: true, score: now, member: createId() })
      .expire(key, Math.ceil(config.windowMs / 1000))
      .exec();
    
    const count = results[1] as number;
    const remaining = Math.max(0, config.maxRequests - count);
    const reset = now + config.windowMs;
    
    return {
      success: count < config.maxRequests,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if Redis is unavailable
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: now + config.windowMs,
    };
  }
}

// Predefined rate limiters
export const rateLimiters = {
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'public',
  },
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'auth',
  },
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'write',
  },
  analytics: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    keyPrefix: 'analytics',
  },
};