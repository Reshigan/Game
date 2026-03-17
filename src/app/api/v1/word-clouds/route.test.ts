// Test Suite: Word Cloud API Endpoints
// Requirement Coverage: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2024-03-20
// Sprint: 1

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db/client';
import { tenants, users, wordClouds, wordCloudWords, analyticsEvents } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createTestTenantAndUser, createTestWordCloud, createTestAnalyticsEvents, cleanupTestData } from '@/test/helpers';
import { createTenant, createUser, createWordCloud, createWordCloudWord, createAnalyticsEvent } from '@/test/factories';

// Test IDs for traceability matrix
const TEST_IDS = {
  CREATE_WORD_CLOUD: 'TC-001',
  LIST_WORD_CLOUDS: 'TC-002',
  GET_WORD_CLOUD: 'TC-003',
  UPDATE_WORD_CLOUD: 'TC-004',
  DELETE_WORD_CLOUD: 'TC-005',
  CREATE_WORD_CLOUD_WORD: 'TC-006',
  LIST_WORD_CLOUD_WORDS: 'TC-007',
  CREATE_ANALYTICS_EVENT: 'TC-008',
  LIST_ANALYTICS_EVENTS: 'TC-009',
  EXPORT_WORD_CLOUD: 'TC-010',
  RATE_LIMITING: 'TC-011',
  TENANT_ISOLATION: 'TC-012',
  INPUT_VALIDATION: 'TC-013',
  CONCURRENCY: 'TC-014',
  AUDIT_LOGGING: 'TC-015',
};

describe('Word Cloud API Endpoints', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/word-clouds', () => {
    it(`${TEST_IDS.CREATE_WORD_CLOUD} should create a new word cloud with valid data`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloudData = createWordCloud({ tenantId: tenant.id });
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`, // Mock auth token
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.title).toBe(wordCloudData.title);
      expect(result.data.tenantId).toBe(tenant.id);
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should return 400 for missing required fields`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const invalidData = { description: 'Missing title' };
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(invalidData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should return 401 for unauthenticated request`, async () => {
      // Arrange
      const wordCloudData = createWordCloud();
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should return 403 for unauthorized tenant access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB } = await createTestTenantAndUser();
      const wordCloudData = createWordCloud({ tenantId: tenantB.id });
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should handle extremely long input strings`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const longText = 'a'.repeat(10000); // 10KB string
      const wordCloudData = createWordCloud({ 
        tenantId: tenant.id,
        title: longText,
        description: longText,
        sourceText: longText,
      });
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should handle SQL injection payloads`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const sqlInjectionPayload = "'; DROP TABLE word_clouds; --";
      const wordCloudData = createWordCloud({ 
        tenantId: tenant.id,
        title: sqlInjectionPayload,
        description: sqlInjectionPayload,
        sourceText: sqlInjectionPayload,
      });
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      
      // Verify the payload was stored safely (not executed)
      const wordClouds = await db.select().from(wordClouds);
      expect(wordClouds.length).toBe(1);
      expect(wordClouds[0].title).toBe(sqlInjectionPayload);
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD} should handle XSS payloads`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const xssPayload = '<script>alert("xss")</script>';
      const wordCloudData = createWordCloud({ 
        tenantId: tenant.id,
        title: xssPayload,
        description: xssPayload,
        sourceText: xssPayload,
      });
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordCloudData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      
      // Verify the payload was stored safely (not executed)
      const wordClouds = await db.select().from(wordClouds);
      expect(wordClouds.length).toBe(1);
      expect(wordClouds[0].title).toBe(xssPayload);
    });
  });

  describe('GET /api/v1/word-clouds', () => {
    it(`${TEST_IDS.LIST_WORD_CLOUDS} should return all word clouds for the current tenant`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud1 = await createTestWordCloud(tenant.id);
      const wordCloud2 = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].id).toBe(wordCloud1.id);
      expect(result.data[1].id).toBe(wordCloud2.id);
    });

    it(`${TEST_IDS.LIST_WORD_CLOUDS} should return empty array when no word clouds exist`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it(`${TEST_IDS.LIST_WORD_CLOUDS} should implement pagination`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordClouds = [];
      for (let i = 0; i < 15; i++) {
        wordClouds.push(await createTestWordCloud(tenant.id));
      }
      
      // Act
      const response = await fetch('/api/v1/word-clouds?limit=5&offset=0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
    });

    it(`${TEST_IDS.LIST_WORD_CLOUDS} should implement tenant isolation`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloudA = await createTestWordCloud(tenantA.id);
      const wordCloudB = await createTestWordCloud(tenantB.id);
      
      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe(wordCloudA.id);
    });
  });

  describe('GET /api/v1/word-clouds/[id]', () => {
    it(`${TEST_IDS.GET_WORD_CLOUD} should return a specific word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(wordCloud.id);
    });

    it(`${TEST_IDS.GET_WORD_CLOUD} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.GET_WORD_CLOUD} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/v1/word-clouds/[id]', () => {
    it(`${TEST_IDS.UPDATE_WORD_CLOUD} should update a word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      const updatedData = { title: 'Updated Title' };
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(updatedData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe(updatedData.title);
    });

    it(`${TEST_IDS.UPDATE_WORD_CLOUD} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      const updatedData = { title: 'Updated Title' };
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(updatedData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.UPDATE_WORD_CLOUD} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      const updatedData = { title: 'Updated Title' };
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(updatedData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/word-clouds/[id]', () => {
    it(`${TEST_IDS.DELETE_WORD_CLOUD} should soft delete a word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      
      // Verify soft delete
      const deletedWordCloud = await db.select().from(wordClouds).where(eq(wordClouds.id, wordCloud.id));
      expect(deletedWordCloud.length).toBe(1);
      expect(deletedWordCloud[0].deletedAt).toBeDefined();
    });

    it(`${TEST_IDS.DELETE_WORD_CLOUD} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.DELETE_WORD_CLOUD} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/word-clouds/[id]/words', () => {
    it(`${TEST_IDS.CREATE_WORD_CLOUD_WORD} should add a word to a word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      const wordData = createWordCloudWord({ wordCloudId: wordCloud.id });
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.word).toBe(wordData.word);
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD_WORD} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      const wordData = createWordCloudWord();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.CREATE_WORD_CLOUD_WORD} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      const wordData = createWordCloudWord({ wordCloudId: wordCloud.id });
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(wordData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/word-clouds/[id]/words', () => {
    it(`${TEST_IDS.LIST_WORD_CLOUD_WORDS} should return all words for a word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/words`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3); // From createTestWordCloud
    });

    it(`${TEST_IDS.LIST_WORD_CLOUD_WORDS} should return empty array when no words exist`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = createWordCloud({ tenantId: tenant.id });
      const createdCloud = await db.insert(wordClouds).values(wordCloud).returning();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${createdCloud[0].id}/words`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it(`${TEST_IDS.LIST_WORD_CLOUD_WORDS} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}/words`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.LIST_WORD_CLOUD_WORDS} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/words`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/word-clouds/[id]/events', () => {
    it(`${TEST_IDS.CREATE_ANALYTICS_EVENT} should record an analytics event`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      const eventData = createAnalyticsEvent({ wordCloudId: wordCloud.id, tenantId: tenant.id });
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(eventData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.eventType).toBe(eventData.eventType);
    });

    it(`${TEST_IDS.CREATE_ANALYTICS_EVENT} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      const eventData = createAnalyticsEvent();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(eventData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.CREATE_ANALYTICS_EVENT} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      const eventData = createAnalyticsEvent({ wordCloudId: wordCloud.id, tenantId: tenantA.id });
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(eventData),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/word-clouds/[id]/analytics', () => {
    it(`${TEST_IDS.LIST_ANALYTICS_EVENTS} should return analytics events for a word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      await createTestAnalyticsEvents(wordCloud.id, tenant.id, 5);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5);
    });

    it(`${TEST_IDS.LIST_ANALYTICS_EVENTS} should return empty array when no events exist`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it(`${TEST_IDS.LIST_ANALYTICS_EVENTS} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.LIST_ANALYTICS_EVENTS} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/word-clouds/[id]/export', () => {
    it(`${TEST_IDS.EXPORT_WORD_CLOUD} should export a word cloud as CSV`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it(`${TEST_IDS.EXPORT_WORD_CLOUD} should return 404 for non-existent word cloud`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const nonExistentId = createId();
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${nonExistentId}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it(`${TEST_IDS.EXPORT_WORD_CLOUD} should return 403 for unauthorized access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenantA.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Rate Limiting', () => {
    it(`${TEST_IDS.RATE_LIMITING} should return 429 after exceeding rate limit`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      for (let i = 0; i < 101; i++) {
        await fetch(`/api/v1/word-clouds/${wordCloud.id}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${createId()}`,
          },
          body: JSON.stringify(createAnalyticsEvent({ wordCloudId: wordCloud.id, tenantId: tenant.id })),
        });
      }
      
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify(createAnalyticsEvent({ wordCloudId: wordCloud.id, tenantId: tenant.id })),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(429);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Tenant Isolation', () => {
    it(`${TEST_IDS.TENANT_ISOLATION} should prevent cross-tenant data access`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloudA = await createTestWordCloud(tenantA.id);
      const wordCloudB = await createTestWordCloud(tenantB.id);
      
      // Act
      const responseA = await fetch(`/api/v1/word-clouds/${wordCloudB.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const resultA = await responseA.json();
      
      // Assert
      expect(responseA.status).toBe(403);
      expect(resultA.error).toBeDefined();
      expect(resultA.error.code).toBe('FORBIDDEN');
    });

    it(`${TEST_IDS.TENANT_ISOLATION} should prevent cross-tenant modification`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloudA = await createTestWordCloud(tenantA.id);
      const wordCloudB = await createTestWordCloud(tenantB.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloudB.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify({ title: 'Hacked Title' }),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
      
      // Verify the original title was not changed
      const updatedWordCloud = await db.select().from(wordClouds).where(eq(wordClouds.id, wordCloudB.id));
      expect(updatedWordCloud[0].title).not.toBe('Hacked Title');
    });

    it(`${TEST_IDS.TENANT_ISOLATION} should prevent cross-tenant deletion`, async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = await createTestTenantAndUser();
      const { tenant: tenantB, user: userB } = await createTestTenantAndUser();
      const wordCloudA = await createTestWordCloud(tenantA.id);
      const wordCloudB = await createTestWordCloud(tenantB.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloudB.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FORBIDDEN');
      
      // Verify the word cloud was not deleted
      const deletedWordCloud = await db.select().from(wordClouds).where(eq(wordClouds.id, wordCloudB.id));
      expect(deletedWordCloud.length).toBe(1);
      expect(deletedWordCloud[0].deletedAt).toBeNull();
    });
  });

  describe('Concurrency', () => {
    it(`${TEST_IDS.CONCURRENCY} should handle concurrent updates without data loss`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${createId()}`,
            },
            body: JSON.stringify({ title: `Updated Title ${i}` }),
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Assert
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Verify final state
      const finalWordCloud = await db.select().from(wordClouds).where(eq(wordClouds.id, wordCloud.id));
      expect(finalWordCloud.length).toBe(1);
      expect(finalWordCloud[0].title).toBe('Updated Title 9'); // Last update wins
    });

    it(`${TEST_IDS.CONCURRENCY} should handle concurrent analytics events without data loss`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          fetch(`/api/v1/word-clouds/${wordCloud.id}/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${createId()}`,
            },
            body: JSON.stringify(createAnalyticsEvent({ wordCloudId: wordCloud.id, tenantId: tenant.id })),
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Assert
      expect(responses.every(r => r.status === 201)).toBe(true);
      
      // Verify final count
      const events = await db.select().from(analyticsEvents).where(eq(analyticsEvents.wordCloudId, wordCloud.id));
      expect(events.length).toBe(100);
    });
  });

  describe('Audit Logging', () => {
    it(`${TEST_IDS.AUDIT_LOGGING} should create audit logs for sensitive operations`, async () => {
      // Arrange
      const { tenant, user } = await createTestTenantAndUser();
      const wordCloud = await createTestWordCloud(tenant.id);
      
      // Act
      const response = await fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createId()}`,
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      
      const result = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      
      // Verify audit log was created
      const auditLogs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, wordCloud.id));
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].entityType).toBe('wordCloud');
      expect(auditLogs[0].fieldName).toBe('title');
      expect(auditLogs[0].oldValue).toBeDefined();
      expect(auditLogs[0].newValue).toBeDefined();
    });
  });
});