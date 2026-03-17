import { faker } from '@faker-js/faker';
import type { Tenant, User, WordCloud, WordCloudWord, AnalyticsEvent, AuditLog, Job, WordCloudVersion } from '@/types/entities';
import { createId } from '@paralleldrive/cuid2';

// UUID factory
const createUUID = (): string => faker.string.uuid();

// Timestamp factory with timezone safety
const createTimestamp = (options?: { min?: Date; max?: Date }): Date => {
  const min = options?.min || new Date('2024-01-01T00:00:00Z');
  const max = options?.max || new Date('2024-12-31T23:59:59Z');
  return faker.date.between({ from: min, to: max });
};

// Tenant factory
export const createTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: createUUID(),
  name: faker.company.name(),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// User factory
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: createUUID(),
  tenantId: createUUID(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: faker.helpers.arrayElement(['owner', 'admin', 'editor', 'viewer']),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// WordCloud factory
export const createWordCloud = (overrides: Partial<WordCloud> = {}): WordCloud => ({
  id: createUUID(),
  tenantId: createUUID(),
  title: faker.lorem.sentence(5),
  description: faker.lorem.paragraph(2),
  sourceText: faker.lorem.paragraphs(3),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// WordCloudWord factory
export const createWordCloudWord = (overrides: Partial<WordCloudWord> = {}): WordCloudWord => ({
  id: createUUID(),
  wordCloudId: createUUID(),
  word: faker.lorem.word(),
  frequency: faker.number.int({ min: 1, max: 100 }),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// AnalyticsEvent factory
export const createAnalyticsEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: createUUID(),
  tenantId: createUUID(),
  wordCloudId: createUUID(),
  userId: createUUID(),
  eventType: faker.helpers.arrayElement(['click', 'hover', 'view', 'export']),
  word: faker.lorem.word(),
  sessionToken: faker.string.alphanumeric(32),
  timestamp: createTimestamp(),
  metadata: {
    coordinates: {
      x: faker.number.int({ min: 0, max: 800 }),
      y: faker.number.int({ min: 0, max: 600 }),
    },
    dwellTime: faker.number.int({ min: 100, max: 5000 }),
    userAgent: faker.internet.userAgent(),
  },
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// AuditLog factory
export const createAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: createUUID(),
  entityType: faker.helpers.arrayElement(['wordCloud', 'user', 'tenant']),
  entityId: createUUID(),
  fieldName: faker.helpers.arrayElement(['title', 'description', 'sourceText', 'isActive']),
  oldValue: { value: 'old' },
  newValue: { value: 'new' },
  changedBy: createUUID(),
  changedAt: createTimestamp(),
  ipAddress: faker.internet.ip(),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// Job factory
export const createJob = (overrides: Partial<Job> = {}): Job => ({
  id: createUUID(),
  tenantId: createUUID(),
  type: faker.helpers.arrayElement(['export', 'analytics', 'cleanup']),
  payload: { wordCloudId: createUUID(), format: 'png' },
  status: faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed']),
  attempts: faker.number.int({ min: 0, max: 3 }),
  maxAttempts: 5,
  scheduledAt: createTimestamp(),
  startedAt: undefined,
  completedAt: undefined,
  error: undefined,
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// WordCloudVersion factory
export const createWordCloudVersion = (overrides: Partial<WordCloudVersion> = {}): WordCloudVersion => ({
  id: createUUID(),
  wordCloudId: createUUID(),
  versionNumber: faker.number.int({ min: 1, max: 10 }),
  snapshot: {
    title: faker.lorem.sentence(5),
    description: faker.lorem.paragraph(2),
    words: Array.from({ length: 10 }, () => ({
      word: faker.lorem.word(),
      frequency: faker.number.int({ min: 1, max: 100 }),
    })),
  },
  createdBy: createUUID(),
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  deletedAt: null,
  isActive: true,
  version: 1,
  ...overrides,
});

// Test data builders for complex scenarios
export const buildTestTenantWithUser = (overrides: { tenant?: Partial<Tenant>; user?: Partial<User> } = {}) => {
  const tenant = createTenant(overrides.tenant);
  const user = createUser({ tenantId: tenant.id, role: 'owner', ...overrides.user });
  return { tenant, user };
};

export const buildTestWordCloudWithWords = (
  tenantId: string,
  userId: string,
  wordCount: number = 10
) => {
  const wordCloud = createWordCloud({ tenantId, creatorUserId: userId });
  const words = Array.from({ length: wordCount }, () =>
    createWordCloudWord({ wordCloudId: wordCloud.id })
  );
  return { wordCloud, words };
};

export const buildTestAnalyticsEvents = (
  tenantId: string,
  wordCloudId: string,
  eventCount: number = 100
) => {
  return Array.from({ length: eventCount }, () =>
    createAnalyticsEvent({ tenantId, wordCloudId })
  );
};