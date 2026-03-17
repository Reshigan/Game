import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

/**
 * Tenant isolation middleware - ensures all data access is scoped to the user's tenant.
 * This middleware MUST run after auth middleware to have access to request.user.
 * 
 * CRITICAL: This is a SOX-controlled change affecting data isolation.
 */
export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.id;

  // Skip tenant check for public endpoints
  const publicPaths = [
    '/api/v1/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/embed', // Embed has its own auth
  ];

  if (publicPaths.some((path) => request.url.startsWith(path))) {
    return;
  }

  // User must be authenticated
  if (!request.user) {
    logger.warn({
      requestId,
      message: 'Tenant middleware called without authenticated user',
      statusCode: 401,
      path: request.url,
    });

    return reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      requestId,
    });
  }

  const tenantId = request.user.tenantId;

  // Verify tenant exists and is active
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, plan: true },
  });

  if (!tenant) {
    logger.error({
      requestId,
      message: 'User references non-existent tenant',
      statusCode: 500,
      userId: request.user.userId,
      tenantId,
    });

    return reply.code(500).send({
      error: {
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant configuration error',
      },
      requestId,
    });
  }

  if (tenant.status !== 'active') {
    logger.warn({
      requestId,
      message: 'Tenant is not active',
      statusCode: 403,
      tenantId,
      status: tenant.status,
    });

    return reply.code(403).send({
      error: {
        code: 'TENANT_INACTIVE',
        message: 'Your account is currently unavailable. Please contact support.',
      },
      requestId,
    });
  }

  // Attach tenant info to request for use in controllers
  request.tenantId = tenantId;
  (request as any).tenant = tenant;
}

/**
 * Helper function to add tenant filter to Prisma queries.
 * Use this in all repository functions to ensure tenant isolation.
 */
export function withTenantFilter<T extends { tenantId: string }>(
  userId: string,
  tenantId: string,
  where: T
): T & { tenantId: string } {
  return {
    ...where,
    tenantId,
  };
}

/**
 * Helper to validate resource belongs to user's tenant.
 * Throws error if resource belongs to different tenant.
 */
export async function validateTenantOwnership(
  resourceType: string,
  resourceId: string,
  tenantId: string
): Promise<void> {
  const model = prisma[resourceType as keyof typeof prisma] as any;

  if (!model) {
    throw new Error(`Invalid resource type: ${resourceType}`);
  }

  const resource = await model.findUnique({
    where: { id: resourceId },
    select: { tenantId: true },
  });

  if (!resource) {
    throw new Error(`${resourceType} not found: ${resourceId}`);
  }

  if (resource.tenantId !== tenantId) {
    logger.warn({
      message: 'Cross-tenant access attempt blocked',
      resourceType,
      resourceId,
      userTenantId: tenantId,
      resourceTenantId: resource.tenantId,
    });

    throw new Error('Access denied: resource belongs to different tenant');
  }
}