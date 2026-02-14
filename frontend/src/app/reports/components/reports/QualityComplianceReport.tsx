'use client';

import React from 'react';
import type { DateRange, ReportFilters } from '@/lib/backend';

interface QualityComplianceReportProps {
  dateRange: DateRange;
  filters: ReportFilters;
}

function QualityComplianceReport({ dateRange: _dateRange, filters: _filters }: QualityComplianceReportProps) {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Rapport de Conformité Qualité
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Métriques de qualité et conformité des interventions
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Score de Qualité Global
        </h3>
        <div className="text-center">
          <div className="text-6xl font-bold text-green-600 dark:text-green-400 mb-4">0%</div>
          <p className="text-slate-600 dark:text-slate-400">Score de conformité qualité</p>
        </div>
      </div>
    </div>
  );
}

export default QualityComplianceReport;
