'use client';

import React from 'react';
import type { DateRange, ReportFilters } from '@/shared/types';

interface GeographicReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function GeographicReport({ dateRange: _dateRange, filters: _filters }: GeographicReportProps) {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Rapport Géographique
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Analyse géographique et cartes de chaleur
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Carte de Chaleur des Interventions
        </h3>
        <div className="h-96 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <p>Carte interactive des interventions par région</p>
        </div>
      </div>
    </div>
  );
}

export default GeographicReport;
