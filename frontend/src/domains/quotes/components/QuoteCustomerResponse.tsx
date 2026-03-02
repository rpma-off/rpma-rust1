'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import type { QuoteStatus } from '@/types/quote.types';
import { formatDateTime } from '@/lib/format';

interface QuoteCustomerResponseProps {
  status: QuoteStatus;
  customerMessage: string | null;
  updatedAt: string;
  loading?: boolean;
  onResolve: () => void;
}

export function QuoteCustomerResponse({
  status,
  customerMessage,
  updatedAt,
  loading = false,
  onResolve,
}: QuoteCustomerResponseProps) {
  // Only show if there's a customer message and status is specific types
  if (!customerMessage || !['changes_requested', 'accepted', 'rejected'].includes(status)) {
    return null;
  }

  const isChangesRequested = status === 'changes_requested';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';

  const bgColor = isChangesRequested
    ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
    : isAccepted
    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';

  const textColor = isChangesRequested
    ? 'text-orange-700 dark:text-orange-400'
    : isAccepted
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-red-700 dark:text-red-400';

  const headerText = isChangesRequested
    ? 'Modifications demandées'
    : isAccepted
    ? 'Devis accepté'
    : 'Devis refusé';

  const timestamp = formatDateTime(updatedAt);

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <h3 className={`flex items-center gap-1.5 text-sm font-semibold ${textColor}`}>
          <MessageSquare className="h-3.5 w-3.5" />
          {headerText}
        </h3>
        <span className={`text-[10px] ${textColor}`}>{timestamp}</span>
      </div>

      <p className={`text-sm ${textColor}`}>
        &ldquo;{customerMessage}&rdquo;
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={loading}
        onClick={onResolve}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="mr-1 h-3.5 w-3.5" />
        )}
        Marquer comme résolu
      </Button>
    </div>
  );
}
