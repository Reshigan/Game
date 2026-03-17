import { z } from 'zod';

export const wordCloudInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
  words: z.array(
    z.object({
      word: z.string().min(1).max(50),
      frequency: z.number().int().min(1).max(10000),
    })
  ).min(1).max(1000),
});

export const wordCloudUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
  words: z.array(
    z.object({
      word: z.string().min(1).max(50),
      frequency: z.number().int().min(1).max(10000),
    })
  ).min(1).max(1000).optional(),
});

export const analyticsEventInputSchema = z.object({
  wordCloudId: z.string().uuid(),
  eventType: z.enum(['click', 'hover', 'view']),
  word: z.string().min(1).max(50),
  sessionToken: z.string().min(1).max(100),
  metadata: z.record(z.any()).optional(),
});

export const idempotencyKeySchema = z.object({
  'X-Idempotency-Key': z.string().min(1).max(100),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid(),
});

export const userIdSchema = z.object({
  userId: z.string().uuid(),
});

export const wordCloudIdSchema = z.object({
  wordCloudId: z.string().uuid(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const exportRequestSchema = z.object({
  wordCloudId: z.string().uuid(),
  format: z.enum(['csv', 'json', 'png']).default('csv'),
  includeAnalytics: z.boolean().default(true),
});