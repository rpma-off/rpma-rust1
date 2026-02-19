'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Download, FileText, RefreshCw } from 'lucide-react';
import { useAnalyticsSummary } from '../hooks/useAnalyticsSummary';

type ReportFormat = 'csv' | 'json';

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  format: ReportFormat;
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'ops-monthly',
    title: 'Operational Monthly Report',
    description: 'Intervention throughput, completion quality, and productivity KPIs.',
    cadence: 'monthly',
    format: 'csv',
  },
  {
    id: 'quality-weekly',
    title: 'Quality Weekly Report',
    description: 'Compliance and customer satisfaction trends for recent interventions.',
    cadence: 'weekly',
    format: 'csv',
  },
  {
    id: 'finance-monthly',
    title: 'Finance Snapshot',
    description: 'Revenue, inventory turnover, and completion-efficiency indicators.',
    cadence: 'monthly',
    format: 'json',
  },
];

function cadenceLabel(cadence: ReportDefinition['cadence']): string {
  if (cadence === 'daily') return 'Daily';
  if (cadence === 'weekly') return 'Weekly';
  return 'Monthly';
}

function formatMetricRows(summary: NonNullable<ReturnType<typeof useAnalyticsSummary>['summary']>) {
  return [
    ['total_interventions', summary.total_interventions],
    ['completed_today', summary.completed_today],
    ['active_technicians', summary.active_technicians],
    ['average_completion_time_hours', summary.average_completion_time.toFixed(2)],
    ['client_satisfaction_score', summary.client_satisfaction_score.toFixed(2)],
    ['quality_compliance_rate', summary.quality_compliance_rate.toFixed(2)],
    ['revenue_this_month', summary.revenue_this_month.toFixed(2)],
    ['inventory_turnover', summary.inventory_turnover.toFixed(2)],
    ['top_performing_technician', summary.top_performing_technician || 'N/A'],
    ['most_common_issue', summary.most_common_issue || 'N/A'],
    ['last_updated', summary.last_updated],
  ] as const;
}

function rowsToCsv(rows: ReadonlyArray<readonly [string, string | number]>): string {
  const header = 'metric,value';
  const body = rows.map(([key, value]) => `${key},${value}`).join('\n');
  return `${header}\n${body}\n`;
}

function downloadBlob(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AnalyticsReports() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);

  const baseRows = useMemo(() => {
    if (!summary) return [];
    return formatMetricRows(summary);
  }, [summary]);

  const handleExport = (definition: ReportDefinition) => {
    if (!summary) return;

    const generatedAt = new Date().toISOString();
    const rows = [
      ['report_id', definition.id],
      ['report_title', definition.title],
      ['cadence', definition.cadence],
      ['generated_at', generatedAt],
      ...baseRows,
    ] as const;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (definition.format === 'csv') {
      downloadBlob(rowsToCsv(rows), `${definition.id}-${stamp}.csv`, 'text/csv;charset=utf-8');
    } else {
      const payload = Object.fromEntries(rows);
      downloadBlob(JSON.stringify(payload, null, 2), `${definition.id}-${stamp}.json`, 'application/json');
    }
    setLastExportAt(generatedAt);
  };

  if (loading) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading reports...</CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Analytics Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Unable to load reporting data. {error ? `Details: ${error}` : ''}
          </p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rpma-shell">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Analytics Reports
          </CardTitle>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{REPORT_DEFINITIONS.length} report templates</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Data updated {new Date(summary.last_updated).toLocaleString('fr-FR')}
          </Badge>
          {lastExportAt ? (
            <Badge variant="outline">Last export: {new Date(lastExportAt).toLocaleString('fr-FR')}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {REPORT_DEFINITIONS.map((definition, index) => (
          <div key={definition.id} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{definition.title}</p>
                <p className="text-sm text-muted-foreground">{definition.description}</p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="secondary">{cadenceLabel(definition.cadence)}</Badge>
                  <Badge variant="outline">{definition.format.toUpperCase()}</Badge>
                </div>
              </div>
              <Button onClick={() => handleExport(definition)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
            {index < REPORT_DEFINITIONS.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
