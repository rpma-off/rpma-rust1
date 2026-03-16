import type { QuotePageStats, QuoteStatus } from '@/types/quote.types';

/** Minimal shape needed to compute stats — any object with a status field suffices. */
interface QuoteWithStatus {
  status: QuoteStatus;
}

/**
 * Compute summary stats from an already-loaded quote list.
 */
export function computeQuoteStats(quotes: QuoteWithStatus[]): QuotePageStats {
  const stats: QuotePageStats = {
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
    changes_requested: 0,
  };

  for (const q of quotes) {
    stats.total++;
    if (q.status in stats) {
      (stats[q.status as keyof QuotePageStats] as number)++;
    }
  }

  return stats;
}
