/**
 * Advanced Logging System for RPMA V2
 * Provides structured logging with different levels, contexts, and output formats
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export enum LogContext {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  CONFIG = 'config',
  UI = 'ui',
  BUSINESS_RULES = 'business_rules',
  SECURITY = 'security',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  MONITORING = 'monitoring',
  SYSTEM = 'system',
  HOOK = "HOOK"
}

export type LogMetadata = {
  component?: string;
  userId?: string;
  [key: string]: unknown;
};

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalStorageEntries: number;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      enableLocalStorage: true,
      maxLocalStorageEntries: 1000,
      batchSize: 10,
      flushInterval: 5000,
      ...config
    };

    this.initializeLogger();
  }

  private initializeLogger() {
    // Set up automatic flushing
    if (this.config.enableRemote) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }

    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Filter out benign ResizeObserver errors
        if (event.message && event.message.includes('ResizeObserver loop')) {
          event.preventDefault();
          return;
        }

        this.error(LogContext.SYSTEM, 'Uncaught error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error(LogContext.SYSTEM, 'Unhandled promise rejection', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }

  private createLogEntry(
    level: LogLevel,
    context: LogContext,
    message: string,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      id: this.generateUniqueId(),
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      requestId: this.getRequestId(),
      component: this.getCurrentComponent(),
      action: this.getCurrentAction(),
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...metadata
      }
    };
  }

  private getCurrentUserId(): string | undefined {
    // Try to get from localStorage or session
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId') || undefined;
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sessionId') || undefined;
    }
    return undefined;
  }

  private getRequestId(): string | undefined {
    // Generate a simple request ID for tracking
    return Math.random().toString(36).substring(2, 15);
  }

  private generateUniqueId(): string {
    // Generate a unique ID using timestamp and random string
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private getCurrentComponent(): string | undefined {
    // This would be set by React components
    return undefined;
  }

  private getCurrentAction(): string | undefined {
    // This would be set by the calling code
    return undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleString();
    
    let formatted = `[${timestamp}] ${levelName} [${entry.context}] ${entry.message}`;
    
    if (entry.userId) {
      formatted += ` | User: ${entry.userId}`;
    }
    
    if (entry.component) {
      formatted += ` | Component: ${entry.component}`;
    }
    
    if (entry.action) {
      formatted += ` | Action: ${entry.action}`;
    }
    
    if (entry.duration !== undefined) {
      formatted += ` | Duration: ${entry.duration}ms`;
    }
    
    if (entry.data) {
      formatted += ` | Data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      formatted += ` | Error: ${entry.error.name}: ${entry.error.message}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, context: LogContext, message: string, data?: unknown, metadata?: Record<string, unknown>) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, context, message, data, metadata);

    // Console logging
    if (this.config.enableConsole) {
      const formatted = this.formatLogEntry(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted, entry);
          break;
        case LogLevel.INFO:
          console.info(formatted, entry);
          break;
        case LogLevel.WARN:
          console.warn(formatted, entry);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted, entry);
          break;
      }
    }

    // Local storage logging
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      this.logToLocalStorage(entry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.logQueue.push(entry);
      
      if (this.logQueue.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  private logToLocalStorage(entry: LogEntry) {
    try {
      const logs = this.getLocalStorageLogs();
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxLocalStorageEntries) {
        logs.splice(0, logs.length - this.config.maxLocalStorageEntries);
      }
      
      localStorage.setItem('rpma_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to log to localStorage:', error);
    }
  }

  private getLocalStorageLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem('rpma_logs');
      if (!logs) return [];
      
      const parsedLogs = JSON.parse(logs);
      
      // Handle backward compatibility: add IDs to logs that don't have them
      return parsedLogs.map((log: unknown, index: number) => {
        const logEntry = log as { id?: string; timestamp: string };
        if (!logEntry.id) {
          logEntry.id = `legacy-${logEntry.timestamp}-${index}`;
        }
        return logEntry;
      });
    } catch (error) {
      console.warn('Failed to read logs from localStorage:', error);
      return [];
    }
  }

  private async flush() {
    if (this.logQueue.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch(this.config.remoteEndpoint, {
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
  info(context: LogContext, message: string, metadata?: LogMetadata): void;
  info(message: string, data?: unknown, context?: LogMetadata): void;
  info(contextOrMessage: LogContext | string, messageOrData?: string | unknown, metadataOrContext?: LogMetadata): void {
    if (typeof contextOrMessage === 'string') {
      // info(message, data?, context?)
      this.log(LogLevel.INFO, LogContext.SYSTEM, contextOrMessage, messageOrData, metadataOrContext);
    } else {
      // info(context, message, metadata?)
      this.log(LogLevel.INFO, contextOrMessage, messageOrData as string, undefined, metadataOrContext);
    }
  }

  error(context: LogContext, message: string, metadata?: LogMetadata): void;
  error(message: string, error?: unknown, context?: LogMetadata): void;
  error(contextOrMessage: LogContext | string, messageOrError?: string | unknown, metadataOrContext?: LogMetadata): void {
    if (typeof contextOrMessage === 'string') {
      this.log(LogLevel.ERROR, LogContext.SYSTEM, contextOrMessage, messageOrError, metadataOrContext);
    } else {
      this.log(LogLevel.ERROR, contextOrMessage, messageOrError as string, undefined, metadataOrContext);
    }
  }

  warn(context: LogContext, message: string, metadata?: LogMetadata): void;
  warn(message: string, data?: unknown, context?: LogMetadata): void;
  warn(contextOrMessage: LogContext | string, messageOrData?: string | unknown, metadataOrContext?: LogMetadata): void {
    if (typeof contextOrMessage === 'string') {
      this.log(LogLevel.WARN, LogContext.SYSTEM, contextOrMessage, messageOrData, metadataOrContext);
    } else {
      this.log(LogLevel.WARN, contextOrMessage, messageOrData as string, undefined, metadataOrContext);
    }
  }

  debug(context: LogContext, message: string, metadata?: LogMetadata): void;
  debug(message: string, data?: unknown, context?: LogMetadata): void;
  debug(contextOrMessage: LogContext | string, messageOrData?: string | unknown, metadataOrContext?: LogMetadata): void {
    if (typeof contextOrMessage === 'string') {
      this.log(LogLevel.DEBUG, LogContext.SYSTEM, contextOrMessage, messageOrData, metadataOrContext);
    } else {
      this.log(LogLevel.DEBUG, contextOrMessage, messageOrData as string, undefined, metadataOrContext);
    }
  }

  // Utility methods
  setUserId(userId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userId', userId);
    }
  }

  setSessionId(sessionId: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sessionId', sessionId);
    }
  }

  setComponent(component: string) {
    // This would be used by React components
    (this as { currentComponent?: string }).currentComponent = component;
  }

  setAction(action: string) {
    // This would be used by the calling code
    (this as { currentAction?: string }).currentAction = action;
  }

  // Performance logging
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(LogContext.PERFORMANCE, `Timer: ${label}`, { duration });
    };
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, context?: LogContext, limit?: number): LogEntry[] {
    let logs = this.getLocalStorageLogs();
    
    if (level !== undefined) {
      logs = logs.filter(log => log.level >= level);
    }
    
    if (context !== undefined) {
      logs = logs.filter(log => log.context === context);
    }
    
    if (limit !== undefined) {
      logs = logs.slice(-limit);
    }
    
    return logs;
  }

  // Clear logs
  clearLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rpma_logs');
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
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableLocalStorage: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
});

// Create a factory function for creating logger instances
export const createLogger = (component?: string) => {
  const instance = new Logger();
  if (component) {
    instance.setComponent(component);
  }
  return instance;
};

// Export types and logger
export default logger;