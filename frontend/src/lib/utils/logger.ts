// src/lib/utils/logger.ts
export interface LogMetadata {
  [key: string]: unknown;
}

export enum LogContext {
  SYSTEM = 'SYSTEM',
  AUTH = 'AUTH',
  TASK = 'TASK',
  API = 'API',
}

export interface Logger {
  info(context: LogContext, message: string, metadata?: LogMetadata): void;
  error(context: LogContext, message: string, metadata?: LogMetadata): void;
  warn(context: LogContext, message: string, metadata?: LogMetadata): void;
  debug(context: LogContext, message: string, metadata?: LogMetadata): void;
}

class ConsoleLogger implements Logger {
  info(context: LogContext, message: string, metadata?: LogMetadata): void {
    console.log(`[${context}] ${message}`, metadata);
  }

  error(context: LogContext, message: string, metadata?: LogMetadata): void {
    console.error(`[${context}] ${message}`, metadata);
  }

  warn(context: LogContext, message: string, metadata?: LogMetadata): void {
    console.warn(`[${context}] ${message}`, metadata);
  }

  debug(context: LogContext, message: string, metadata?: LogMetadata): void {
    console.debug(`[${context}] ${message}`, metadata);
  }
}

export const createLogger = (): Logger => new ConsoleLogger();

export const logger = createLogger();