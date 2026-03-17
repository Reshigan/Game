import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { getTenantFromAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { analyticsEvents, wordCloudWords } from '@/lib/db/schema';
import { eq, and, sql, count, sum } from 'drizzle-orm';

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
    
    if (!body.wordCloudId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'wordCloudId is required',
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
          eq(db.schema.wordClouds.id, body.wordCloudId),
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
    
    // Aggregate analytics events by word
    const wordAggregates = await db
      .select({
        word: analyticsEvents.word,
        clickCount: count().filter(eq(analyticsEvents.eventType, 'click')),
        hoverCount: count().filter(eq(analyticsEvents.eventType, 'hover')),
        viewCount: count().filter(eq(analyticsEvents.eventType, 'view')),
        totalEvents: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, tenant.id),
          eq(analyticsEvents.wordCloudId, body.wordCloudId),
          eq(analyticsEvents.isActive, true)
        )
      )
      .groupBy(analyticsEvents.word)
      .orderBy(sql`total_events DESC`);
    
    // Get total events
    const totalEvents = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, tenant.id),
          eq(analyticsEvents.wordCloudId, body.wordCloudId),
          eq(analyticsEvents.isActive, true)
        )
      );
    
    // Get unique sessions
    const uniqueSessions = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, tenant.id),
          eq(analyticsEvents.wordCloudId, body.wordCloudId),
          eq(analyticsEvents.isActive, true)
        )
      )
      .distinct(analyticsEvents.sessionToken);
    
    return NextResponse.json(
      {
        data: {
          wordAggregates: wordAggregates.map((w) => ({
            word: w.word,
            clickCount: Number(w.clickCount),
            hoverCount: Number(w.hoverCount),
            viewCount: Number(w.viewCount),
            totalEvents: Number(w.totalEvents),
          })),
          summary: {
            totalEvents: Number(totalEvents[0]?.count || 0),
            uniqueSessions: Number(uniqueSessions[0]?.count || 0),
          },
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error aggregating analytics events:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to aggregate analytics events',
          details: error instanceof Error ? { message: error.message } : undefined,
        },
        requestId,
      },
      { status: 500 }
    );
  }
}