import { safeInvoke, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { AnalyticsSummary } from '@/lib/backend';
import type { JsonValue } from '@/types/json';

const ANALYTICS_CACHE_KEY = 'analytics';
const ANALYTICS_CACHE_TTL = 300000; // 5 minutes

export const analyticsIpc = {
  getSummary: async (sessionToken: string): Promise<AnalyticsSummary> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.ANALYTICS_GET_SUMMARY, {
      session_token: sessionToken,
      correlation_id: null,
    });
    return result as unknown as AnalyticsSummary;
  },

  getSummaryCached: async (sessionToken: string): Promise<AnalyticsSummary> => {
    return await cachedInvoke(
      `${ANALYTICS_CACHE_KEY}:summary`,
      IPC_COMMANDS.ANALYTICS_GET_SUMMARY,
      {
        session_token: sessionToken,
        correlation_id: null,
      },
      (data) => data as unknown as AnalyticsSummary,
      ANALYTICS_CACHE_TTL
    );
  },

  invalidateCache: (): void => {
    invalidatePattern(`${ANALYTICS_CACHE_KEY}:`);
  },
};
