// Test Suite: Test Helpers for Word Cloud Analytics Platform
// Requirement Coverage: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2024-03-20
// Sprint: 1

import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db/client';
import { tenants, users, wordClouds, wordCloudWords, analyticsEvents, auditLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createTenant, createUser, createWordCloud, createWordCloudWord, createAnalyticsEvent, createAuditLog } from './factories';

// Helper to create test data with proper tenant isolation
export async function createTestTenantAndUser() {
  const tenant = createTenant();
  const user = createUser({ tenantId: tenant.id });
  
  // Insert tenant
  await db.insert(tenants).values(tenant);
  
  // Insert user
  await db.insert(users).values(user);
  
  return { tenant, user };
}

// Helper to create a word cloud with associated words
export async function createTestWordCloud(tenantId: string, userId?: string) {
  const wordCloud = createWordCloud({ tenantId });
  const createdCloud = await db.insert(wordClouds).values(wordCloud).returning();
  
  // Create associated words
  const words = [
    createWordCloudWord({ wordCloudId: createdCloud[0].id, word: 'test', frequency: 5 }),
    createWordCloudWord({ wordCloudId: createdCloud[0].id, word: 'example', frequency: 3 }),
    createWordCloudWord({ wordCloudId: createdCloud[0].id, word: 'analytics', frequency: 2 }),
  ];
  
  await db.insert(wordCloudWords).values(words);
  
  return createdCloud[0];
}

// Helper to create analytics events
export async function createTestAnalyticsEvents(wordCloudId: string, tenantId: string, count: number = 10) {
  const events = Array.from({ length: count }).map(() => 
    createAnalyticsEvent({ wordCloudId, tenantId })
  );
  
  await db.insert(analyticsEvents).values(events);
  
  return events;
}

// Helper to create audit logs
export async function createTestAuditLogs(entityType: string, entityId: string, count: number = 5) {
  const logs = Array.from({ length: count }).map(() => 
    createAuditLog({ entityType, entityId })
  );
  
  await db.insert(auditLogs).values(logs);
  
  return logs;
}

// Helper to verify tenant isolation
export async function verifyTenantIsolation(tenantAId: string, tenantBId: string, resourceType: 'wordCloud' | 'analyticsEvent' | 'auditLog') {
  // Verify Tenant A cannot access Tenant B's resources
  if (resourceType === 'wordCloud') {
    const tenantAWords = await db.select().from(wordClouds).where(eq(wordClouds.tenantId, tenantAId));
    const tenantBWords = await db.select().from(wordClouds).where(eq(wordClouds.tenantId, tenantBId));
    
    if (tenantAWords.length === 0 || tenantBWords.length === 0) {
      throw new Error('Tenant isolation failed: No word clouds found for one or both tenants');
    }
    
    // Verify Tenant A's words don't include Tenant B's words
    const tenantBWordIds = tenantBWords.map(w => w.id);
    const tenantAWordsFromB = tenantAWords.filter(w => tenantBWordIds.includes(w.id));
    
    if (tenantAWordsFromB.length > 0) {
      throw new Error('Tenant isolation failed: Tenant A accessed Tenant B\'s word clouds');
    }
  }
  
  if (resourceType === 'analyticsEvent') {
    const tenantAEvents = await db.select().from(analyticsEvents).where(eq(analyticsEvents.tenantId, tenantAId));
    const tenantBEvents = await db.select().from(analyticsEvents).where(eq(analyticsEvents.tenantId, tenantBId));
    
    if (tenantAEvents.length === 0 || tenantBEvents.length === 0) {
      throw new Error('Tenant isolation failed: No analytics events found for one or both tenants');
    }
    
    // Verify Tenant A's events don't include Tenant B's events
    const tenantBEventIds = tenantBEvents.map(e => e.id);
    const tenantAEventsFromB = tenantAEvents.filter(e => tenantBEventIds.includes(e.id));
    
    if (tenantAEventsFromB.length > 0) {
      throw new Error('Tenant isolation failed: Tenant A accessed Tenant B\'s analytics events');
    }
  }
  
  if (resourceType === 'auditLog') {
    const tenantALogs = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'wordCloud'));
    const tenantBLogs = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'wordCloud'));
    
    if (tenantALogs.length === 0 || tenantBLogs.length === 0) {
      throw new Error('Tenant isolation failed: No audit logs found for one or both tenants');
    }
    
    // Verify Tenant A's logs don't include Tenant B's logs
    const tenantBLogIds = tenantBLogs.map(l => l.entityId);
    const tenantALogsFromB = tenantALogs.filter(l => tenantBLogIds.includes(l.entityId));
    
    if (tenantALogsFromB.length > 0) {
      throw new Error('Tenant isolation failed: Tenant A accessed Tenant B\'s audit logs');
    }
  }
}

// Helper to clean up test data
export async function cleanupTestData() {
  await db.delete(analyticsEvents).where(eq(analyticsEvents.isActive, true));
  await db.delete(wordCloudWords).where(eq(wordCloudWords.isActive, true));
  await db.delete(wordClouds).where(eq(wordClouds.isActive, true));
  await db.delete(auditLogs).where(eq(auditLogs.isActive, true));
  await db.delete(users).where(eq(users.isActive, true));
  await db.delete(tenants).where(eq(tenants.isActive, true));
}

// Helper to create a unique session token
export function createSessionToken(): string {
  return `session_${createId()}`;
}

// Helper to create a unique session token for multiple sessions
export function createSessionTokens(count: number): string[] {
  return Array.from({ length: count }).map(() => createSessionToken());
}

// Helper to create a word cloud with specific words and frequencies
export async function createWordCloudWithWords(tenantId: string, words: { word: string; frequency: number }[]) {
  const wordCloud = createWordCloud({ tenantId });
  const createdCloud = await db.insert(wordClouds).values(wordCloud).returning();
  
  const cloudWords = words.map(w => 
    createWordCloudWord({ wordCloudId: createdCloud[0].id, word: w.word, frequency: w.frequency })
  );
  
  await db.insert(wordCloudWords).values(cloudWords);
  
  return createdCloud[0];
}

// Helper to create analytics events with specific timestamps
export async function createAnalyticsEventsWithTimestamps(wordCloudId: string, tenantId: string, timestamps: Date[]) {
  const events = timestamps.map(timestamp => 
    createAnalyticsEvent({ 
      wordCloudId, 
      tenantId, 
      timestamp,
      sessionToken: createSessionToken()
    })
  );
  
  await db.insert(analyticsEvents).values(events);
  
  return events;
}

// Helper to create audit logs with specific field changes
export async function createAuditLogWithChanges(entityType: string, entityId: string, fieldName: string, oldValue: any, newValue: any) {
  const log = createAuditLog({ 
    entityType, 
    entityId, 
    fieldName, 
    oldValue, 
    newValue 
  });
  
  await db.insert(auditLogs).values(log);
  
  return log;
}

// Helper to create a job with specific status
export async function createJobWithStatus(tenantId: string, type: string, status: string) {
  const job = createJob({ tenantId, type, status });
  await db.insert(jobs).values(job);
  
  return job;
}

// Helper to create a word cloud version
export async function createWordCloudVersionWithSnapshot(wordCloudId: string, versionNumber: number, snapshot: any) {
  const version = createWordCloudVersion({ wordCloudId, versionNumber, snapshot });
  await db.insert(wordCloudVersions).values(version);
  
  return version;
}