import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  nameIdx: index('idx_tenants_name').on(table.name),
  isActiveIdx: index('idx_tenants_is_active').on(table.isActive),
}));

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'editor', 'viewer'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  tenantIdx: index('idx_users_tenant_id').on(table.tenantId),
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
  isActiveIdx: index('idx_users_is_active').on(table.isActive),
}));

// Tenant Settings table
export const tenantSettings = pgTable('tenant_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  tenantIdx: index('idx_tenant_settings_tenant_id').on(table.tenantId),
  keyIdx: index('idx_tenant_settings_key').on(table.key),
  tenantKeyUnique: uniqueIndex('idx_tenant_settings_tenant_key').on(table.tenantId, table.key),
}));

// Word Clouds table
export const wordClouds = pgTable('word_clouds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  creatorUserId: uuid('creator_user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  tenantIdx: index('idx_word_clouds_tenant_id').on(table.tenantId),
  creatorIdx: index('idx_word_clouds_creator_user_id').on(table.creatorUserId),
  isActiveIdx: index('idx_word_clouds_is_active').on(table.isActive),
  createdAtIdx: index('idx_word_clouds_created_at').on(table.createdAt),
}));

// Word Cloud Words table
export const wordCloudWords = pgTable('word_cloud_words', {
  id: uuid('id').primaryKey().defaultRandom(),
  wordCloudId: uuid('word_cloud_id').notNull().references(() => wordClouds.id, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  frequency: integer('frequency').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  wordCloudIdx: index('idx_word_cloud_words_word_cloud_id').on(table.wordCloudId),
  wordIdx: index('idx_word_cloud_words_word').on(table.word),
  frequencyIdx: index('idx_word_cloud_words_frequency').on(table.frequency),
}));

// Analytics Events table (TimescaleDB hypertable)
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  wordCloudId: uuid('word_cloud_id').notNull().references(() => wordClouds.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type', { enum: ['click', 'hover', 'view', 'export', 'share'] }).notNull(),
  word: text('word').notNull(),
  sessionToken: text('session_token').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  tenantIdx: index('idx_analytics_events_tenant_id').on(table.tenantId),
  wordCloudIdx: index('idx_analytics_events_word_cloud_id').on(table.wordCloudId),
  eventTypeIdx: index('idx_analytics_events_event_type').on(table.eventType),
  timestampIdx: index('idx_analytics_events_timestamp').on(table.timestamp),
  sessionIdx: index('idx_analytics_events_session_token').on(table.sessionToken),
}));

// Audit Log table
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  fieldName: text('field_name').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  entityTypeIdx: index('idx_audit_log_entity_type').on(table.entityType),
  entityIdIdx: index('idx_audit_log_entity_id').on(table.entityId),
  changedAtIdx: index('idx_audit_log_changed_at').on(table.changedAt),
}));

// Jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['export_word_cloud', 'analytics_report', 'cleanup', 'email'] }).notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  tenantIdx: index('idx_jobs_tenant_id').on(table.tenantId),
  statusIdx: index('idx_jobs_status').on(table.status),
  scheduledAtIdx: index('idx_jobs_scheduled_at').on(table.scheduledAt),
}));

// Word Cloud Versions table
export const wordCloudVersions = pgTable('word_cloud_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  wordCloudId: uuid('word_cloud_id').notNull().references(() => wordClouds.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
}, (table) => ({
  wordCloudIdx: index('idx_word_cloud_versions_word_cloud_id').on(table.wordCloudId),
  versionNumberIdx: index('idx_word_cloud_versions_version_number').on(table.versionNumber),
}));

// Zod schemas for validation
export const insertTenantSchema = createInsertSchema(tenants);
export const selectTenantSchema = createSelectSchema(tenants);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertWordCloudSchema = createInsertSchema(wordClouds);
export const selectWordCloudSchema = createSelectSchema(wordClouds);
export const insertWordCloudWordSchema = createInsertSchema(wordCloudWords);
export const selectWordCloudWordSchema = createSelectSchema(wordCloudWords);
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents);
export const selectAnalyticsEventSchema = createSelectSchema(analyticsEvents);

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WordCloud = typeof wordClouds.$inferSelect;
export type NewWordCloud = typeof wordClouds.$inferInsert;
export type WordCloudWord = typeof wordCloudWords.$inferSelect;
export type NewWordCloudWord = typeof wordCloudWords.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type WordCloudVersion = typeof wordCloudVersions.$inferSelect;
export type NewWordCloudVersion = typeof wordCloudVersions.$inferInsert;