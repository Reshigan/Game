// src/lib/utils/logger.ts
import pino from 'pino';

export interface LogContext {
  requestId?: string;
  message: string;
  statusCode?: number;
  durationMs?: number;
  error?: string | Error | ErrorInfo | Record<string, unknown>;
  [key: string]: unknown;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

export interface RequestInfo {
  method: string;
  url: string;
  headers: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export interface ResponseInfo {
  statusCode: number;
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Structured logger with PII redaction and audit trail support.
 * 
 * CRITICAL: This is a SOX-controlled component for audit logging.
 * All sensitive operations must be logged with appropriate context.
 */
export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.secret',
      'headers.authorization',
      'headers.cookie',
      'body.password',
      'body.token',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    error: pino.stdSerializers.err,
    request: (req: RequestInfo): RequestInfo => ({
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers as Record<string, unknown>),
      query: req.query,
    }),
    response: (res: ResponseInfo): ResponseInfo => ({
      statusCode: res.statusCode,
    }),
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

/**
 * Sanitize headers to remove sensitive information.
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-refresh-token',
  ];

  for (const header of sensitiveHeaders) {
    if (sanitized[header] !== undefined) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log levels with typed context.
 */
export const log = {
  info: (context: LogContext): void => {
    logger.info(context, context.message);
  },

  warn: (context: LogContext): void => {
    logger.warn(context, context.message);
  },

  error: (context: LogContext): void => {
    logger.error(context, context.message);
  },

  debug: (context: LogContext): void => {
    if (!isProduction) {
      logger.debug(context, context.message);
    }
  },

  /**
   * Audit log for SOX compliance.
   * These logs must be immutable and retained for compliance requirements.
   */
  audit: (context: Omit<LogContext, 'message'> & { 
    message: string; 
    action: string; 
    actor: string; 
    resource: string;
    outcome: 'success' | 'failure';
  }): void => {
    logger.info({
      ...context,
      audit: true,
      timestamp: new Date().toISOString(),
    }, context.message);
  },
};

/**
 * Create a child logger with additional context.
 */
export function createLogger(context: Record<string, unknown>): ReturnType<typeof logger.child> {
  return logger.child(context);
}

/**
 * Express/Fastify middleware for request logging.
 */
export function requestLogger() {
  return {
    onRequest: (req: { method: string; url: string; headers: Record<string, unknown> }) => {
      logger.debug({
        message: 'Incoming request',
        method: req.method,
        url: req.url,
      });
    },
    onResponse: (req: { method: string; url: string }, res: { statusCode: number }, responseTime: number) => {
      logger.info({
        message: 'Request completed',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: responseTime,
      });
    },
    onError: (req: { method: string; url: string }, res: { statusCode: number }, error: Error) => {
      logger.error({
        message: 'Request failed',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    },
  };
}

export default logger;