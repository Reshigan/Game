import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/utils/logger';

const GitHubWebhookSchema = z.object({
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  }),
  pusher: z.object({
    name: z.string(),
    email: z.string(),
  }),
  commits: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      timestamp: z.string(),
      url: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string(),
      }),
    }),
  ),
});

type GitHubWebhookRequest = z.infer<typeof GitHubWebhookSchema>;

export async function githubWebhookRoute(fastify: FastifyInstance) {
  // POST /api/v1/webhooks/github - GitHub webhook endpoint
  fastify.post(
    '/webhooks/github',
    {
      config: {
        bodyLimit: 1048576, // 1MB
      },
    },
    async (request, reply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        // Verify GitHub signature
        const signature = request.headers['x-hub-signature-256'];
        
        if (!signature) {
          logger.warn({
            requestId,
            message: 'GitHub webhook failed: missing signature',
            statusCode: 400,
            durationMs: Date.now() - startTime,
          });

          return reply.code(400).send({
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Missing GitHub signature',
            },
            requestId,
          });
        }

        // In production, we would verify the signature using GitHub's library
        // For now, we'll just log the webhook event
        const body = request.body as any;

        // Parse webhook event
        const event = GitHubWebhookSchema.parse(body);

        // Process webhook event based on type
        switch (request.headers['x-github-event']) {
          case 'push':
            // Handle push event
            await handlePushEvent(event);
            break;
          case 'pull_request':
            // Handle pull request event
            await handlePullRequestEvent(event);
            break;
          case 'issues':
            // Handle issues event
            await handleIssuesEvent(event);
            break;
          default:
            logger.info({
              requestId,
              message: 'GitHub webhook received',
              statusCode: 200,
              durationMs: Date.now() - startTime,
              eventType: request.headers['x-github-event'],
            });
            break;
        }

        const duration = Date.now() - startTime;

        logger.info({
          requestId,
          message: 'GitHub webhook processed successfully',
          statusCode: 200,
          durationMs: duration,
          eventType: request.headers['x-github-event'],
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
            message: 'GitHub webhook validation failed',
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
          message: 'Failed to process GitHub webhook',
          statusCode: 500,
          durationMs: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process GitHub webhook',
          },
          requestId,
        });
      }
    },
  );
}

async function handlePushEvent(data: any) {
  // Handle push event logic
  const { ref, before, after, repository, pusher, commits } = data;
  
  // Log push event
  logger.info({
    message: 'GitHub push event received',
    repository: repository.full_name,
    ref,
    commitsCount: commits.length,
  });
}

async function handlePullRequestEvent(data: any) {
  // Handle pull request event logic
  const { action, pull_request, repository } = data;
  
  // Log pull request event
  logger.info({
    message: 'GitHub pull request event received',
    action,
    repository: repository.full_name,
    pullRequestNumber