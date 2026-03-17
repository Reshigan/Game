import { PrismaClient } from '@prisma/client';

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
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
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
    } catch (error: any) {
      // Retry on serialization failure (concurrent modifications)
      if (error.code === 'P2034') {
        lastError = error;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError || new Error('Transaction failed after max retries');
}