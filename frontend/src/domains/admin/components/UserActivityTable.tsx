'use client';

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/shared/utils/date-formatters';
import type { UserActivityRecord } from '@/lib/backend';
import { 
  Activity, 
  User, 
  Clock, 
  Shield, 
  Database, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';

const RESULT_COLORS: Record<string, string> = {
  Success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Failure: 'bg-rose-50 text-rose-700 border-rose-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  AuthenticationSuccess: <Shield className="h-3.5 w-3.5 text-emerald-500" />,
  AuthenticationFailure: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
  TaskCreated: <Database className="h-3.5 w-3.5 text-blue-500" />,
  TaskUpdated: <Activity className="h-3.5 w-3.5 text-blue-500" />,
  TaskDeleted: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
  ClientCreated: <User className="h-3.5 w-3.5 text-indigo-500" />,
  InterventionStarted: <Activity className="h-3.5 w-3.5 text-orange-500" />,
  SystemError: <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />,
};

export interface UserActivityTableProps {
  records: UserActivityRecord[];
  loading?: boolean;
}

export function UserActivityTable({ records, loading }: UserActivityTableProps) {
  if (loading && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--rpma-teal))] border-t-transparent" />
        <p className="text-muted-foreground animate-pulse">Chargement de l&apos;activité...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-muted/20 rounded-lg border border-dashed border-[hsl(var(--rpma-border))]">
        <Activity className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">Aucune activité trouvée</p>
        <p className="text-xs text-muted-foreground/60">Essayez d&apos;ajuster vos filtres de recherche.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[hsl(var(--rpma-border))] overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider">Horodatage</TableHead>
            <TableHead className="w-[200px] font-semibold text-xs uppercase tracking-wider">Utilisateur</TableHead>
            <TableHead className="w-[220px] font-semibold text-xs uppercase tracking-wider">Événement & Action</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Description</TableHead>
            <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider">Résultat</TableHead>
            <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wider">Adresse IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} className="hover:bg-muted/30 transition-colors group">
              <TableCell className="py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {formatDateTime(Number(record.timestamp))}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[hsl(var(--rpma-teal))]" />
                    {record.username}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/70 ml-5">{record.user_id}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {EVENT_TYPE_ICONS[record.event_type] || <Info className="h-3.5 w-3.5 text-slate-400" />}
                    <span className="text-xs font-bold text-foreground/90 uppercase tracking-tight">
                      {formatEventType(record.event_type)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground italic ml-5">{record.action}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="space-y-1">
                  <p className="text-sm leading-relaxed text-foreground/80 line-clamp-2" title={record.description}>
                    {record.description}
                  </p>
                  {record.resource_type && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 bg-background font-mono capitalize border-[hsl(var(--rpma-border))]">
                        {record.resource_type}
                      </Badge>
                      {record.resource_id && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]" title={record.resource_id}>
                          #{record.resource_id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <Badge 
                  variant="outline"
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${RESULT_COLORS[record.result] || 'bg-slate-50 text-slate-700 border-slate-200'}`}
                >
                  {record.result === 'Success' && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                  {record.result === 'Failure' && <XCircle className="h-3 w-3 mr-1 inline" />}
                  {record.result}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-xs font-mono text-muted-foreground/80">
                  {record.ip_address || '—'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatEventType(type: string): string {
  return type
    .split(/(?=[A-Z])/)
    .join(' ');
}
