import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Validate required environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Connection configuration
const connectionString = DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

// Create connection with proper pooling
const client = postgres(connectionString, {
  max: isProduction ? 20 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  // Prepare statements for better performance
  prepare: true,
  // Enable SSL in production
  ssl: isProduction ? 'require' : false,
  // Transform undefined to null for consistency
  transform: {
    undefined: null,
  },
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.end();
});

process.on('SIGINT', async () => {
  await client.end();
});

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}