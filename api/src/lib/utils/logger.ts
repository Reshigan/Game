import { pino, Logger } from 'pino';

/**
 * Log levels controlled by LOG_LEVEL environment variable.
 * Defaults to 'info' in production, 'debug' in development.
 */
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Alerting configuration for critical errors.
 * ALERT_WEBHOOK_URL: Webhook endpoint for alerting (Slack, PagerDuty, etc.)
 * ALERT_EMAIL: Email address for critical alerts
 */
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

/**
 * Structured logger using pino for JSON-formatted logs.
 * All logs include: timestamp, level, message, requestId, tenantId, and context.
 */
export const logger: Logger = pino({
  level: LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'email',
      '*.email',
      'ip',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
});

/**
 * Alerting function for critical errors.
 * Sends alerts to configured webhook and/or email.
 */
export async function sendCriticalAlert(context: {
  requestId: string;
  tenantId?: string;
  error: string;
  stack?: string;
  timestamp: string;
}): Promise<void> {
  const alertPayload = {
    severity: 'critical',
    service: 'word-cloud-api',
    environment: process.env.NODE_ENV,
    ...context,
  };

  // Send to webhook if configured
  if (ALERT_WEBHOOK_URL) {
    try {
      await fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      });
    } catch (error) {
      // Don't throw - logging should never break the application
      logger.error({
        requestId: context.requestId,
        message: 'Failed to send alert to webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Log alert for email processing if configured
  if (ALERT_EMAIL) {
    logger.fatal({
      ...alertPayload,
      alertEmail: ALERT_EMAIL,
    });
  }
}

/**
 * Creates a child logger with additional context.
 */
export function createLogger(context: Record<string, any>): Logger {
  return logger.child(context);
}

export default logger;