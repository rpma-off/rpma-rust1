// frontend/src/lib/logging/types.ts
// Comprehensive logging types for RPMA v2

export enum LogLayer {
  FRONTEND = 'FRONTEND',
  IPC = 'IPC',
  BACKEND = 'BACKEND',
  DATABASE = 'DATABASE'
}

export enum LogDomain {
  AUTH = 'AUTH',
  TASK = 'TASK',
  CLIENT = 'CLIENT',
  PHOTO = 'PHOTO',
  SYNC = 'SYNC',
  UI = 'UI',
  API = 'API',
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY'
}

export enum LogSeverity {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  correlation_id: string;
  layer: LogLayer;
  domain: LogDomain;
  severity: LogSeverity;
  operation: string;
  user_id?: string;
  context_data?: Record<string, unknown>;
  duration_ms?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface LogContext {
  correlation_id?: string;
  user_id?: string;
  component?: string;
  operation?: string;
  domain?: LogDomain;
}

export interface LoggerConfig {
  level: LogSeverity;
  enable_console: boolean;
  enable_remote: boolean;
  enable_local_storage: boolean;
  max_local_storage_entries: number;
  remote_endpoint?: string;
  batch_size: number;
  flush_interval_ms: number;
  environment: 'development' | 'production';
}

// Correlation ID utilities
export class CorrelationIdGenerator {
  private static instance: CorrelationIdGenerator;
  private counter = 0;

  private constructor() {}

  static getInstance(): CorrelationIdGenerator {
    if (!CorrelationIdGenerator.instance) {
      CorrelationIdGenerator.instance = new CorrelationIdGenerator();
    }
    return CorrelationIdGenerator.instance;
  }

  generate(): string {
    const timestamp = Date.now().toString(36);
    const counter = (this.counter++).toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 8);
    return `req-${timestamp}-${counter}-${random}`;
  }

  isValid(id: string): boolean {
    return /^req-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(id);
  }
}

// Global correlation ID context
export class CorrelationContext {
  private static current: LogContext = {};

  static set(context: Partial<LogContext>): void {
    CorrelationContext.current = { ...CorrelationContext.current, ...context };
  }

  static get(): LogContext {
    return { ...CorrelationContext.current };
  }

  static clear(): void {
    CorrelationContext.current = {};
  }

  static generateNew(): string {
    const id = CorrelationIdGenerator.getInstance().generate();
    CorrelationContext.set({ correlation_id: id });
    return id;
  }

  static getCurrentId(): string | undefined {
    return CorrelationContext.current.correlation_id;
  }
}