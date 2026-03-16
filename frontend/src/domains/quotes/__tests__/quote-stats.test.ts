import type { Quote } from '@/shared/types';
import { computeQuoteStats } from '../utils/quote-stats';

describe('computeQuoteStats', () => {
  it('returns correct counts', () => {
    const quotes = [
      { status: 'draft' },
      { status: 'sent' },
      { status: 'sent' },
      { status: 'accepted' },
      { status: 'rejected' },
    ] as Quote[];

    const stats = computeQuoteStats(quotes);
    expect(stats).toEqual({
      total: 5,
      draft: 1,
      sent: 2,
      accepted: 1,
      rejected: 1,
      expired: 0,
      converted: 0,
      changes_requested: 0,
    });
  });

  it('handles empty quotes array', () => {
    const stats = computeQuoteStats([]);
    expect(stats).toEqual({
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      converted: 0,
      changes_requested: 0,
    });
  });
});
