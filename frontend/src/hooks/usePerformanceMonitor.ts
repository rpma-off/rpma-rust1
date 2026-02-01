import { useEffect, useRef, useCallback } from 'react';

// Global type declarations
declare global {
  interface Window {
    [key: `${string}PerformanceMonitor`]: {
      reset: () => void;
      getMetrics: () => PerformanceMetrics;
      metrics: PerformanceMetrics;
    };
  }
}

interface PerformanceMetrics {
  renderCount: number;
  renderTime: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

interface PerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Warning threshold in milliseconds
}

export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
): PerformanceMetrics => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = false,
    threshold = 16 // 16ms = 60fps
  } = options;

  const renderCount = useRef(0);
  const renderStartTime = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);
  const averageRenderTime = useRef<number>(0);

  // Measure render start time
  useEffect(() => {
    if (!enabled) return;
    
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  // Measure render end time and calculate metrics
  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const currentRenderTime = renderEndTime - renderStartTime.current;
    
    lastRenderTime.current = currentRenderTime;
    totalRenderTime.current += currentRenderTime;
    averageRenderTime.current = totalRenderTime.current / renderCount.current;

    // Log performance warnings
    if (logToConsole && currentRenderTime > threshold) {
      console.warn(
        `🚨 Performance Warning: ${componentName} took ${currentRenderTime.toFixed(2)}ms to render ` +
        `(threshold: ${threshold}ms). Consider optimizing this component.`
      );
    }

    // Log detailed metrics in development
    if (logToConsole && process.env.NODE_ENV === 'development') {
      console.log(`📊 ${componentName} Performance:`, {
        renderCount: renderCount.current,
        currentRenderTime: `${currentRenderTime.toFixed(2)}ms`,
        averageRenderTime: `${averageRenderTime.current.toFixed(2)}ms`,
        totalRenderTime: `${totalRenderTime.current.toFixed(2)}ms`
      });
    }
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCount.current = 0;
    lastRenderTime.current = 0;
    totalRenderTime.current = 0;
    averageRenderTime.current = 0;
  }, []);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => ({
    renderCount: renderCount.current,
    renderTime: lastRenderTime.current,
    lastRenderTime: lastRenderTime.current,
    averageRenderTime: averageRenderTime.current,
    totalRenderTime: totalRenderTime.current
  }), []);

  // Expose reset and get methods
  useEffect(() => {
    if (enabled && typeof window !== 'undefined') {
      window[`${componentName}PerformanceMonitor`] = {
        reset: resetMetrics,
        getMetrics,
        metrics: getMetrics()
      };
    }
  }, [enabled, componentName, resetMetrics, getMetrics]);

  return {
    renderCount: renderCount.current,
    renderTime: lastRenderTime.current,
    lastRenderTime: lastRenderTime.current,
    averageRenderTime: averageRenderTime.current,
    totalRenderTime: totalRenderTime.current
  };
};

// Specialized hook for dashboard components
export const useDashboardPerformanceMonitor = (componentName: string) => {
  return usePerformanceMonitor(componentName, {
    enabled: true,
    logToConsole: process.env.NODE_ENV === 'development',
    threshold: 16
  });
};

// Hook for measuring specific operations
export const useOperationTimer = (operationName: string) => {
  const startTime = useRef<number>(0);
  const endTime = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTimer = useCallback(() => {
    endTime.current = performance.now();
    const duration = endTime.current - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }, [operationName]);

  const getDuration = useCallback(() => {
    if (startTime.current && endTime.current) {
      return endTime.current - startTime.current;
    }
    return 0;
  }, []);

  return {
    startTimer,
    endTimer,
    getDuration
  };
};

// Hook for measuring API call performance
export const useAPIPerformanceMonitor = (endpoint: string) => {
  const { startTimer, endTimer, getDuration } = useOperationTimer(`API Call: ${endpoint}`);
  
  const measureAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T> => {
    startTimer();
    try {
      const result = await apiCall();
      return result;
    } finally {
      endTimer();
    }
  }, [startTimer, endTimer]);

  return {
    measureAPICall,
    getDuration
  };
};
