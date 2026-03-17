import { createId } from '@paralleldrive/cuid2';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogCategory = 'api' | 'auth' | 'database' | 'analytics' | 'job' | 'system';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  tenantId?: string;
  userId?: string;
  category: LogCategory;
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function sanitizeForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'authorization'];
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLog(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
}

class Logger {
  private requestId: string;
  private tenantId?: string;
  private userId?: string;
  private startTime: number;

  constructor(requestId?: string) {
    this.requestId = requestId || createId();
    this.startTime = Date.now();
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  private log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      category,
      message,
      duration: Date.now() - this.startTime,
    };

    if (this.tenantId) entry.tenantId = this.tenantId;
    if (this.userId) entry.userId = this.userId;
    if (metadata) entry.metadata = sanitizeForLog(metadata) as Record<string, unknown>;
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      };
    }

    // Use stdout for structured logging (compatible with Vercel, Docker, K8s)
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  debug(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', category, message, metadata);
  }

  info(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.log('info', category, message, metadata);
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', category, message, metadata);
  }

  error(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', category, message, metadata, error);
  }

  fatal(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('fatal', category, message, metadata, error);
    // Trigger alerting hook for fatal errors
    this.triggerAlert(message, error);
  }

  private async triggerAlert(message: string, error?: Error): Promise<void> {
    const alertWebhook = process.env.ALERT_WEBHOOK_URL;
    const alertEmail = process.env.ALERT_EMAIL;

    if (!alertWebhook && !alertEmail) return;

    const alertPayload = {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      tenantId: this.tenantId,
      message,
      error: error ? { name: error.name, message: error.message } : undefined,
      environment: process.env.NODE_ENV,
      service: 'word-cloud-analytics',
    };

    try {
      if (alertWebhook) {
        await fetch(alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertPayload),
        });
      }
    } catch (err) {
      // Don't throw on alert failure, just log
      process.stderr.write(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to send alert',
        originalError: err,
      }) + '\n');
    }
  }

  getRequestId(): string {
    return this.requestId;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

// Factory function for creating request-scoped loggers
export function createLogger(requestId?: string): Logger {
  return new Logger(requestId);
}

// Global logger for non-request contexts (jobs, background tasks)
export const globalLogger = {
  info: (category: LogCategory, message: string, metadata?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      requestId: 'global',
      category,
      message,
      metadata: sanitizeForLog(metadata) as Record<string, unknown>,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      requestId: 'global',
      category,
      message,
      metadata: sanitizeForLog(metadata) as Record<string, unknown>,
      error: error ? { name: error.name, message: error.message } : undefined,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
};

export type { Logger };