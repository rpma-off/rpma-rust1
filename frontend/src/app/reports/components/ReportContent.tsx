import React, { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  LazyReportWrapper,
  OverviewReport,
  TaskPerformanceReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  QualityComplianceReport,
  MaterialUsageReport,
  GeographicReport,
  OperationalIntelligenceReport,
  DataExplorerReport,
} from './LazyReports';
import type {
  DateRange as BackendDateRange,
  ReportFilters as BackendReportFilters,
  ReportType as BackendReportType,
  TaskCompletionReport,
  TechnicianPerformanceReport as BackendTechnicianPerformanceReport,
  ClientAnalyticsReport as BackendClientAnalyticsReport,
  QualityComplianceReport as BackendQualityComplianceReport,
  MaterialUsageReport as BackendMaterialUsageReport,
  GeographicReport as BackendGeographicReport,
  SeasonalReport,
  OperationalIntelligenceReport as BackendOperationalIntelligenceReport,
} from '@/shared/types';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  technicians?: string[];
  clients?: string[];
  statuses?: string[];
  priorities?: string[];
  ppfZones?: string[];
}

// Helper function to convert frontend DateRange to backend DateRange
const toDateRange = (range: DateRange): BackendDateRange => ({
  start: range.start.toISOString(),
  end: range.end.toISOString()
});

// Helper function to convert frontend ReportFilters to backend ReportFilters
const toReportFilters = (filters: ReportFilters): BackendReportFilters => ({
  technician_ids: filters.technicians || null,
  client_ids: filters.clients || null,
  statuses: filters.statuses || null,
  priorities: filters.priorities || null,
  ppf_zones: filters.ppfZones || null,
  vehicle_models: null // Add if needed in frontend
});

interface OverviewData {
  taskCompletion: TaskCompletionReport;
  technicianPerformance: BackendTechnicianPerformanceReport;
  clientAnalytics: BackendClientAnalyticsReport;
  qualityCompliance: BackendQualityComplianceReport;
  materialUsage: BackendMaterialUsageReport;
  geographic: BackendGeographicReport;
  seasonal: SeasonalReport;
  operationalIntelligence: BackendOperationalIntelligenceReport;
}

interface ReportContentProps {
  reportType: BackendReportType;
  dateRange: DateRange;
  filters: ReportFilters;
  overviewData?: OverviewData;
  reportsGenerated?: boolean;
}

function LoadingSpinner({ message = "Chargement du rapport..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20" data-testid="loading-indicator">
      <div className="text-center max-w-sm">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-slate-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Analyse en cours
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{message}</p>
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

export function ReportContent({ reportType, dateRange, filters, overviewData, reportsGenerated = false }: ReportContentProps) {
  // If reports haven't been generated yet, show a message
  if (!reportsGenerated) {
    return (
      <div className="text-center py-20" data-testid="report-content">
        <div className="max-w-lg mx-auto">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-[hsl(var(--rpma-surface))] rounded-2xl border border-[hsl(var(--rpma-border))] flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Rapports non générés
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
            Cliquez sur &quot;Actualiser&quot; dans la barre d&apos;outils pour analyser vos données et générer des rapports détaillés.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              💡 <strong>Conseil :</strong> Les rapports incluront des métriques de performance, des analyses de qualité et des insights opérationnels.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderReportComponent = () => {
    switch (reportType) {
      case 'overview':
        if (!overviewData) {
          return <LoadingSpinner message="Chargement des donnees d''apercu..." />;
        }
        return (
          <LazyReportWrapper reportType="Rapport d&apos;Aperçu">
            <OverviewReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} overviewData={overviewData} />
          </LazyReportWrapper>
        );
      case 'data_explorer':
        return (
          <LazyReportWrapper reportType="Explorateur de Données">
            <DataExplorerReport />
          </LazyReportWrapper>
        );
      case 'tasks':
        return (
          <LazyReportWrapper reportType="Rapport de Performance des Tâches">
            <TaskPerformanceReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'technicians':
        return (
          <LazyReportWrapper reportType="Rapport de Performance des Techniciens">
            <TechnicianPerformanceReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'clients':
        return (
          <LazyReportWrapper reportType="Rapport d&apos;Analyse Clients">
            <ClientAnalyticsReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'quality':
        return (
          <LazyReportWrapper reportType="Rapport de Conformité Qualité">
            <QualityComplianceReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'materials':
        return (
          <LazyReportWrapper reportType="Rapport d&apos;Utilisation des Matériaux">
            <MaterialUsageReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'geographic':
        return (
          <LazyReportWrapper reportType="Rapport Géographique">
            <GeographicReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      case 'operational_intelligence':
        return (
          <LazyReportWrapper reportType="Rapport d&apos;Intelligence Opérationnelle">
            <OperationalIntelligenceReport dateRange={toDateRange(dateRange)} filters={toReportFilters(filters)} />
          </LazyReportWrapper>
        );
      default:
        return <div className="text-center py-12 text-gray-400">Rapport non trouvé</div>;
    }
  };

  return (
    <div data-testid="report-content">
      <Suspense fallback={<LoadingSpinner />}>
        {renderReportComponent()}
      </Suspense>
    </div>
  );
}
