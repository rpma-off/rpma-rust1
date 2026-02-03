// frontend/src/lib/logging/logger.ts
// Main logger implementation with correlation ID support

import {
  LogLayer,
  LogDomain,
  LogSeverity,
  LogEntry,
  LogContext,
  LoggerConfig,
  CorrelationContext,
  CorrelationIdGenerator
} from './types';

export class RPMAFrontendLogger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogSeverity.INFO,
      enable_console: true,
      enable_remote: false,
      enable_local_storage: true,
      max_local_storage_entries: 1000,
      batch_size: 10,
      flush_interval_ms: 5000,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      ...config
    };

    this.initializeLogger();
  }

  private initializeLogger() {
    // Set up automatic flushing for remote logging
    if (this.config.enable_remote) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flush_interval_ms);
    }

    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Filter out benign ResizeObserver errors
        if (event.message && event.message.includes('ResizeObserver loop')) {
          event.preventDefault();
          return;
        }

        this.error(LogDomain.SYSTEM, 'Uncaught error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error(LogDomain.SYSTEM, 'Unhandled promise rejection', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }

  private createLogEntry(
    severity: LogSeverity,
    domain: LogDomain,
    operation: string,
    context_data?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): LogEntry {
    const context = CorrelationContext.get();
    const error = metadata?.error as LogEntry['error'] | undefined;

    return {
      id: this.generateUniqueId(),
      timestamp: new Date().toISOString(),
      correlation_id: context.correlation_id || CorrelationIdGenerator.getInstance().generate(),
      layer: LogLayer.FRONTEND,
      domain,
      severity,
      operation,
      user_id: context.user_id,
      context_data,
      error,
      metadata: {
        component: context.component,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...metadata
      }
    };
  }

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private shouldLog(severity: LogSeverity): boolean {
    const levels = Object.values(LogSeverity);
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(severity);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const correlation = entry.correlation_id ? `[CORR:${entry.correlation_id}]` : '';

    let formatted = `${timestamp} ${correlation} [${entry.layer}] [${entry.domain}] [${entry.severity}] ${entry.operation}`;

    if (entry.user_id) {
      formatted += ` | user_id: ${entry.user_id}`;
    }

    if (entry.context_data) {
      formatted += ` | data: ${JSON.stringify(entry.context_data)}`;
    }

    if (entry.duration_ms !== undefined) {
      formatted += ` | duration: ${entry.duration_ms}ms`;
    }

    if (entry.error) {
      formatted += ` | error: ${entry.error.name}: ${entry.error.message}`;
    }
    const errorDetails = entry.metadata?.error_details as { message?: string } | undefined;
    if (!entry.error && errorDetails?.message) {
      formatted += ` | error: ${errorDetails.message}`;
    }

    return formatted;
  }

  private log(
    severity: LogSeverity,
    domain: LogDomain,
    operation: string,
    context_data?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) {
    if (!this.shouldLog(severity)) {
      return;
    }

    const entry = this.createLogEntry(severity, domain, operation, context_data, metadata);

    // Console logging
    if (this.config.enable_console) {
      const formatted = this.formatLogEntry(entry);

      switch (severity) {
        case LogSeverity.TRACE:
        case LogSeverity.DEBUG:
          console.debug(formatted, entry);
          break;
        case LogSeverity.INFO:
          console.info(formatted, entry);
          break;
        case LogSeverity.WARN:
          console.warn(formatted, entry);
          break;
        case LogSeverity.ERROR:
        case LogSeverity.FATAL:
          console.error(formatted, entry);
          break;
      }
    }

    // Local storage logging
    if (this.config.enable_local_storage && typeof window !== 'undefined') {
      this.logToLocalStorage(entry);
    }

    // Remote logging
    if (this.config.enable_remote) {
      this.logQueue.push(entry);

      if (this.logQueue.length >= this.config.batch_size) {
        this.flush();
      }
    }
  }

  private logToLocalStorage(entry: LogEntry) {
    try {
      const logs = this.getLocalStorageLogs();
      logs.push(entry);

      // Keep only the most recent entries
      if (logs.length > this.config.max_local_storage_entries) {
        logs.splice(0, logs.length - this.config.max_local_storage_entries);
      }

      localStorage.setItem('rpma_logs_v2', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to log to localStorage:', error);
    }
  }

  private getLocalStorageLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem('rpma_logs_v2');
      if (!logs) return [];

      return JSON.parse(logs);
    } catch (error) {
      console.warn('Failed to read logs from localStorage:', error);
      return [];
    }
  }

  private async flush() {
    if (this.logQueue.length === 0 || !this.config.remote_endpoint) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch(this.config.remote_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      console.warn('Failed to send logs to remote endpoint:', error);
      // Re-add logs to queue for retry
      this.logQueue.unshift(...logsToSend);
    }
  }

  // Public logging methods
  trace(domain: LogDomain, operation: string, context_data?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.log(LogSeverity.TRACE, domain, operation, context_data, metadata);
  }

  debug(domain: LogDomain, operation: string, context_data?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.log(LogSeverity.DEBUG, domain, operation, context_data, metadata);
  }

  info(domain: LogDomain, operation: string, context_data?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.log(LogSeverity.INFO, domain, operation, context_data, metadata);
  }

  warn(domain: LogDomain, operation: string, context_data?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.log(LogSeverity.WARN, domain, operation, context_data, metadata);
  }

  error(domain: LogDomain, operation: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    let errorData: Record<string, unknown> | undefined;
    let errorObj: LogEntry['error'];

    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error && typeof error === 'object') {
      errorData = error as Record<string, unknown>;
    }

    this.log(LogSeverity.ERROR, domain, operation, errorData, {
      ...metadata,
      error: errorObj
    });
  }

  fatal(domain: LogDomain, operation: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    let errorData: Record<string, unknown> | undefined;
    let errorObj: LogEntry['error'];

    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error && typeof error === 'object') {
      errorData = error as Record<string, unknown>;
    }

    this.log(LogSeverity.FATAL, domain, operation, errorData, {
      ...metadata,
      error: errorObj
    });
  }

  // Performance logging
  time(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(LogDomain.SYSTEM, `Timer: ${operation}`, undefined, { duration });
    };
  }

  // Context management
  withContext(context: Partial<LogContext>, fn: () => void): void {
    const previousContext = CorrelationContext.get();
    CorrelationContext.set(context);
    try {
      fn();
    } finally {
      CorrelationContext.set(previousContext);
    }
  }

  async withContextAsync<T>(context: Partial<LogContext>, fn: () => Promise<T>): Promise<T> {
    const previousContext = CorrelationContext.get();
    CorrelationContext.set(context);
    try {
      return await fn();
    } finally {
      CorrelationContext.set(previousContext);
    }
  }

  // Get logs for debugging
  getLogs(
    severity?: LogSeverity,
    domain?: LogDomain,
    correlationId?: string,
    limit?: number
  ): LogEntry[] {
    let logs = this.getLocalStorageLogs();

    if (severity !== undefined) {
      logs = logs.filter(log => log.severity === severity);
    }

    if (domain !== undefined) {
      logs = logs.filter(log => log.domain === domain);
    }

    if (correlationId !== undefined) {
      logs = logs.filter(log => log.correlation_id === correlationId);
    }

    if (limit !== undefined) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  // Clear logs
  clearLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rpma_logs_v2');
    }
    this.logQueue = [];
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton instance
export const logger = new RPMAFrontendLogger({
  level: process.env.NODE_ENV === 'development' ? LogSeverity.DEBUG : LogSeverity.INFO,
  enable_console: true,
  enable_local_storage: true,
  enable_remote: process.env.NODE_ENV === 'production',
  remote_endpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
});
