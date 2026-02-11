import { ipcClient as realIpcClient, useIpcClient as realUseIpcClient } from './client';
import { ipcClient as mockIpcClient, useIpcClient as mockUseIpcClient, initMockIpc } from './mock/mock-client';

const useMock = process.env.NEXT_PUBLIC_IPC_MOCK === 'true' || process.env.NEXT_PUBLIC_IPC_MOCK === '1';

if (useMock && typeof window !== 'undefined') {
  initMockIpc();
}

type IpcClient = typeof realIpcClient;

export const ipcClient = (useMock ? mockIpcClient : realIpcClient) as IpcClient;
export const useIpcClient = (useMock ? mockUseIpcClient : realUseIpcClient) as typeof realUseIpcClient;
export { safeInvoke } from './utils';
export { cachedInvoke, getCacheStats, invalidateKey, clearCache, invalidatePattern } from './cache';
export { withRetry } from './retry';
export { recordMetric, getRawMetrics, getMetricsSummary, getCommandMetrics, clearMetrics, logMetrics, setAnalyticsHook } from './metrics';
