'use client';

import React from 'react';
import type { DateRange, ReportFilters } from '@/lib/backend';

interface MaterialUsageReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function MaterialUsageReport({ dateRange, filters }: MaterialUsageReportProps) {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Rapport d&apos;Utilisation des Matériaux
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Suivi des coûts et consommation des matériaux
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Coûts Totaux
          </h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">0€</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Coûts totaux des matériaux</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Taux de Gaspillage
          </h3>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">0%</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Pourcentage de gaspillage</p>
        </div>
      </div>
    </div>
  );
}

export default MaterialUsageReport;