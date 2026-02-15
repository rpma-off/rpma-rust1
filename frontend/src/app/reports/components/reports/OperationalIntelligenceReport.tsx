'use client';

import React from 'react';
import type { DateRange, ReportFilters } from '@/lib/backend';

interface OperationalIntelligenceReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function OperationalIntelligenceReport({ dateRange: _dateRange, filters: _filters }: OperationalIntelligenceReportProps) {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Rapport d&apos;Intelligence Opérationnelle
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Goulots d&apos;étranglement et optimisation des processus
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Score d&apos;Efficacité
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">0%</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Efficacité opérationnelle globale</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Goulots d&apos;Étranglement
          </h3>
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">Aucun goulot d&apos;étranglement détecté</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperationalIntelligenceReport;
