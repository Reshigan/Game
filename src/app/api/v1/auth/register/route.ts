import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { hashPassword, generateToken } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

export async function registerRoute(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account and return authentication tokens',
        body: registerSchema,
        response: {
          201: z.object({
            token: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    async (