'use client';

import { MoreVertical } from 'lucide-react';
import { formatCents, formatDateShort } from '@/lib/format';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import type { Quote } from '@/types/quote.types';
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

interface QuotesListTableProps {
  quotes: Quote[];
  onRowClick?: (quoteId: string) => void;
  onView?: (quoteId: string) => void;
  onEdit?: (quoteId: string) => void;
  onDuplicate?: (quoteId: string) => void;
  onDelete?: (quoteId: string) => void;
  onConvert?: (quoteId: string) => void;
  onExport?: (quoteId: string) => void;
  loading?: boolean;
}

export function QuotesListTable({
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
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Aucun devis</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
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
          {quotes.map((quote) => {
            const isAccepted = quote.status === 'accepted';
            const canConvert = isAccepted;

            return (
              <TableRow
                key={quote.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(quote.id)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {quote.quote_number || '-'}
                </TableCell>
                <TableCell className="font-medium">{quote.title || '-'}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {quote.client_id || '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {[
                    quote.vehicle_make,
                    quote.vehicle_model,
                    quote.vehicle_plate,
                  ]
                    .filter(Boolean)
                    .join(' ') || '-'}
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
                      <DropdownMenuItem onClick={() => onView?.(quote.id)}>
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(quote.id)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate?.(quote.id)}>
                        Dupliquer
                      </DropdownMenuItem>
                      {canConvert && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onConvert?.(quote.id)}
                            className="text-purple-600"
                          >
                            Convertir en tâche
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onExport?.(quote.id)}>
                        Exporter PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(quote.id)}
                        className="text-destructive"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
