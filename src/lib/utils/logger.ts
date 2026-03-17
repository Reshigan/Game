import pino from 'pino';

export interface LogContext {
  requestId?: string;
  message: string;
  statusCode?: number;
  durationMs?: number;
  error?: string | Error | Record<string, any>;
  [key: string]: any;
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
    request: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      query: req.query,
    }),
    response: (res: any) => ({
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
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
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
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Audit logger for sensitive operations.
 * These logs should be retained for compliance requirements.
 */
export const auditLogger = {
  logUserAction(
    action: string,
    userId: string,
    tenantId: string,
    details: Record<string, any>
  ): void {
    logger.info({
      audit: true,
      action,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  logDataAccess(
    resource: string,
    resourceId: string,
    operation: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    userId: string,
    tenantId: string
  ): void {
    logger.info({
      audit: true,
      category: 'DATA_ACCESS',
      resource,
      resourceId,
      operation,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  },

  logAuthEvent(
    event: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET',
    userId: string,
    tenantId: string | null,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    logger.info({
      audit: true,
      category: 'AUTH',
      event,
      userId,
      tenantId,
      success,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },

  logSecurityEvent(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>
  ): void {
    const logMethod = severity === 'CRITICAL' || severity === 'HIGH' ? 'error' : 'warn';
    logger[logMethod]({
      audit: true,
      category: 'SECURITY',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};