import { computeQuoteStats } from '../utils/quote-stats';
import type { Quote } from '@/shared/types';

describe('computeQuoteStats', () => {
  it('returns correct counts', () => {
    const quotes = [
      { status: 'draft' },
      { status: 'sent' },
      { status: 'sent' },
      { status: 'accepted' },
      { status: 'rejected' },
    ] as Quote[];

    const stats = computeQuoteStats(quotes, 10);
    expect(stats).toEqual({
      total: 10,
      draft: 1,
      sent: 2,
      accepted: 1,
    });
  });

  it('handles empty quotes array', () => {
    const stats = computeQuoteStats([], 0);
    expect(stats).toEqual({
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
    });
  });
});
