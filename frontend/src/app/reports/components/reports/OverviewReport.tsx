'use client';

import React from 'react';
import { TaskCompletionChart } from '../charts/TaskCompletionChart';
import { DashboardOverviewChart } from '../charts/DashboardOverviewChart';
import type {
  DateRange,
  ReportFilters,
  TaskCompletionReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  QualityComplianceReport,
  MaterialUsageReport,
  GeographicReport,
  SeasonalReport,
  OperationalIntelligenceReport
} from '@/lib/backend';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#10B981'; // green
    case 'in_progress':
      return '#F59E0B'; // amber
    case 'pending':
      return '#3B82F6'; // blue
    default:
      return '#6B7280'; // gray
  }
};

interface OverviewReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
  overviewData: {
    taskCompletion: TaskCompletionReport;
    technicianPerformance: TechnicianPerformanceReport;
    clientAnalytics: ClientAnalyticsReport;
    qualityCompliance: QualityComplianceReport;
    materialUsage: MaterialUsageReport;
    geographic: GeographicReport;
    seasonal: SeasonalReport;
    operationalIntelligence: OperationalIntelligenceReport;
  };
}

function OverviewReport({ dateRange, filters, overviewData }: OverviewReportProps) {
  const { taskCompletion, technicianPerformance, clientAnalytics, qualityCompliance, materialUsage, geographic, operationalIntelligence } = overviewData;

  return (
    <div className="space-y-8">
      {/* KPI Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-muted/50 rounded-xl p-6 border border-border/20 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-border-light">Tâches Terminées</p>
              <p className="text-2xl font-bold text-foreground">
                {taskCompletion.summary.completed_tasks}
              </p>
              <p className="text-xs text-border">
                {taskCompletion.summary.completion_rate.toFixed(1)}% de taux de réussite
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Techniciens Actifs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {technicianPerformance.technicians.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Score moyen: {technicianPerformance.benchmarks.team_average.toFixed(1)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Clients Actifs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {clientAnalytics.summary.total_clients}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {clientAnalytics.summary.retention_rate.toFixed(1)}% de rétention
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Qualité Moyenne</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {qualityCompliance.summary.overall_quality_score.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conformité qualité
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Évolution des Tâches
          </h3>
          <TaskCompletionChart
            data={taskCompletion.daily_breakdown.map(item => ({
              date: item.date,
              completed: Number(item.completed),
              inProgress: Number(item.in_progress),
              pending: Number(item.pending),
              total: Number(item.total)
            }))}
            statusDistribution={taskCompletion.status_distribution.map(item => ({
              status: item.status,
              count: Number(item.count),
              percentage: item.percentage,
              color: getStatusColor(item.status)
            }))}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Performance Globale
          </h3>
          <DashboardOverviewChart data={overviewData} />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Matériel Utilisé</h4>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {materialUsage.summary.total_material_cost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coût total des matériaux
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Zones Géographiques</h4>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {geographic.geographic_stats.unique_locations}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Emplacements couverts
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Intelligence Opérationnelle</h4>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {operationalIntelligence.process_efficiency.overall_efficiency_score.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Score d&apos;efficacité globale
          </p>
        </div>
      </div>
    </div>
  );
}

export default OverviewReport;