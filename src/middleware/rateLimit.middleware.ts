import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/lib/utils/logger';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: FastifyRequest) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = options;

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const key = keyGenerator(request);
    const now = Date.now();
    const resetAt = now + windowMs;

    const record = rateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      // New window
      rateLimitStore.set(key, { count: 1, resetAt });
      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', maxRequests - 1);
      reply.header('X-RateLimit-Reset', new Date(resetAt).toISOString());
      return;
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      logger.warn({
        requestId: request.id,
        message: 'Rate limit exceeded',
        statusCode: 429,
        key,
        count: record.count,
        maxRequests,
        path: request.url,
      });

      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', 0);
      reply.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
      reply.header('Retry-After', Math.ceil((record.resetAt - now) / 1000));

      return reply.code(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((record.resetAt - now) / 1000),
        },
        requestId: request.id,
      });
    }

    // Increment counter
    record.count++;
    rateLimitStore.set(key, record);

    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', maxRequests - record.count);
    reply.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
  };
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    // Rate limit by IP + email for login attempts
    const email = (req.body as any)?.email || '';
    return `auth:${req.ip}:${email}`;
  },
});

export const apiRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const embedRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute (for embed widgets)
  keyGenerator: (req) => {
    // Rate limit by embed token or IP
    const embedToken = req.headers['x-embed-token'] as string;
    return embedToken ? `embed:${embedToken}` : `embed:ip:${req.ip}`;
  },
});

export const exportRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 exports per hour
});