import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { rateLimit, rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// CORS configuration - must be set via environment variable in production
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
const CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Idempotency-Key'];

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || createId();
  const startTime = Date.now();
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Add request ID to response headers
  response.headers.set('X-Request-ID', requestId);
  
  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-inline and unsafe-eval should be removed in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // CORS headers
  const origin = request.headers.get('Origin');
  
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS.join(', '));
    response.headers.set('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS.join(', '));
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response;
  }
  
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIp = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() 
      || request.headers.get('X-Real-IP') 
      || 'unknown';
    
    const rateLimitKey = `${clientIp}:${request.nextUrl.pathname}`;
    const rateLimitResult = await rateLimit(rateLimitKey, rateLimiters.public);
    
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
    
    if (!rateLimitResult.success) {
      response.headers.set('Retry-After', String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)));
      
      logger.warn('Rate limit exceeded', {
        ip: clientIp,
        path: request.nextUrl.pathname,
      }, { requestId });
      
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          },
          requestId,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            'X-Request-ID': requestId,
          },
        }
      );
    }
  }
  
  // Request logging
  logger.info('Request received', {
    method: request.method,
    path: request.nextUrl.pathname,
    origin: origin || 'same-origin',
  }, { requestId });
  
  // Process request
  const result = await Promise.resolve(response);
  
  // Response logging
  const duration = Date.now() - startTime;
  logger.info('Request completed', {
    method: request.method,
    path: request.nextUrl.pathname,
    duration,
  }, { requestId });
  
  return result;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};