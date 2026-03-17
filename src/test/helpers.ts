// Test Suite: Test Helpers
// Requirement Coverage: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2026-03-17
// Sprint: 1

import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { prisma } from '@/lib/db/client';
import { createApp } from '@/app/server';
import { User, Tenant, WordCloud } from '@/types/entities';

/**
 * Creates a fresh Fastify instance for testing.
 * The instance is configured to use the test database and in-memory cache.
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const app = await createApp({
    env: 'test',
    prisma,
  });
  await app.ready();
  return app;
}

/**
 * Returns headers containing a bearer token for authentication.
 * @param token JWT token string
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Utility to create a user and return the user record and JWT token.
 * @param tenantId ID of the tenant the user belongs to
 * @param role Role of the user (e.g., 'user', 'admin')
 */
export async function createUserWithToken(
  tenantId: string,
  role: 'user' | 'admin' = 'user',
): Promise<{ user: User; token: string }> {
  const user = await prisma.user.create({
    data: {
      email: `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
      passwordHash: 'hashed-password',
      role,
      tenantId,
    },
  });

  const { generateToken } = await import('@/lib/auth/jwt');
  const token = await generateToken(user);

  return { user, token };
}

/**
 * Utility to create a tenant.
 * @param name Name of the tenant
 */
export async function createTenant(name: string = 'Test Tenant'): Promise<Tenant> {
  return await prisma.tenant.create({
    data: {
      name,
      subdomain: `sub-${Math.random().toString(36).substring(2, 8)}`,
    },
  });
}

/**
 * Utility to create a word cloud.
 * @param tenantId ID of the tenant
 * @param title Title of the word cloud
 */
export async function createWordCloud(
  tenantId: string,
  title: string = 'Test Word Cloud',
): Promise<WordCloud> {
  return await prisma.wordCloud.create({
    data: {
      title,
      tenantId,
      config: {
        words: [
          { text: 'Hello', weight: 10 },
          { text: 'World', weight: 5 },
        ],
      },
    },
  });
}