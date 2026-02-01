import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logging';
import { LogDomain, CorrelationContext } from '@/lib/logging/types';
import { UnknownRecord } from '@/types/utility.types';

export interface UseLoggerOptions {
  context: LogDomain;
  component?: string;
  enablePerformanceLogging?: boolean;
  logProps?: boolean;
  logState?: boolean;
}

export function useLogger(options: UseLoggerOptions) {
  const { context, component, enablePerformanceLogging = false, logProps = false, logState = false } = options;
  const renderCount = useRef(0);
  const mountTime = useRef<number>();

  // Set component context
  useEffect(() => {
    if (component) {
      CorrelationContext.set({ component });
    }
  }, [component]);

  // Log component mount/unmount
  useEffect(() => {
    mountTime.current = performance.now();
    logger.info(context, `Component mounted: ${component || 'Unknown'}`, {
      component,
      timestamp: new Date().toISOString()
    });

    return () => {
      const duration = mountTime.current ? performance.now() - mountTime.current : 0;
      logger.info(context, `Component unmounted: ${component || 'Unknown'}`, {
        component,
        duration,
        timestamp: new Date().toISOString()
      });
    };
  }, [context, component]);

  // Log renders
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current > 1) {
      logger.debug(context, `Component re-rendered: ${component || 'Unknown'}`, {
        component,
        renderCount: renderCount.current,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Logging methods
  const logDebug = useCallback((message: string, data?: unknown, metadata?: Record<string, unknown>) => {
    logger.debug(context, message, { data, metadata });
  }, [context]);

  const logInfo = useCallback((message: string, data?: unknown, metadata?: Record<string, unknown>) => {
    logger.info(context, message, { data, metadata });
  }, [context]);

  const logWarn = useCallback((message: string, data?: unknown, metadata?: Record<string, unknown>) => {
    logger.warn(context, message, { data, metadata });
  }, [context]);

  const logError = useCallback((message: string, data?: unknown, metadata?: Record<string, unknown>) => {
    logger.error(context, message, { data, metadata });
  }, [context]);

  const logFatal = useCallback((message: string, data?: unknown, metadata?: UnknownRecord) => {
    logger.error(context, message, { data, metadata, level: 'fatal' });
  }, [context]);

  // Performance logging
  const logPerformance = useCallback((label: string) => {
    if (enablePerformanceLogging) {
      return logger.time(`${component || 'Unknown'}: ${label}`);
    }
    return () => {};
  }, [component, enablePerformanceLogging]);

  // User action logging
  const logUserAction = useCallback((action: string, data?: unknown, metadata?: UnknownRecord) => {
    logger.info(context, `User action: ${action}`, {
      action,
      component,
      ...(data && typeof data === 'object' ? data : {}),
      ...metadata
    });
  }, [context, component]);

  // API call logging
  const logApiCall = useCallback((method: string, url: string, data?: unknown, metadata?: UnknownRecord) => {
    logger.info(context, `API call: ${method} ${url}`, {
      method,
      url,
      component,
      ...(data && typeof data === 'object' ? data : {}),
      ...metadata
    });
  }, [context, component]);

  // Error logging with context
  const logErrorWithContext = useCallback((error: Error, context?: string, data?: unknown) => {
    logger.error((context as LogDomain) || LogDomain.SYSTEM, `Error in ${component || 'Unknown'}: ${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      component,
      ...(data && typeof data === 'object' ? data : {})
    });
  }, [component]);

  // State change logging
  const logStateChange = useCallback((stateName: string, oldValue: unknown, newValue: unknown, metadata?: UnknownRecord) => {
    if (logState) {
      logger.debug(context, `State change: ${stateName}`, {
        stateName,
        oldValue,
        newValue,
        component,
        ...metadata
      });
    }
  }, [context, component, logState]);

  // Props change logging
  const logPropsChange = useCallback((propsName: string, oldValue: unknown, newValue: unknown, metadata?: UnknownRecord) => {
    if (logProps) {
      logger.debug(context, `Props change: ${propsName}`, {
        propsName,
        oldValue,
        newValue,
        component,
        ...metadata
      });
    }
  }, [context, component, logProps]);

  return {
    logDebug,
    logInfo,
    logWarn,
    logError,
    logFatal,
    logPerformance,
    logUserAction,
    logApiCall,
    logErrorWithContext,
    logStateChange,
    logPropsChange
  };
}

// Hook for API logging
export function useApiLogger() {
  const logApiRequest = useCallback(async <T>(
    method: string,
    url: string,
    requestData?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    logger.info(LogDomain.API, `API Request: ${method} ${url}`, {
      method,
      url,
      requestId,
      requestData,
      headers: options?.headers
    });

    try {
      const response = await fetch(url, {
        ...options,
        method,
        body: requestData ? JSON.stringify(requestData) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      const duration = performance.now() - startTime;
      const responseData = await response.json();

      if (response.ok) {
        logger.info(LogDomain.API, `API Response: ${method} ${url}`, {
          method,
          url,
          requestId,
          status: response.status,
          duration,
          responseData
        });
      } else {
        logger.error(LogDomain.API, `API Error: ${method} ${url}`, {
          method,
          url,
          requestId,
          status: response.status,
          duration,
          error: responseData
        });
      }

      return responseData;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(LogDomain.API, `API Exception: ${method} ${url}`, {
        method,
        url,
        requestId,
        duration,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }, []);

  return { logApiRequest };
}

// Hook for form logging
export function useFormLogger(formName: string) {
  const logFormEvent = useCallback((event: string, data?: unknown, metadata?: UnknownRecord) => {
    logger.info(LogDomain.UI, `Form event: ${formName} - ${event}`, {
      formName,
      event,
      ...(data && typeof data === 'object' ? data : {}),
      ...metadata
    });
  }, [formName]);

  const logFormValidation = useCallback((field: string, isValid: boolean, error?: string, data?: unknown) => {
    logger.debug(LogDomain.UI, `Form validation: ${formName} - ${field}`, {
      formName,
      field,
      isValid,
      error,
      ...(data && typeof data === 'object' ? data : {})
    });
  }, [formName]);

  const logFormSubmit = useCallback((data: unknown, success: boolean, error?: unknown) => {
    logger.info(LogDomain.UI, `Form submit: ${formName}`, {
      formName,
      success,
      data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
  }, [formName]);

  return {
    logFormEvent,
    logFormValidation,
    logFormSubmit
  };
}
