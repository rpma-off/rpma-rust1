'use client';

import { FileText, Send, CheckCircle, XCircle, Clock, CheckCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/types/quote.types';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border/40',
  sent: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  converted: 'bg-[hsl(var(--rpma-teal))]/10 text-[hsl(var(--rpma-teal))] border-[hsl(var(--rpma-teal))]/20',
  changes_requested: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

const STATUS_ICONS: Record<QuoteStatus, React.ComponentType<{ className?: string }>> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
  converted: CheckCheck,
  changes_requested: AlertCircle,
};

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
  converted: 'Converti',
  changes_requested: 'Modifications demandées',
};

export interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  showIcon?: boolean;
}

export function QuoteStatusBadge({ status, showIcon = true }: QuoteStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge
      className={cn(
        'gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium normal-case tracking-normal',
        STATUS_COLORS[status]
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
