import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { getTenantFromAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { analyticsEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const AnalyticsEventInputSchema = z.object({
  wordCloudId: z.string().uuid(),
  eventType: z.enum(['click', 'hover', 'view']),
  word: z.string().min(1).max(50),
  sessionToken: z.string().min(1).max(100),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || createId();
  
  try {
    const tenant = await getTenantFromAuth(request);
    
    if (!tenant) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
          requestId,
        },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const validation = AnalyticsEventInputSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
          requestId,
        },
        { status: 400 }
      );
    }
    
    const { wordCloudId, eventType, word, sessionToken, metadata } = validation.data;
    
    // Check if word cloud exists and belongs to tenant
    const [wordCloud] = await db
      .select()
      .from(db.schema.wordClouds)
      .where(
        and(
          eq(db.schema.wordClouds.id, wordCloudId),
          eq(db.schema.wordClouds.tenantId, tenant.id),
          eq(db.schema.wordClouds.isActive, true)
        )
      );
    
    if (!wordCloud) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Word cloud not found',
          },
          requestId,
        },
        { status: 404 }
      );
    }
    
    // Create analytics event
    const [event] = await db
      .insert(analyticsEvents)
      .values({
        tenantId: tenant.id,
        wordCloudId,
        eventType,
        word,
        sessionToken,
        metadata: metadata || {},
      })
      .returning();
    
    return NextResponse.json(
      {
        data: {
          event: {
            id: event.id,
            tenantId: event.tenantId,
            wordCloudId: event.wordCloudId,
            eventType: event.eventType,
            word: event.word,
            sessionToken: event.sessionToken,
            metadata: event.metadata,
            timestamp: event.timestamp,
          },
        },
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating analytics event:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create analytics event',
          details: error instanceof Error ? { message: error.message } : undefined,
        },
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || createId();
  
  try {
    const tenant = await getTenantFromAuth(request);
    
    if (!tenant) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
          requestId,
        },
        { status: 401 }
      );
    }
    
    const wordCloudId = request.nextUrl.searchParams.get('wordCloudId');
    
    if (!wordCloudId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'wordCloudId parameter is required',
          },
          requestId,
        },
        { status: 400 }
      );
    }
    
    // Check if word cloud exists and belongs to tenant
    const [wordCloud] = await db
      .select()
      .from(db.schema.wordClouds)
      .where(
        and(
          eq(db.schema.wordClouds.id, wordCloudId),
          eq(db.schema.wordClouds.tenantId, tenant.id),
          eq(db.schema.wordClouds.isActive, true)
        )
      );
    
    if (!wordCloud) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Word cloud not found',
          },
          requestId,
        },
        { status: 404 }
      );
    }
    
    // Get analytics events for this word cloud
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, tenant.id),
          eq(analyticsEvents.wordCloudId, wordCloudId),
          eq(analyticsEvents.isActive, true)
        )
      )
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(1000);
    
    return NextResponse.json(
      {
        data: {
          events: events.map((e) => ({
            id: e.id,
            tenantId: e.tenantId,
            wordCloudId: e.wordCloudId,
            eventType: e.eventType,
            word: e.word,
            sessionToken: e.sessionToken,
            metadata: e.metadata,
            timestamp: e.timestamp,
          })),
          meta: {
            totalCount: events.length,
          },
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics events',
          details: error instanceof Error ? { message: error.message } : undefined,
        },
        requestId,
      },
      { status: 500 }
    );
  }
}