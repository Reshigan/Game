import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '@/lib/db/client';
import { createId } from '@paralleldrive/cuid2';

const execAsync = promisify(exec);

// Global test configuration
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  // Run migrations
  try {
    await execAsync('npm run db:migrate');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Cleanup database connections
  // Note: In production, use proper connection pool management
});

beforeEach(async () => {
  // Reset database state between tests
  // Use transactions for test isolation
});

afterEach(async () => {
  // Cleanup any test data
});

// Test utilities
export const testUtils = {
  // Generate unique test IDs
  generateTestId: () => createId(),
  
  // Generate unique test email
  generateTestEmail: () => `test-${createId()}@example.com`,
  
  // Generate unique tenant name
  generateTenantName: () => `Test Tenant ${createId()}`,
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create test tenant context
  createTestContext: async () => {
    const tenantId = createId();
    const userId = createId();
    const requestId = createId();
    
    return {
      tenantId,
      userId,
      requestId,
      headers: {
        'X-Request-ID': requestId,
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
      },
    };
  },
  
  // Mock current date for consistent test results
  mockDate: (date: Date) => {
    const realDate = Date;
    // @ts-ignore
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(date.getTime());
        } else {
          super(...args);
        }
      }
      static now() {
        return date.getTime();
      }
    };
    return () => {
      // @ts-ignore
      global.Date = realDate;
    };
  },
};

// Export for use in tests
export { db };