import { NextRequest } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { db } from './db/client';
import { users, tenants } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from './logger';
import { createErrorResponse, API_ERRORS } from './api-response';
import { createHash, randomBytes } from 'crypto';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isActive: boolean;
}

export interface AuthSession {
  userId: string;
  tenantId: string;
  role: string;
  expiresAt: Date;
}

const logger = createLogger();

// Session token validation
export function validateSessionToken(token: string): AuthSession | null {
  try {
    // Decode and validate JWT or session token
    // In production, use NextAuth.js or similar
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch (error) {
    logger.warn('auth', 'Invalid session token', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

// Generate session token
export function generateSessionToken(userId: string, tenantId: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    tenantId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  })).toString('base64');
  
  const secret = process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production';
  const signature = createHash('sha256')
    .update(`${header}.${payload}.${secret}`)
    .digest('base64');
  
  return `${header}.${payload}.${signature}`;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

// Get user from request
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const requestId = request.headers.get('X-Request-ID') || createId();
  const logger = createLogger(requestId);

  // Check for session token in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = validateSessionToken(token);
    
    if (!session) {
      logger.warn('auth', 'Invalid bearer token');
      return null;
    }

    // Fetch user from database
    const user = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, session.userId),
        eq(users.tenantId, session.tenantId),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (user.length === 0) {
      logger.warn('auth', 'User not found or inactive', { userId: session.userId });
      return null;
    }

    return {
      id: user[0].id,
      tenantId: user[0].tenantId,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role as AuthUser['role'],
      isActive: user[0].isActive,
    };
  }

  // Check for session cookie (for browser clients)
  const sessionCookie = request.cookies.get('session');
  if (sessionCookie) {
    const session = validateSessionToken(sessionCookie.value);
    
    if (!session) {
      logger.warn('auth', 'Invalid session cookie');
      return null;
    }

    const user = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, session.userId),
        eq(users.tenantId, session.tenantId),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (user.length === 0) {
      return null;
    }

    return {
      id: user[0].id,
      tenantId: user[0].tenantId,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role as AuthUser['role'],
      isActive: user[0].isActive,
    };
  }

  return null;
}

// Get tenant from request (for multi-tenant isolation)
export async function getTenantFromRequest(request: NextRequest): Promise<{ id: string; name: string } | null> {
  const requestId = request.headers.get('X-Request-ID') || createId();
  const logger = createLogger(requestId);

  // First try to get tenant from authenticated user
  const user = await getUserFromRequest(request);
  if (user) {
    const tenant = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, user.tenantId),
        eq(tenants.isActive, true)
      ))
      .limit(1);

    if (tenant.length > 0) {
      return {
        id: tenant[0].id,
        name: tenant[0].name,
      };
    }
  }

  // Check for tenant header (for public/embed endpoints)
  const tenantHeader = request.headers.get('X-Tenant-ID');
  if (tenantHeader) {
    const tenant = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantHeader),
        eq(tenants.isActive, true)
      ))
      .limit(1);

    if (tenant.length > 0) {
      return {
        id: tenant[0].id,
        name: tenant[0].name,
      };
    }
  }

  return null;
}

// Check if user has required role
export function hasRole(user: AuthUser, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role);
}

// Check if user owns resource
export function isResourceOwner(user: AuthUser, resourceCreatorId: string): boolean {
  return user.id === resourceCreatorId;
}

// Middleware for protected routes
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser; requestId: string } | NextResponse> {
  const requestId = request.headers.get('X-Request-ID') || createId();
  const logger = createLogger(requestId);

  const user = await getUserFromRequest(request);
  
  if (!user) {
    logger.warn('auth', 'Authentication required');
    return createErrorResponse(API_ERRORS.UNAUTHORIZED, requestId);
  }

  logger.setTenantId(user.tenantId);
  logger.setUserId(user.id);

  return { user, requestId };
}

// Middleware for