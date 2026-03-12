import { ipcClient as realIpcClient, useIpcClient as realUseIpcClient } from './client';
import { ipcClient as mockIpcClient, useIpcClient as mockUseIpcClient, installMockControls } from './mock/mock-client';
import { tauriAdapter } from './real-adapter';

const useMock =
  process.env.NEXT_PUBLIC_IPC_MOCK === 'true' ||
  process.env.NEXT_PUBLIC_IPC_MOCK === '1' ||
  process.env.NODE_ENV === 'test';

// Initialize mock when window is available (client-side only)
// Use setTimeout to ensure this runs after the module is fully loaded
if (useMock) {
  if (typeof window !== 'undefined') {
    // Window is already available, initialize immediately
    installMockControls();
  } else {
    // Window not available yet, wait for it
    const initWhenReady = () => {
      if (typeof window !== 'undefined') {
        installMockControls();
      }
    };
    
    // Try multiple approaches to ensure initialization
    if (typeof setImmediate !== 'undefined') {
      setImmediate(initWhenReady);
    }
    setTimeout(initWhenReady, 0);
    
    // Also try on next tick
    Promise.resolve().then(initWhenReady);
  }
}

type IpcClient = typeof realIpcClient;

export const ipcClient = (useMock ? mockIpcClient : realIpcClient) as IpcClient;
export const useIpcClient = (useMock ? mockUseIpcClient : realUseIpcClient) as typeof realUseIpcClient;

// Adapter exports
export { tauriAdapter };
export type { IpcAdapter, IpcInvokeOptions, IpcError, createIpcError, isIpcError } from './adapter';

// Existing exports
export { createTestAdapter, TEST_SESSION, TEST_TASK, TEST_TASK_LIST, TEST_TASK_STATISTICS } from './test-adapter';
export { safeInvoke } from './utils';
export { cachedInvoke, getCacheStats, invalidateKey, clearCache, invalidatePattern } from './cache';
export { withRetry } from './retry';
export { recordMetric, getRawMetrics, getMetricsSummary, getCommandMetrics, clearMetrics, logMetrics, setAnalyticsHook } from './metrics';
export { IPC_COMMANDS } from './commands';
export { settingsOperations } from './domains/settings';
