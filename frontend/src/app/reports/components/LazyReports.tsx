import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load report components for better performance
const OverviewReport = lazy(() => import('./reports/OverviewReport').catch(() => {
  // Fallback component in case of import error
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport d&apos;aperçu</p>
      </div>
    )
  };
}));

const TaskPerformanceReport = lazy(() => import('./reports/TaskPerformanceReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport de tâches</p>
      </div>
    )
  };
}));

const TechnicianPerformanceReport = lazy(() => import('./reports/TechnicianPerformanceReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport techniciens</p>
      </div>
    )
  };
}));

const ClientAnalyticsReport = lazy(() => import('./reports/ClientAnalyticsReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport clients</p>
      </div>
    )
  };
}));

const QualityComplianceReport = lazy(() => import('./reports/QualityComplianceReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport qualité</p>
      </div>
    )
  };
}));

const MaterialUsageReport = lazy(() => import('./reports/MaterialUsageReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport matériaux</p>
      </div>
    )
  };
}));

const GeographicReport = lazy(() => import('./reports/GeographicReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport géographique</p>
      </div>
    )
  };
}));

const OperationalIntelligenceReport = lazy(() => import('./reports/OperationalIntelligenceReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement du rapport d&apos;intelligence opérationnelle</p>
      </div>
    )
  };
}));

const DataExplorerReport = lazy(() => import('./reports/DataExplorerReport').catch(() => {
  return {
    default: () => (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement de l&apos;explorateur de données</p>
      </div>
    )
  };
}));

// Loading component for lazy-loaded reports
const ReportLoadingFallback = ({ reportName }: { reportName: string }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center max-w-sm">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        Chargement du rapport
      </h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {reportName}
      </p>
    </div>
  </div>
);

// Wrapper component that provides Suspense for lazy-loaded reports
export const LazyReportWrapper = ({
  reportType,
  children
}: {
  reportType: string;
  children: React.ReactNode;
}) => (
  <Suspense fallback={<ReportLoadingFallback reportName={reportType} />}>
    {children}
  </Suspense>
);

export {
  OverviewReport,
  TaskPerformanceReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  QualityComplianceReport,
  MaterialUsageReport,
  GeographicReport,
  OperationalIntelligenceReport,
  DataExplorerReport,
};
