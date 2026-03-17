// Test Suite: Test Data Factories
// Requirement Coverage: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2026-03-17
// Sprint: 1

import { faker } from '@faker-js/faker';
import { prisma } from '@/lib/db/client';
import { User, Tenant, WordCloud, Export, AuditLog } from '@/types/entities';

/**
 * Creates a tenant with random data.
 */
export async function tenantFactory(overrides: Partial<Tenant> = {}): Promise<Tenant> {
  const tenant = await prisma.tenant.create({
    data: {
      name: faker.company.name(),
      subdomain: faker.internet.domainWord(),
      ...overrides,
    },
  });
  return tenant;
}

/**
 * Creates a user with random data.
 */
export async function userFactory(overrides: Partial<User> = {}): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email: faker.internet.email(),
      passwordHash: 'hashed',
      role: 'user',
      tenantId: overrides.tenantId ?? (await tenantFactory()).id,
      ...overrides,
    },
  });
  return user;
}

/**
 * Creates a word cloud with random words.
 */
export async function wordCloudFactory(overrides: Partial<WordCloud> = {}): Promise<WordCloud> {
  const words = Array.from({ length: faker.datatype.number({ min: 5, max: 15 }) }, () => ({
    text: faker.lorem.word(),
    weight: faker.datatype.number({ min: 1, max: 20 }),
  }));
  const wordCloud = await prisma.wordCloud.create({
    data: {
      title: faker.lorem.sentence(),
      tenantId: overrides.tenantId ?? (await tenantFactory()).id,
      config: {
        words,
      },
      ...overrides,
    },
  });
  return wordCloud;
}

/**
 * Creates an export record.
 */
export async function exportFactory(overrides: Partial<Export> = {}): Promise<Export> {
  const exportRecord = await prisma.export.create({
    data: {
      wordCloudId: overrides.wordCloudId ?? (await wordCloudFactory()).id,
      exportType: 'png',
      s3Key: `exports/${faker.datatype.uuid()}.png`,
      ...overrides,
    },
  });
  return exportRecord;
}

/**
 * Creates an audit log entry.
 */
export async function auditLogFactory(overrides: Partial<AuditLog> = {}): Promise<AuditLog> {
  const auditLog = await prisma.auditLog.create({
    data: {
      entityType: 'User',
      entityId: overrides.entityId ?? (await userFactory()).id,
      fieldName: 'role',
      oldValue: 'user',
      newValue: 'admin',
      changedById: overrides.changedById ?? (await userFactory()).id,
      ipAddress: faker.internet.ip(),
      tenantId: overrides.tenantId ?? (await tenantFactory()).id,
      ...overrides,
    },
  });
  return auditLog;
}