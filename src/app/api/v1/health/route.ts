import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { createLogger } from '@/lib/logger';
import { checkHealth } from '@/lib/health';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || createId();
  const logger = createLogger(requestId);
  
  logger.info('api', 'Health check requested', {
    method: 'GET',
    path: '/api/v1/health',
    userAgent: request.headers.get('User-Agent'),
  });

  try {
    const healthStatus = await checkHealth(requestId);
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                       healthStatus.status === 'degraded' ? 200 : 503;
    
    const response = NextResponse.json({
      data: healthStatus,
      requestId,
    }, { status: statusCode });

    // Add required headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('API-Version', '1.0');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    logger.info('api', 'Health check completed', {
      status: healthStatus.status,
      duration: logger.getDuration(),
    });

    return response;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error during health check');
    logger.fatal('system', 'Health check failed catastrophically', err);
    
    return NextResponse.json({
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        requestId,
      },
    }, { status: 503 });
  }
}