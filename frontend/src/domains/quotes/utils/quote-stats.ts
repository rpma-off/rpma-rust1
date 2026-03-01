import type { Quote } from '@/shared/types';

export interface QuotePageStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
}

/**
 * Compute summary stats from an already-loaded quote list.
 */
export function computeQuoteStats(quotes: Quote[], total: number): QuotePageStats {
  return {
    total,
    draft: quotes.filter((q) => q.status === 'draft').length,
    sent: quotes.filter((q) => q.status === 'sent').length,
    accepted: quotes.filter((q) => q.status === 'accepted').length,
  };
}
