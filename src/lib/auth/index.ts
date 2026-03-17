import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/client';
import { users, tenants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type { Tenant, User } from '@/types/entities';

export interface AuthContext {
  tenant: Tenant;
  user: User;
  requestId: string;
}

export async function getTenantFromAuth(request: NextRequest): Promise<AuthContext | null> {
  const requestId = request.headers.get('X-Request-ID') || createId();
  
  try {
    // Get session from NextAuth
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return null;
    }
    
    // Fetch user with tenant
    const userResult = await db
      .select({
        user: users,
        tenant: tenants,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(
        and(
          eq(users.email, session.user.email),
          eq(users.isActive, true),
          eq(tenants.isActive, true)
        )
      )
      .limit(1);
    
    if (userResult.length === 0) {
      return null;
    }
    
    const { user, tenant } = userResult[0];
    
    return {
      tenant,
      user,
      requestId,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest): Promise<AuthContext> {
  return getTenantFromAuth(request).then((ctx) => {
    if (!ctx) {
      throw new Error('UNAUTHORIZED');
    }
    return ctx;
  });
}

export function requireRole(request: NextRequest, roles: string[]): Promise<AuthContext> {
  return requireAuth(request).then((ctx) => {
    if (!roles.includes(ctx.user.role)) {
      throw new Error('FORBIDDEN');
    }
    return ctx;
  });
}