// src/lib/db/queries.ts
import { drizzle } from 'drizzle-orm';
import { postgres } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schema } from './schema';
import {
  Tenant,
  User,
  TenantSettings,
  WordCloud,
  WordCloudWord,
  AnalyticsEvent,
  AuditLog,
  Job,
  WordCloudVersion,
} from '../../types/entities';

const db = drizzle(postgres(process.env.DATABASE_URL!));

/* ---------- Tenant Queries ---------- */
export async function createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<Tenant> {
  const [row] = await db.insert(schema.tenants).values(tenant).returning();
  return row;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  return await db.select().from(schema.tenants).where(sql`id = ${id}`).limit(1).then(rows => rows[0]);
}

export async function updateTenant(id: string, updates: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>>, version: number): Promise<Tenant | undefined> {
  const [row] = await db.update(schema.tenants)
    .set({ ...updates, updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

export async function softDeleteTenant(id: string, version: number): Promise<Tenant | undefined> {
  const [row] = await db.update(schema.tenants)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

/* ---------- User Queries ---------- */
export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<User> {
  const [row] = await db.insert(schema.users).values(user).returning();
  return row;
}

export async function getUserById(id: string): Promise<User | undefined> {
  return await db.select().from(schema.users).where(sql`id = ${id}`).limit(1).then(rows => rows[0]);
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>>, version: number): Promise<User | undefined> {
  const [row] = await db.update(schema.users)
    .set({ ...updates, updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

export async function softDeleteUser(id: string, version: number): Promise<User | undefined> {
  const [row] = await db.update(schema.users)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

/* ---------- Tenant Settings Queries ---------- */
export async function upsertTenantSetting(setting: Omit<TenantSettings, 'id' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<TenantSettings> {
  const [row] = await db.insert(schema.tenantSettings).values(setting).onConflictDoUpdate({
    target: [schema.tenantSettings.tenantId, schema.tenantSettings.key],
    set: { value: setting.value, updatedAt: new Date() },
  }).returning();
  return row;
}

export async function getTenantSetting(tenantId: string, key: string): Promise<TenantSettings | undefined> {
  return await db.select().from(schema.tenantSettings)
    .where(sql`tenant_id = ${tenantId} AND key = ${key}`)
    .limit(1)
    .then(rows => rows[0]);
}

/* ---------- Word Cloud Queries ---------- */
export async function createWordCloud(wordCloud: Omit<WordCloud, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<WordCloud> {
  const [row] = await db.insert(schema.wordClouds).values(wordCloud).returning();
  return row;
}

export async function getWordCloudById(id: string): Promise<WordCloud | undefined> {
  return await db.select().from(schema.wordClouds).where(sql`id = ${id}`).limit(1).then(rows => rows[0]);
}

export async function updateWordCloud(id: string, updates: Partial<Omit<WordCloud, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>>, version: number): Promise<WordCloud | undefined> {
  const [row] = await db.update(schema.wordClouds)
    .set({ ...updates, updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

export async function softDeleteWordCloud(id: string, version: number): Promise<WordCloud | undefined> {
  const [row] = await db.update(schema.wordClouds)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(sql`id = ${id} AND version = ${version}`)
    .returning();
  return row;
}

/* ---------- Word Cloud Word Queries ---------- */
export async function createWordCloudWord(word: Omit<WordCloudWord, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<WordCloudWord> {
  const [row] = await db.insert(schema.wordCloudWords).values(word).returning();
  return row;
}

export async function getWordCloudWords(wordCloudId: string): Promise<WordCloudWord[]> {
  return await db.select().from(schema.wordCloudWords).where(sql`word_cloud_id = ${wordCloudId}`).then(rows => rows);
}

/* ---------- Analytics Event Queries ---------- */
export async function createAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<AnalyticsEvent> {
  const [row] = await db.insert(schema.analyticsEvents).values(event).returning();
  return row;
}

export async function getAnalyticsEvents(filters: {
  tenantId?: string;
  wordCloudId?: string;
  eventType?: string;
  startTime?: Date;
  endTime?: Date;
  sessionToken?: string;
  word?: string;
  userId?: string;
}): Promise<AnalyticsEvent[]> {
  let query = db.select().from(schema.analyticsEvents);
  if (filters.tenantId) query = query.where(sql`tenant_id = ${filters.tenantId}`);
  if (filters.wordCloudId) query = query.where(sql`word_cloud_id = ${filters.wordCloudId}`);
  if (filters.eventType) query = query.where(sql`event_type = ${filters.eventType}`);
  if (filters.startTime) query = query.where(sql`timestamp >= ${filters.startTime}`);
  if (filters.endTime) query = query.where(sql`timestamp <= ${filters.endTime}`);
  if (filters.sessionToken) query = query.where(sql`session_token = ${filters.sessionToken}`);
  if (filters.word) query = query.where(sql`word = ${filters.word}`);
  if (filters.userId) query = query.where(sql`user_id = ${filters.userId}`);
  return await query.orderBy(sql`timestamp DESC`).then(rows => rows);
}

/* ---------- Audit Log Queries ---------- */
export async function insertAuditLog(log: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<AuditLog> {
  const [row] = await db.insert(schema.auditLog).values(log).returning();
  return row;
}

export async function getAuditLogs(filters: {
  entityType?: string;
  entityId?: string;
  changedBy?: string;
  startTime?: Date;
  endTime?: Date;
}): Promise<AuditLog[]> {
  let query = db.select().from(schema.auditLog);
  if (filters.entityType) query = query.where(sql`entity_type = ${filters.entityType}`);
  if (filters.entityId) query = query.where(sql`entity_id = ${filters.entityId}`);
  if (filters.changedBy) query = query.where(sql`changed_by = ${filters.changedBy}`);
  if (filters.startTime) query = query.where(sql`changed_at >= ${filters.startTime}`);
  if (filters.endTime) query = query.where(sql`changed_at <= ${filters.endTime}`);
  return await query.orderBy(sql`changed_at DESC`).then(rows => rows);
}

/* ---------- Job Queries ---------- */
export async function createJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<Job> {
  const [row] = await db.insert(schema.jobs).values(job).returning();
  return row;
}

export async function getJobById(id: string): Promise<Job | undefined> {
  return await db.select().from(schema.jobs).where(sql`id = ${id}`).limit(1).then(rows => rows[0]);
}

export async function updateJobStatus(id: string, status: string, attempts: number, error?: string): Promise<Job | undefined> {
  const [row] = await db.update(schema.jobs)
    .set({ status, attempts, error, updatedAt: new Date() })
    .where(sql`id = ${id}`)
    .returning();
  return row;
}

/* ---------- Word Cloud Version Queries ---------- */
export async function createWordCloudVersion(version: Omit<WordCloudVersion, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>): Promise<WordCloudVersion> {
  const [row] = await db.insert(schema.wordCloudVersions).values(version).returning();
  return row;
}

export async function getWordCloudVersions(wordCloudId: string): Promise<WordCloudVersion[]> {
  return await db.select().from(schema.wordCloudVersions).where(sql`word_cloud_id = ${wordCloudId}`).then(rows => rows);
}