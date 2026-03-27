// pipeline-analysis/src/utils/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private readonly service: string;
  private readonly minLevel: LogLevel;
  private readonly levelOrder: Record<LogLevel, number>;

  constructor(service: string, minLevel: LogLevel = 'info') {
    this.service = service;
    this.minLevel = minLevel;
    this.levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.service}] ${message}${contextStr ? ' ' + contextStr : ''}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    switch (level) {
      case 'debug':
        this.debug(message, context);
        break;
      case 'info':
        this.info(message, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, context);
        break;
    }
  }
}