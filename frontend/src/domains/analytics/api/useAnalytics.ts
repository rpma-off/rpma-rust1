'use client';

import { useAnalyticsSummary } from '../hooks/useAnalyticsSummary';
import type { UseAnalyticsResult } from './types';

export function useAnalytics(): UseAnalyticsResult {
  const { summary, loading, error, refetch } = useAnalyticsSummary();

  return {
    summary,
    loading,
    error,
    refetch,
  };
}
