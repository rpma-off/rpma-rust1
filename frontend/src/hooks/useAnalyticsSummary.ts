import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface AnalyticsSummary {
  total_interventions: number;
  completed_today: number;
  active_technicians: number;
  average_completion_time: number;
  client_satisfaction_score: number;
  quality_compliance_rate: number;
  revenue_this_month: number;
  inventory_turnover: number;
  top_performing_technician?: string;
  most_common_issue?: string;
  last_updated: string;
}

export function useAnalyticsSummary() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<AnalyticsSummary>('analytics_get_summary');
      setSummary(result);
    } catch (err) {
      setError(err as string);
      // Provide mock data for development
      setSummary({
        total_interventions: 1247,
        completed_today: 8,
        active_technicians: 12,
        average_completion_time: 3.2,
        client_satisfaction_score: 4.6,
        quality_compliance_rate: 97.8,
        revenue_this_month: 45670.50,
        inventory_turnover: 8.5,
        top_performing_technician: "Jean Dupont",
        most_common_issue: "PPF Installation",
        last_updated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}