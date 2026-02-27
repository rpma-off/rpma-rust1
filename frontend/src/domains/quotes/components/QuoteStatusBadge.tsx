'use client';

import { FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { QuoteStatus } from '@/types/quote.types';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

const STATUS_ICONS: Record<QuoteStatus, React.ComponentType<{ className?: string }>> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
};

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
};

export interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  showIcon?: boolean;
}

export function QuoteStatusBadge({ status, showIcon = true }: QuoteStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}
