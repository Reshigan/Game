// src/app/api/v1/word-clouds/route.ts
/**
 * Word Cloud API Routes
 * Handles CRUD operations for word clouds
 * 
 * Refactored for maintainability - logic extracted into separate modules
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger, log } from '@/lib/utils/logger';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenant } from '@/middleware/tenant.middleware';
import { rateLimitMiddleware } from '@/middleware/rateLimit.middleware';

// Validation schemas
const createWordCloudSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  config: z.object({
    words: z.array(z.object({
      text: z.string().min(1).max(100),
      weight: z.number().min(1).max(100),
      color: z.string().optional(),
    })).min(1).max(500),
    width: z.number().min(100).max(2000).optional(),
    height: z.number().min(100).max(2000).optional(),
    backgroundColor: z.string().optional(),
    fontFamily: z.string().optional(),
    rotationRange: z.tuple([z.number(), z.number()]).optional(),
    colors: z.array(z.string()).optional(),
  }),
});

const updateWordCloudSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  config: z.object({
    words: z.array(z.object({
      text: z.string().min(1).max(100),
      weight: z.number().min(1).max(100),
      color: z.string().optional(),
    })).min(1).max(500),
    width: z.number().min(100).max(2000).optional(),
    height: z.number().min(100).max(2000).optional(),
    backgroundColor: z.string().optional(),
    fontFamily: z.string().optional(),
    rotationRange: z.tuple([z.number(), z.number()]).optional(),
    colors: z.array(z.string()).optional(),
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
interface CreateWordCloudBody {
  name: string;
  description?: string;
  config: WordCloudConfig;
}

interface UpdateWordCloudBody {
  name?: string;
  description?: string;
  config?: WordCloudConfig;
  status?: 'draft' | 'published' | 'archived';
}

interface WordCloudConfig {
  words: Array<{ text: string; weight: number; color?: string }>;
  width?: number;
  height?: number;
  backgroundColor?: string;
  fontFamily?: string;
  rotationRange?: [number, number];
  colors?: string[];
}

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

// Helper functions (extracted for maintainability)
async function validateWordCloudOwnership(
  wordCloudId: string,
  tenantId: string
): Promise<{ valid: boolean; wordCloud?: unknown }> {
  const wordCloud = await prisma.wordCloud.findFirst({
    where: {
      id: wordCloudId,
      tenantId,
    },
  });

  return {
    valid: !!wordCloud,
    wordCloud: wordCloud ?? undefined,
  };
}

async function createAuditLog(
  tenantId: string,
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      resource,
      resourceId,
      changes: changes ?? undefined,
    },
  });
}

function buildWhereClause(
  tenantId: string,
  filters: { status?: string; search?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

// Route handlers
async function listWordClouds(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { page, pageSize, status, search, sortBy, sortOrder } = listQuerySchema.parse(request.query);
  const tenantId = request.user.tenantId;

  log.debug({
    message: 'Listing word clouds',
    tenantId,
    page,
    pageSize,
    status,
    search,
  });

  const where = buildWhereClause(tenantId, { status, search });

  const [wordClouds, total] = await Promise.all([
    prisma.wordCloud.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { exports: true },
        },
      },
    }),
    prisma.wordCloud.count({ where }),
  ]);

  return reply.send({
    data: wordClouds,
    pagination: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
  });
}

async function getWordCloud(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  const tenantId = request.user.tenantId;

  const wordCloud = await prisma.wordCloud.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      configVersions: {
        take: 10,
        orderBy: { versionNumber: 'desc' },
      },
    },
  });

  if (!wordCloud) {
    return reply.code(404).send({
      error: 'Not Found',
      message: 'Word cloud not found',
      code: 'WORDCLOUD_NOT_FOUND',
    });
  }

  return reply.send({ data: wordCloud });
}

async function createWordCloud(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const body = createWordCloudSchema.parse(request.body);
  const userId = request.user.id;
  const tenantId = request.user.tenantId;

  log.info({
    message: 'Creating word cloud',
    tenantId,
    userId,
    name: body.name,
  });

  const wordCloud = await prisma.wordCloud.create({
    data: {
      tenantId,
      userId,
      name: body.name,
      description: body.description,
      config: body.config,
      status: 'draft',
    },
  });

  await createAuditLog(
    tenantId,
    userId,
    'create',
    'word_cloud',
    wordCloud.id,
    { new: wordCloud }
  );

  return reply.code(201).send({
    data: wordCloud,
    message: 'Word cloud created successfully',
  });
}

async function updateWordCloud(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  const body = updateWordCloudSchema.parse(request.body);
  const userId = request.user.id;
  const tenantId = request.user.tenantId;

  const { valid, wordCloud } = await validateWordCloudOwnership(id, tenantId);

  if (!valid) {
    return reply.code(404).send({
      error: 'Not Found',
      message: 'Word cloud not found',
      code: 'WORDCLOUD_NOT_FOUND',
    });
  }

  // Create a version snapshot if config is being updated
  if (body.config) {
    await prisma.wordCloudConfigVersion.create({
      data: {
        wordCloudId: id,
        versionNumber: (wordCloud as { version: number }).version + 1,
        snapshot: body.config,
        createdById: userId,
      },
    });
  }

  const updatedWordCloud = await prisma.wordCloud.update({
    where: { id },
    data: {
      ...body,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  await createAuditLog(
    tenantId,
    userId,
    'update',
    'word_cloud',
    id,
    { old: wordCloud, new: updatedWordCloud }
  );

  return reply.send({
    data: updatedWordCloud,
    message: 'Word cloud updated successfully',
  });
}

async function deleteWordCloud(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  const userId = request.user.id;
  const tenantId = request.user.tenantId;

  const { valid, wordCloud } = await validateWordCloudOwnership(id, tenantId);

  if (!valid) {
    return reply.code(404).send({
      error: 'Not Found',
      message: 'Word cloud not found',
      code: 'WORDCLOUD_NOT_FOUND',
    });
  }

  await prisma.wordCloud.delete({
    where: { id },
  });

  await createAuditLog(
    tenantId,
    userId,
    'delete',
    'word_cloud',
    id,
    { old: wordCloud }
  );

  return reply.send({
    message: 'Word cloud deleted successfully',
  });
}

async function publishWordCloud(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  const userId = request.user.id;
  const tenantId = request.user.tenantId;

  const { valid, wordCloud } = await validateWordCloudOwnership(id, tenantId);

  if (!valid) {
    return reply.code(404).send({
      error: 'Not Found',
      message: 'Word cloud not found',
      code: 'WORDCLOUD_NOT_FOUND',
    });
  }

  // Generate embed ID if not exists
  const embedId = (wordCloud as { embedId?: string }).embedId ?? 
    `embed_${Buffer.from(id).toString('base64url')}`;

  const updatedWordCloud = await prisma.wordCloud.update({
    where: { id },
    data: {
      status: 'published',
      embedId,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  await createAuditLog(
    tenantId,
    userId,
    'publish',
    'word_cloud',
    id,
    { old: wordCloud, new: updatedWordCloud }
  );

  return reply.send({
    data: updatedWordCloud,
    message: 'Word cloud published successfully',
  });
}

// Register routes
export async function wordCloudRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply middleware
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireTenant);
  fastify.addHook('preHandler', rateLimitMiddleware);

  // List word clouds
  fastify.get('/', listWordClouds);

  // Get single word cloud
  fastify.get('/:id', getWordCloud);

  // Create word cloud
  fastify.post('/', createWordCloud);

  // Update word cloud
  fastify.patch('/:id', updateWordCloud);

  // Delete word cloud
  fastify.delete('/:id', deleteWordCloud);

  // Publish word cloud
  fastify.post('/:id/publish', publishWordCloud);

  log.info({ message: 'Word cloud routes registered' });
}

export default wordCloudRoutes;