"use client";

import Link from "next/link";
import { Clock, FileText, FileUp } from "lucide-react";
import { formatCents } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/shared/utils/date-formatters";
import type { Quote } from "@/types/quote.types";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QuoteWorkflowPanel } from "./QuoteWorkflowPanel";

interface QuoteDetailsTabProps {
  quote: Quote;
  statusLoading: boolean;
  exportLoading: boolean;
  duplicateLoading: boolean;
  onMarkSent: () => void | Promise<void>;
  onMarkAccepted: () => void | Promise<void>;
  onMarkRejected: () => void | Promise<void>;
  onMarkExpired: () => void | Promise<void>;
  onMarkChangesRequested: () => void | Promise<void>;
  onReopen: () => void | Promise<void>;
  onDuplicate: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onOpenConvertDialog: () => void;
}

export function QuoteDetailsTab({
  quote,
  statusLoading,
  exportLoading,
  duplicateLoading,
  onMarkSent,
  onMarkAccepted,
  onMarkRejected,
  onMarkExpired,
  onMarkChangesRequested,
  onReopen,
  onDuplicate,
  onDelete,
  onExportPdf,
  onOpenConvertDialog,
}: QuoteDetailsTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Client ID</dt>
                <dd className="font-medium">{quote.client_id}</dd>
              </div>
              {quote.task_id && (
                <div>
                  <dt className="text-xs text-muted-foreground">Tâche liée</dt>
                  <dd className="font-medium">
                    <Link
                      href={`/tasks/${quote.task_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {quote.task_id.slice(0, 8)}...
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Statut</dt>
                <dd>
                  <QuoteStatusBadge status={quote.status} showIcon={false} />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Date de création
                </dt>
                <dd className="font-medium">{formatDate(quote.created_at)}</dd>
              </div>
              {quote.valid_until && (
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Valide jusqu&apos;au
                  </dt>
                  <dd className="font-medium">{formatDate(quote.valid_until)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Informations véhicule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {quote.vehicle_plate && (
                <div>
                  <dt className="text-xs text-muted-foreground">Plaque</dt>
                  <dd className="font-medium font-mono">{quote.vehicle_plate}</dd>
                </div>
              )}
              {quote.vehicle_make && (
                <div>
                  <dt className="text-xs text-muted-foreground">Marque</dt>
                  <dd className="font-medium">{quote.vehicle_make}</dd>
                </div>
              )}
              {quote.vehicle_model && (
                <div>
                  <dt className="text-xs text-muted-foreground">Modèle</dt>
                  <dd className="font-medium">{quote.vehicle_model}</dd>
                </div>
              )}
              {quote.vehicle_year && (
                <div>
                  <dt className="text-xs text-muted-foreground">Année</dt>
                  <dd className="font-medium">{quote.vehicle_year}</dd>
                </div>
              )}
              {quote.vehicle_vin && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">VIN</dt>
                  <dd className="font-mono text-xs">{quote.vehicle_vin}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {(quote.notes || quote.terms) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes et conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.notes && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Notes</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {quote.notes}
                  </p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Conditions</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {quote.terms}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Récapitulatif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sous-total HT</span>
              <span className="font-semibold">{formatCents(quote.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TVA</span>
              <span className="font-semibold">{formatCents(quote.tax_total)}</span>
            </div>
            {quote.discount_amount && quote.discount_amount > 0 && (
              <div className="flex items-center justify-between text-green-600">
                <span className="text-sm font-medium">Remise</span>
                <span className="font-semibold">
                  -{formatCents(quote.discount_amount)}
                </span>
              </div>
            )}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total TTC</span>
              <span className="text-2xl font-bold text-primary">
                {formatCents(quote.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        <QuoteWorkflowPanel
          quote={quote}
          statusLoading={statusLoading}
          exportLoading={exportLoading}
          duplicateLoading={duplicateLoading}
          onMarkSent={onMarkSent}
          onMarkAccepted={onMarkAccepted}
          onMarkRejected={onMarkRejected}
          onMarkExpired={onMarkExpired}
          onMarkChangesRequested={onMarkChangesRequested}
          onReopen={onReopen}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onExportPdf={onExportPdf}
          onConvertToTask={onOpenConvertDialog}
        />
      </div>
    </div>
  );
}
