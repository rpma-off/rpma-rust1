'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { reportsService } from '@/lib/services/entities/reports.service';
import { TaskCompletionChart } from '../charts/TaskCompletionChart';
import type { DateRange, ReportFilters, TaskCompletionReport as TaskReportData } from '@/lib/backend';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TaskPerformanceReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function TaskPerformanceReport({ dateRange, filters }: TaskPerformanceReportProps) {
  const [data, setData] = useState<TaskReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await reportsService.getTaskCompletionReport(dateRange, filters);
        if (mounted) {
          if (response.success && response.data) {
            setData(response.data);
          } else {
            setError(response.error || 'Failed to fetch task report');
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred fetching the report');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [dateRange, filters]);

  // Format data for charts - always call hooks before any conditional returns
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.daily_breakdown.map(day => ({
      date: day.date,
      total: Number(day.total),
      completed: Number(day.completed),
      inProgress: Number(day.in_progress),
      pending: Number(day.pending)
    }));
  }, [data]);

  const statusDistribution = useMemo(() => {
    if (!data) return [];
    const colors: Record<string, string> = {
      completed: '#10b981',
      in_progress: '#f59e0b',
      pending: '#6b7280',
      cancelled: '#ef4444',
      on_hold: '#8b5cf6',
      draft: '#06b6d4',
      scheduled: '#3b82f6',
      overdue: '#db2777',
      failed: '#dc2626',
      assigned: '#8b5cf6',
      paused: '#f97316'
    };

    return data.status_distribution.map(item => ({
      status: item.status,
      count: Number(item.count),
      percentage: item.percentage,
      color: colors[item.status] || '#cbd5e1'
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Rapport de Performance des Tâches
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Du {new Date(dateRange.start).toLocaleDateString()} au {new Date(dateRange.end).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Évolution des Tâches
          </h3>
          <TaskCompletionChart data={chartData} statusDistribution={statusDistribution} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Performances Clés
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tâches</dt>
              <dd className="text-2xl font-bold text-slate-900 dark:text-white">{data.summary.total_tasks}</dd>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Complétées</dt>
              <dd className="text-2xl font-bold text-green-600 dark:text-green-500">{data.summary.completed_tasks}</dd>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Taux de Réussite</dt>
              <dd className="text-2xl font-bold text-blue-600 dark:text-blue-500">{data.summary.completion_rate.toFixed(1)}%</dd>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Délais Respectés</dt>
              <dd className="text-2xl font-bold text-purple-600 dark:text-purple-500">{data.summary.on_time_completion_rate.toFixed(1)}%</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Détails des Tâches par Technicien
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Technicien</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Tâches Complétées</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Temps Moyen (h)</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Score Qualité</th>
              </tr>
            </thead>
            <tbody>
              {data.technician_breakdown.map((tech) => (
                <tr key={tech.technician_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{tech.technician_name}</td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{tech.tasks_completed}</td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {tech.average_time_per_task ? tech.average_time_per_task.toFixed(1) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {tech.quality_score ? tech.quality_score.toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
              {data.technician_breakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">Aucune donnée technicien disponible</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TaskPerformanceReport;
