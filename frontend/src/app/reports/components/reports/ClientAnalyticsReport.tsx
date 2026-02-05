'use client';

import React, { useEffect, useState } from 'react';
import { reportsService } from '@/lib/services/entities/reports.service';
import type { DateRange, ReportFilters, ClientAnalyticsReport as ClientReportData } from '@/lib/backend';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ClientAnalyticsReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function ClientAnalyticsReport({ dateRange, filters }: ClientAnalyticsReportProps) {
  const [data, setData] = useState<ClientReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await reportsService.getClientAnalyticsReport(dateRange, filters);
        if (mounted) {
          if (response.success && response.data) {
            setData(response.data);
          } else {
            setError(response.error || 'Failed to fetch client report');
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
          Rapport d&apos;Analyse Clients
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Du {new Date(dateRange.start).toLocaleDateString()} au {new Date(dateRange.end).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Total Clients
          </h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {data.summary.total_clients.toString()}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Clients enregistrés
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Taux de Rétention
          </h3>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {data.summary.retention_rate.toFixed(1)}%
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Taux de rétention client</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Revenus Moyens
          </h3>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {data.summary.average_revenue_per_client.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Revenus moyens par client</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Nouveaux Clients
        </h3>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {data.summary.new_clients_this_period.toString()}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Nouveaux clients ce mois-ci
        </p>
      </div>
    </div>
  );
}

export default ClientAnalyticsReport;
