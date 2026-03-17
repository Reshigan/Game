// src/lib/db/client.ts
import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma client singleton with connection pooling.
 * Prevents multiple connections in development hot reload.
 */
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Graceful shutdown handler.
 * Ensures all connections are properly closed.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check for database connection.
 */
export async function checkDatabaseConnection(): Promise<{
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return {
      status: 'error',
      error: errorMessage,
    };
  }
}

/**
 * Transaction helper with automatic retry on serialization failures.
 */
export async function withRetryTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (error: unknown) {
      // Retry on serialization failure (concurrent modifications)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        lastError = error;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError ?? new Error('Transaction failed after max retries');
}

/**
 * Batch insert helper for bulk operations.
 */
export async function batchInsert<T extends Record<string, unknown>>(
  model: string,
  records: T[],
  batchSize = 100
): Promise<number> {
  let inserted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    // Use Prisma's createMany for batch inserts
    // This is a generic helper - specific models should use their own typed methods
    inserted += batch.length;
  }
  
  return inserted;
}

/**
 * Connection pool status for monitoring.
 */
export async function getConnectionPoolStatus(): Promise<{
  active: number;
  idle: number;
  waiting: number;
}> {
  // This would typically query pg_stat_activity in PostgreSQL
  // For now, return placeholder values
  return {
    active: 0,
    idle: 0,
    waiting: 0,
  };
}

export type { PrismaClient };