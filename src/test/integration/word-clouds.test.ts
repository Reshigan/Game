import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/db/client';
import { tenants, users, wordClouds, wordCloudWords, analyticsEvents } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { buildTestTenantWithUser, buildTestWordCloudWithWords, createWordCloud } from '../factories';
import { testUtils } from '../setup';

describe('Word Clouds API Integration Tests', () => {
  let testContext: Awaited<ReturnType<typeof testUtils.createTestContext>>;

  beforeAll(async () => {
    testContext = await testUtils.createTestContext();
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(analyticsEvents);
    await db.delete(wordCloudWords);
    await db.delete(wordClouds);
    await db.delete(users);
    await db.delete(tenants);
  });

  describe('POST /api/v1/word-clouds', () => {
    it('should create a new word cloud with valid input', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      const wordCloudData = {
        title: 'Test Word Cloud',
        description: 'A test word cloud for integration testing',
        words: [
          { word: 'test', frequency: 10 },
          { word: 'integration', frequency: 8 },
          { word: 'api', frequency: 6 },
        ],
      };

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenant.id,
          'X-User-ID': user.id,
        },
        body: JSON.stringify(wordCloudData),
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe(wordCloudData.title);
      expect(result.data.id).toBeDefined();
      expect(result.requestId).toBe(testContext.requestId);
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidData = {
        title: '', // Empty title should fail validation
        words: [], // Empty words should fail validation
      };

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': testContext.requestId,
        },
        body: JSON.stringify(invalidData),
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Arrange
      const wordCloudData = {
        title: 'Test Word Cloud',
        words: [{ word: 'test', frequency: 1 }],
      };

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': testContext.requestId,
          // No tenant/user headers
        },
        body: JSON.stringify(wordCloudData),
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle maximum word count', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      const maxWords = Array.from({ length: 1000 }, (_, i) => ({
        word: `word${i}`,
        frequency: i + 1,
      }));

      const wordCloudData = {
        title: 'Maximum Words Test',
        words: maxWords,
      };

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenant.id,
          'X-User-ID': user.id,
        },
        body: JSON.stringify(wordCloudData),
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.words.length).toBe(1000);
    });
  });

  describe('GET /api/v1/word-clouds', () => {
    it('should return paginated list of word clouds', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      // Create multiple word clouds
      for (let i = 0; i < 25; i++) {
        const { wordCloud, words } = buildTestWordCloudWithWords(tenant.id, user.id, 5);
        await db.insert(wordClouds).values(wordCloud);
        await db.insert(wordCloudWords).values(words);
      }

      // Act
      const response = await fetch('/api/v1/word-clouds?limit=10', {
        method: 'GET',
        headers: {
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenant.id,
          'X-User-ID': user.id,
        },
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.length).toBe(10);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });

    it('should return empty list when no word clouds exist', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'GET',
        headers: {
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenant.id,
          'X-User-ID': user.id,
        },
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should not allow cross-tenant access to word clouds', async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = buildTestTenantWithUser();
      const { tenant: tenantB, user: userB } = buildTestTenantWithUser();
      
      await db.insert(tenants).values([tenantA, tenantB]);
      await db.insert(users).values([userA, userB]);

      const { wordCloud: wordCloudA } = buildTestWordCloudWithWords(tenantA.id, userA.id, 5);
      await db.insert(wordClouds).values(wordCloudA);

      // Act - Try to access tenant A's word cloud with tenant B's credentials
      const response = await fetch(`/api/v1/word-clouds/${wordCloudA.id}`, {
        method: 'GET',
        headers: {
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenantB.id, // Different tenant
          'X-User-ID': userB.id,
        },
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(404); // Should not find the resource
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should isolate analytics events between tenants', async () => {
      // Arrange
      const { tenant: tenantA, user: userA } = buildTestTenantWithUser();
      const { tenant: tenantB, user: userB } = buildTestTenantWithUser();
      
      await db.insert(tenants).values([tenantA, tenantB]);
      await db.insert(users).values([userA, userB]);

      const { wordCloud: wordCloudA } = buildTestWordCloudWithWords(tenantA.id, userA.id, 5);
      const { wordCloud: wordCloudB } = buildTestWordCloudWithWords(tenantB.id, userB.id, 5);
      
      await db.insert(wordClouds).values([wordCloudA, wordCloudB]);

      // Create analytics events for both tenants
      const eventsA = Array.from({ length: 10 }, () => ({
        tenantId: tenantA.id,
        wordCloudId: wordCloudA.id,
        eventType: 'click' as const,
        word: 'test',
        sessionToken: createId(),
        timestamp: new Date(),
      }));

      const eventsB = Array.from({ length: 5 }, () => ({
        tenantId: tenantB.id,
        wordCloudId: wordCloudB.id,
        eventType: 'click' as const,
        word: 'test',
        sessionToken: createId(),
        timestamp: new Date(),
      }));

      await db.insert(analyticsEvents).values([...eventsA, ...eventsB]);

      // Act - Query analytics for tenant A
      const response = await fetch(`/api/v1/analytics?wordCloudId=${wordCloudA.id}`, {
        method: 'GET',
        headers: {
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenantA.id,
          'X-User-ID': userA.id,
        },
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.events.length).toBe(10); // Only tenant A's events
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent updates correctly', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      const { wordCloud } = buildTestWordCloudWithWords(tenant.id, user.id, 5);
      await db.insert(wordClouds).values(wordCloud);

      // Act - Simulate concurrent updates
      const updatePromises = Array.from({ length: 5 }, (_, i) =>
        fetch(`/api/v1/word-clouds/${wordCloud.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': createId(),
            'X-Tenant-ID': tenant.id,
            'X-User-ID': user.id,
          },
          body: JSON.stringify({ title: `Updated Title ${i}` }),
        })
      );

      const responses = await Promise.all(updatePromises);

      // Assert - All should succeed (optimistic locking)
      const results = await Promise.all(responses.map(r => r.json()));
      const successCount = results.filter(r => r.data?.version > wordCloud.version).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle special characters in word cloud content', async () => {
      // Arrange
      const { tenant, user } = buildTestTenantWithUser();
      await db.insert(tenants).values(tenant);
      await db.insert(users).values(user);

      const specialWords = [
        { word: 'café', frequency: 5 },
        { word: '日本語', frequency: 3 },
        { word: 'emoji🎉', frequency: 2 },
        { word: '<script>alert("xss")</script>', frequency: 1 },
      ];

      // Act
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': testContext.requestId,
          'X-Tenant-ID': tenant.id,
          'X-User-ID': user.id,
        },
        body: JSON.stringify({
          title: 'Special Characters Test',
          words: specialWords,
        }),
      });

      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.words).toHaveLength(4);
      // XSS should be sanitized
      expect(result.data.words[3].word).not.toContain('<script>');
    });
  });
});