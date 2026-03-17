import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authMiddleware, tenantMiddleware } from '@/middleware';
import { logger } from '@/lib/utils/logger';

const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.any()).optional(),
});

type UpdateTenantRequest = z.infer<typeof UpdateTenantSchema>;

export async function tenantsRoute(fastify: FastifyInstance) {
  // GET /api/v1/tenants - Get tenant details
  fastify.get(
    '/tenants',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;

      try {
        // Find tenant
        const tenant = await prisma.tenant.findUnique({
          where: {
            id: tenantId,
          },
          select: {
            id: true,
            name: true,
            settings: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
                wordClouds: true,
              },
            },
          },
        });

        if (!tenant) {
          logger.warn({
            requestId,
            message: 'Tenant not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'TENANT_NOT_FOUND',
              message: 'Tenant not found',
            },
            requestId,
          });
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Tenant details retrieved successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
        });

        return reply.code(200).send({
          data: {
            tenant,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error({
          requestId,
          message: 'Failed to retrieve tenant details',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve tenant details',
          },
          requestId,
        });
      }
    },
  );

  // PUT /api/v1/tenants - Update tenant
  fastify.put(
    '/tenants',
    {
      preHandler: [authMiddleware, tenantMiddleware, createIdempotencyMiddleware()],
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();
      const { tenantId } = request;

      try {
        const data = UpdateTenantSchema.parse(request.body);

        // Find tenant
        const existingTenant = await prisma.tenant.findUnique({
          where: {
            id: tenantId,
          },
        });

        if (!existingTenant) {
          logger.warn({
            requestId,
            message: 'Tenant not found',
            statusCode: 404,
            durationMs: Date.now() - startTime,
            tenantId,
          });

          return reply.code(404).send({
            error: {
              code: 'TENANT_NOT_FOUND',
              message: 'Tenant not found',
            },
            requestId,
          });
        }

        // Update tenant
        const tenant = await prisma.tenant.update({
          where: {
            id: tenantId,
          },
          data: {
            name: data.name || existingTenant.name,
            settings: {
              ...existingTenant.settings,
              ...data.settings,
            },
          },
          select: {
            id: true,
            name: true,
            settings: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Tenant updated successfully',
          statusCode: 200,
          durationMs: duration,
          tenantId,
        });

        return reply.code(200).send({
          data: {
            tenant,
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Tenant update validation failed',
            statusCode: 400,
            durationMs: duration,
            errors: error.errors,
          });

          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
            requestId,
          });
        }

        logger.error({
          requestId,
          message: 'Failed to update tenant',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update tenant',
          },
          requestId,
        });
      }
    },
  );
}