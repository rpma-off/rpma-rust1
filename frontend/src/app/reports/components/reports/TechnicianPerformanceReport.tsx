'use client';

import React from 'react';
import type { DateRange, ReportFilters } from '@/lib/backend';

interface TechnicianPerformanceReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function TechnicianPerformanceReport({ dateRange: _dateRange, filters: _filters }: TechnicianPerformanceReportProps) {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Rapport de Performance des Techniciens
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Analyse des performances individuelles et d&apos;équipe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Scores de Performance
          </h3>
          <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <p>Graphique des scores de performance</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Temps Moyen par Tâche
          </h3>
          <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <p>Graphique du temps moyen par tâche</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TechnicianPerformanceReport;
