import { FastifyInstance } from 'fastify';
import { healthRoute } from '@/app/api/v1/health/route';
import { authRoutes } from '@/routes/auth.routes';
import { wordCloudRoutes } from '@/routes/wordCloud.routes';
import { analyticsRoutes } from '@/routes/analytics.routes';
import { eventRoutes } from '@/routes/event.routes';
import { embedRoutes } from '@/routes/embed.routes';
import { exportRoutes } from '@/routes/export.routes';
import { tenantRoutes } from '@/routes/tenant.routes';
import { notificationRoutes } from '@/routes/notification.routes';

/**
 * API Version 1 routes.
 * All routes are prefixed with /api/v1/
 */
export async function registerV1Routes(fastify: FastifyInstance): Promise<void> {
  // Health endpoints (no auth required)
  await fastify.register(
    async (instance) => {
      await healthRoute(instance);
    },
    { prefix: '/api/v1' }
  );

  // Authentication routes
  await fastify.register(
    async (instance) => {
      await authRoutes(instance);
    },
    { prefix: '/api/v1/auth' }
  );

  // Word cloud routes (auth required)
  await fastify.register(
    async (instance) => {
      await wordCloudRoutes(instance);
    },
    { prefix: '/api/v1/wordclouds' }
  );

  // Analytics routes (auth required)
  await fastify.register(
    async (instance) => {
      await analyticsRoutes(instance);
    },
    { prefix: '/api/v1/analytics' }
  );

  // Event routes (public for embed widget)
  await fastify.register(
    async (instance) => {
      await eventRoutes(instance);
    },
    { prefix: '/api/v1/events' }
  );

  // Embed routes (public)
  await fastify.register(
    async (instance) => {
      await embedRoutes(instance);
    },
    { prefix: '/api/v1/embed' }
  );

  // Export routes (auth required)
  await fastify.register(
    async (instance) => {
      await exportRoutes(instance);
    },
    { prefix: '/api/v1/exports' }
  );

  // Tenant management routes (admin required)
  await fastify.register(
    async (instance) => {
      await tenantRoutes(instance);
    },
    { prefix: '/api/v1/tenants' }
  );

  // Notification routes (auth required)
  await fastify.register(
    async (instance) => {
      await notificationRoutes(instance);
    },
    { prefix: '/api/v1/notifications' }
  );
}

/**
 * Register all API routes with versioning.
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Register v1 routes
  await registerV1Routes(fastify);

  // Future versions would be registered here:
  // await registerV2Routes(fastify);
}