// src/lib/db/seed.ts
import { drizzle } from 'drizzle-orm';
import { postgres } from 'drizzle-orm/pg-core';
import { schema } from './schema';
import { v4 as uuidv4 } from 'uuid';
import {
  Tenant,
  User,
  TenantSettings,
  WordCloud,
  WordCloudWord,
  AnalyticsEvent,
  Job,
  WordCloudVersion,
} from '../../types/entities';

const db = drizzle(postgres(process.env.DATABASE_URL!));

export async function seed() {
  // Tenant
  const tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    name: 'Acme Corp',
  };
  const tenantRow = await db.insert(schema.tenants).values(tenant).returning().then(rows => rows[0]);

  // Users
  const owner: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    tenantId: tenantRow.id,
    email: 'owner@acme.com',
    passwordHash: 'hashed_password', // placeholder; actual hashing handled elsewhere
    name: 'Acme Owner',
    role: 'owner',
  };
  const ownerRow = await db.insert(schema.users).values(owner).returning().then(rows => rows[0]);

  // Tenant Settings
  const themeSetting: Omit<TenantSettings, 'id' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    tenantId: tenantRow.id,
    key: 'theme',
    value: { mode: 'dark' },
  };
  await db.insert(schema.tenantSettings).values(themeSetting).onConflictDoNothing();

  // Word Cloud
  const wordCloud: Omit<WordCloud, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    tenantId: tenantRow.id,
    creatorUserId: ownerRow.id,
    title: 'Sample Word Cloud',
    description: 'A sample word cloud for seeding',
    settings: { colors: ['#ff0000', '#00ff00', '#0000ff'] },
  };
  const wordCloudRow = await db.insert(schema.wordClouds).values(wordCloud).returning().then(rows => rows[0]);

  // Word Cloud Words
  const words: Omit<WordCloudWord, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'>[] = [
    { wordCloudId: wordCloudRow.id, word: 'hello', frequency: 10 },
    { wordCloudId: wordCloudRow.id, word: 'world', frequency: 5 },
    { wordCloudId: wordCloudRow.id, word: 'nextjs', frequency: 7 },
  ];
  await db.insert(schema.wordCloudWords).values(words);

  // Analytics Events
  const event: Omit<AnalyticsEvent, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    tenantId: tenantRow.id,
    wordCloudId: wordCloudRow.id,
    userId: ownerRow.id,
    eventType: 'click',
    word: 'hello',
    sessionToken: uuidv4(),
    timestamp: new Date(),
    metadata: { referrer: 'https://example.com' },
  };
  await db.insert(schema.analyticsEvents).values(event);

  // Word Cloud Version
  const version: Omit<WordCloudVersion, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    wordCloudId: wordCloudRow.id,
    versionNumber: 1,
    snapshot: {
      title: wordCloudRow.title,
      description: wordCloudRow.description,
      settings: wordCloudRow.settings,
      words: words.map(w => ({ word: w.word, frequency: w.frequency })),
    },
    createdBy: ownerRow.id,
  };
  await db.insert(schema.wordCloudVersions).values(version);

  // Job
  const job: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'version'> = {
    tenantId: tenantRow.id,
    type: 'export_word_cloud',
    payload: { wordCloudId: wordCloudRow.id },
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    scheduledAt: new Date(),
  };
  await db.insert(schema.jobs).values(job);

  console.log('Seed data inserted successfully.');
}