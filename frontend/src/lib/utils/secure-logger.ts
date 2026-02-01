// Secure logger utility

// Simple logger implementation to avoid import issues
const logger = {
  info: (message: string, data?: unknown) => {
    console.info(`[INFO] ${message}`, data);
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data);
  },
  debug: (message: string, data?: unknown) => {
    console.debug(`[DEBUG] ${message}`, data);
  },
};

export const secureLogger = {
  info: (message: string, data?: unknown) => {
    // Sanitize sensitive data
    const sanitized = data ? JSON.parse(JSON.stringify(data, (key, value) => {
      if (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')) {
        return '[REDACTED]';
      }
      return value;
    })) : undefined;

    logger.info(message, sanitized);
  },

  error: (message: string, error?: unknown) => {
    logger.error(message, error);
  },

  warn: (message: string, data?: unknown) => {
    logger.warn(message, data);
  },

  debug: (message: string, data?: unknown) => {
    logger.debug(message, data);
  },
};

// Re-export logger for compatibility
export { logger };