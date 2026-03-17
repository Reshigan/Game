// Test Suite: Auth Integration Tests
// Requirement Coverage: REQ-001, REQ-004, REQ-005, REQ-006
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2026-03-17
// Sprint: 1

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestServer, getAuthHeaders, createTenant } from '@/test/helpers';
import { prisma } from '@/lib/db/client';

let app: any;

beforeAll(async () => {
  app = await createTestServer();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth Flow', () => {
  it('should register a new user and return a JWT', async () => {
    // Arrange
    const tenant = await createTenant('Auth Test Tenant');
    const payload = {
      email: `user-${Math.random().toString(36).substring(2, 8)}@example.com`,
      password: 'Password123!',
      tenantId: tenant.id,
    };

    // Act
    const res = await request(app.server).post('/api/v1/auth/register').send(payload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('should login an existing user and return a JWT', async () => {
    // Arrange
    const tenant = await createTenant('Login Test Tenant');
    const user = await prisma.user.create({
      data: {
        email: `login-${Math.random().toString(36).substring(2, 8)}@example.com`,
        passwordHash: 'hashed',
        role: 'user',
        tenantId: tenant.id,
      },
    });

    const payload = {
      email: user.email,
      password: 'Password123!',
    };

    // Act
    const res = await request(app.server).post('/api/v1/auth/login').send(payload);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('should reject access to protected route without token', async () => {
    // Act
    const res = await request(app.server).get('/api/v1/wordclouds');

    // Assert
    expect(res.status).toBe(401);
  });

  it('should allow access to protected route with valid token', async () => {
    // Arrange
    const tenant = await createTenant('Protected Route Tenant');
    const { token } = await import('@/test/helpers').then((m) => m.createUserWithToken(tenant.id, 'user'));

    // Act
    const res = await request(app.server)
      .get('/api/v1/wordclouds')
      .set(getAuthHeaders(token));

    // Assert
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should reject access to admin route with user role', async () => {
    // Arrange
    const tenant = await createTenant('Admin Route Tenant');
    const { token } = await import('@/test/helpers').then((m) => m.createUserWithToken(tenant.id, 'user'));

    // Act
    const res = await request(app.server)
      .post('/api/v1/admin/tenants')
      .set(getAuthHeaders(token))
      .send({ name: 'New