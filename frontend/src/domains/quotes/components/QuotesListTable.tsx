'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { MoreVertical } from 'lucide-react';
import { formatCents, formatDateShort } from '@/lib/format';
import type { Quote } from '@/types/quote.types';
import type { Client } from '@/types/client.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteWithClient extends Quote {
  client?: Client;
}

interface QuotesListTableProps {
  quotes: QuoteWithClient[];
  onRowClick?: (quoteId: string) => void;
  onView?: (quoteId: string) => void;
  onEdit?: (quoteId: string) => void;
  onDuplicate?: (quoteId: string) => void;
  onDelete?: (quoteId: string) => void;
  onConvert?: (quoteId: string) => void;
  onExport?: (quoteId: string) => void;
  loading?: boolean;
}

interface QuoteTableRow extends QuoteWithClient {
  clientName: string;
  vehicleSummary: string;
  canConvert: boolean;
}

const VIRTUALIZATION_THRESHOLD = 50;

function renderActions(
  quote: QuoteTableRow,
  handlers: Pick<QuotesListTableProps, 'onView' | 'onEdit' | 'onDuplicate' | 'onDelete' | 'onConvert' | 'onExport'>
) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlers.onView?.(quote.id)}>
          Voir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlers.onEdit?.(quote.id)}>
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlers.onDuplicate?.(quote.id)}>
          Dupliquer
        </DropdownMenuItem>
        {quote.canConvert && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handlers.onConvert?.(quote.id)}
              className="text-purple-600"
            >
              Convertir en tâche
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlers.onExport?.(quote.id)}>
          Exporter PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handlers.onDelete?.(quote.id)}
          className="text-destructive"
        >
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const QuotesListTable = memo(function QuotesListTable({
  quotes,
  onRowClick,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onExport,
  loading = false,
}: QuotesListTableProps) {
  const quoteRows = useMemo<QuoteTableRow[]>(
    () =>
      quotes.map((quote) => ({
        ...quote,
        canConvert: quote.status === 'accepted',
        clientName: quote.client?.name || quote.client_id || '-',
        vehicleSummary:
          [quote.vehicle_make, quote.vehicle_model, quote.vehicle_plate]
            .filter(Boolean)
            .join(' ') || '-',
      })),
    [quotes]
  );

  const actionHandlers = useMemo(
    () => ({ onView, onEdit, onDuplicate, onDelete, onConvert, onExport }),
    [onView, onEdit, onDuplicate, onDelete, onConvert, onExport]
  );

  const handleRowClick = useCallback(
    (quote: QuoteTableRow) => {
      onRowClick?.(quote.id);
    },
    [onRowClick]
  );

  const virtualizedColumns = useMemo(
    () => [
      {
        key: 'quote_number',
        header: 'N° Devis',
        width: 110,
        render: (value: unknown) => (
          <div className="font-mono text-xs text-muted-foreground">
            {String(value || '-')}
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Titre',
        width: 220,
        render: (value: unknown) => (
          <div className="font-medium text-foreground truncate">
            {String(value || '-')}
          </div>
        ),
      },
      {
        key: 'clientName',
        header: 'Client',
        width: 180,
        className: 'hidden md:flex',
        render: (value: unknown) => (
          <div className="text-muted-foreground truncate">
            {String(value || '-')}
          </div>
        ),
      },
      {
        key: 'vehicleSummary',
        header: 'Véhicule',
        width: 220,
        className: 'hidden lg:flex',
        render: (value: unknown) => (
          <div className="text-muted-foreground truncate">
            {String(value || '-')}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        width: 130,
        render: (value: unknown) => (
          <QuoteStatusBadge status={value as Quote['status']} showIcon={false} />
        ),
      },
      {
        key: 'created_at',
        header: 'Date',
        width: 110,
        render: (value: unknown) => (
          <div className="font-mono text-xs text-muted-foreground">
            {formatDateShort(String(value))}
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        width: 110,
        render: (value: unknown) => (
          <div className="w-full text-right font-semibold">
            {formatCents(Number(value || 0))}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: 56,
        render: (_value: unknown, quote: QuoteTableRow) => renderActions(quote, actionHandlers),
      },
    ],
    [actionHandlers]
  );

  if (loading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-25">N° Devis</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden lg:table-cell">Véhicule</TableHead>
              <TableHead className="w-27.5">Statut</TableHead>
              <TableHead className="w-22.5">Date</TableHead>
              <TableHead className="w-22.5 text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (quoteRows.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <VirtualizedTable
        data={quoteRows}
        columns={virtualizedColumns}
        rowHeight={64}
        maxHeight={640}
        onRowClick={onRowClick ? handleRowClick : undefined}
        className="rounded-lg"
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-25">N° Devis</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="hidden md:table-cell">Client</TableHead>
            <TableHead className="hidden lg:table-cell">Véhicule</TableHead>
            <TableHead className="w-27.5">Statut</TableHead>
            <TableHead className="w-22.5">Date</TableHead>
            <TableHead className="w-22.5 text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {quoteRows.map((quote) => (
            <TableRow
              key={quote.id}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onRowClick?.(quote.id)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {quote.quote_number || '-'}
              </TableCell>
              <TableCell className="font-medium">{quote.description || '-'}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {quote.clientName}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {quote.vehicleSummary}
              </TableCell>
              <TableCell>
                <QuoteStatusBadge status={quote.status} showIcon={false} />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatDateShort(quote.created_at)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCents(quote.total)}
              </TableCell>
              <TableCell>
                {renderActions(quote, actionHandlers)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

QuotesListTable.displayName = 'QuotesListTable';
