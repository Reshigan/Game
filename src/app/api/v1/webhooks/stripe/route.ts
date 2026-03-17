import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

const StripeWebhookSchema = z.object({
  id: z.string(),
  object: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
});

type StripeWebhookRequest = z.infer<typeof StripeWebhookSchema>;

export async function stripeWebhookRoute(fastify: FastifyInstance) {
  // POST /api/v1/webhooks/stripe - Stripe webhook endpoint
  fastify.post(
    '/webhooks/stripe',
    {
      config: {
        bodyLimit: 1048576, // 1MB
      },
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        // Verify Stripe signature
        const signature = request.headers['stripe-signature'];
        
        if (!signature) {
          logger.warn({
            requestId,
            message: 'Stripe webhook failed: missing signature',
            statusCode: 400,
            durationMs: Date.now() - startTime,
          });

          return reply.code(400).send({
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Missing Stripe signature',
            },
            requestId,
          });
        }

        // In production, we would verify the signature using Stripe's library
        // For now, we'll just log the webhook event
        const body = request.body as any;

        // Parse webhook event
        const event = StripeWebhookSchema.parse(body);

        // Process webhook event based on type
        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            // Handle subscription updates
            await handleSubscriptionUpdate(event.data.object);
            break;
          case 'customer.subscription.deleted':
            // Handle subscription cancellation
            await handleSubscriptionCancellation(event.data.object);
            break;
          case 'invoice.payment_succeeded':
            // Handle successful payment
            await handlePaymentSuccess(event.data.object);
            break;
          case 'invoice.payment_failed':
            // Handle payment failure
            await handlePaymentFailure(event.data.object);
            break;
          default:
            logger.info({
              requestId,
              message: 'Stripe webhook received',
              statusCode: 200,
              durationMs: Date.now() - startTime,
              eventType: event.type,
            });
            break;
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'Stripe webhook processed successfully',
          statusCode: 200,
          durationMs: duration,
          eventType: event.type,
        });

        return reply.code(200).send({
          data: {
            message: 'Webhook processed',
          },
          requestId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn({
            requestId,
            message: 'Stripe webhook validation failed',
            statusCode: 400,
            durationMs: duration,
            errors: error.errors,
          });

          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid webhook data',
              details: error.errors,
            },
            requestId,
          });
        }

        logger.error({
          requestId,
          message: 'Failed to process Stripe webhook',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process Stripe webhook',
          },
          requestId,
        });
      }
    },
  );
}

async function handleSubscriptionUpdate(data: any) {
  // Handle subscription update logic
  const { id, customer, plan, quantity, status } = data;
  
  // Find tenant by Stripe customer ID
  const tenant = await prisma.tenant.findFirst({
    where: {
      stripeCustomerId: customer,
    },
  });

  if (tenant) {
    // Update tenant subscription
    await prisma.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        stripeSubscriptionId: id,
        planId: plan.id,
        quantity,
        status: status === 'active' ? 'active' : 'inactive',
      },
    });
  }
}

async function handleSubscriptionCancellation(data: any) {
  // Handle subscription cancellation logic
  const { id, customer, status } = data;
  
  // Find tenant by Stripe customer ID
  const tenant = await prisma.tenant.findFirst({
    where: {
      stripeCustomerId: customer,
    },
  });

  if (tenant) {
    // Update tenant subscription status
    await prisma.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        stripeSubscriptionId: null,
        status: status === 'active' ? 'active' : 'inactive',
      },
    });
  }
}

async function handlePaymentSuccess(data: any) {
  // Handle payment success logic
  const { id, customer, amount, currency, status } = data;
  
  // Find tenant by Stripe customer ID
  const tenant = await prisma.tenant.findFirst({
    where: {
      stripeCustomerId: customer,
    },
  });

  if (tenant) {
    // Create payment record
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        stripePaymentId: id,
        amount,
        currency,
        status: 'succeeded',
      },
    });
  }
}

async function handlePaymentFailure(data: any) {
  // Handle payment failure logic
  const { id, customer, amount, currency, status } = data;
  
  // Find tenant by Stripe customer ID
  const tenant = await prisma.tenant.findFirst({
    where: {
      stripeCustomerId: customer,
    },
  });

  if (tenant) {
    // Create payment record
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        stripePaymentId: id,
        amount,
        currency,
        status: 'failed',
      },
    });
  }
}