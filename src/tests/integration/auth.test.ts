// src/tests/integration/auth.test.ts
// Test Suite: Authentication Integration Tests
// Requirement Coverage: REQ-001, REQ-002, REQ-003
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2026-03-17
// Sprint: 1
// SECURITY: Uses environment variables for test secrets (no hardcoded credentials)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createTestServer, getAuthHeaders, createUserWithToken, createTenant } from '@/test/helpers';
import { prisma } from '@/lib/db/client';

// SECURITY: All secrets loaded from environment variables
const TEST_JWT_SECRET = process.env.TEST_JWT_SECRET;
const TEST_REFRESH_SECRET = process.env.TEST_REFRESH_SECRET;

if (!TEST_JWT_SECRET || TEST_JWT_SECRET.length < 32) {
  throw new Error('TEST_JWT_SECRET must be at least 32 characters and set in environment');
}
if (!TEST_REFRESH_SECRET || TEST_REFRESH_SECRET.length < 32) {
  throw new Error('TEST_REFRESH_SECRET must be at least 32 characters and set in environment');
}

describe('Authentication Integration Tests', () => {
  let app: FastifyInstance;
  let testTenant: Awaited<ReturnType<typeof createTenant>>;

  beforeAll(async () => {
    app = await createTestServer();
    testTenant = await createTenant('Auth Test Tenant');
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'SecureP@ssw0rd123!',
          name: 'New User',
          tenantId: testTenant.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe('newuser@example.com');
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('should reject registration with weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'weakpass@example.com',
          password: 'password123', // Weak password - missing special chars, uppercase
          name: 'Weak User',
          tenantId: testTenant.id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecureP@ssw0rd123!',
          name: 'First User',
          tenantId: testTenant.id,
        },
      });

      // Duplicate registration attempt
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecureP@ssw0rd123!',
          name: 'Second User',
          tenantId: testTenant.id,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'loginuser@example.com',
          password: 'SecureP@ssw0rd123!',
          name: 'Login User',
          tenantId: testTenant.id,
        },
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'loginuser@example.com',
          password: 'SecureP@ssw0rd123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
    });

    it('should reject login with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'loginuser@example.com',
          password: 'WrongP@ssw0rd123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SecureP@ssw0rd123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Register user first
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refreshuser@example.com',
          password: 'SecureP@ssw0rd123!',
          name: 'Refresh User',
          tenantId: testTenant.id,
        },
      });

      const { refreshToken } = JSON.parse(registerResponse.body);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          // SECURITY: Using environment variable, not hardcoded secret
          refreshToken: 'invalid-token-' + TEST_JWT_SECRET.substring(0, 16),
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const { token } = await createUserWithToken(testTenant.id, 'user');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: getAuthHeaders(token),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject logout without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Authorization Middleware', () => {
    it('should allow admin access to admin-only endpoints', async () => {
      const { token } = await createUserWithToken(testTenant.id, 'admin');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: getAuthHeaders(token),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny non-admin access to admin-only endpoints', async () => {
      const { token } = await createUserWithToken(testTenant.id, 'user');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: getAuthHeaders(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});