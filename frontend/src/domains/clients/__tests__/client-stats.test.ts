import { computeClientStats } from '../utils/client-stats';
import type { ClientWithTasks } from '@/shared/types';

describe('computeClientStats', () => {
  it('returns zeros for empty array', () => {
    expect(computeClientStats([])).toEqual({
      total: 0,
      withTasks: 0,
      individual: 0,
      business: 0,
    });
  });

  it('counts totals correctly', () => {
    const clients = [
      { customer_type: 'individual', tasks: [{ id: '1' }] },
      { customer_type: 'business', tasks: [] },
      { customer_type: 'individual', tasks: [] },
      { customer_type: 'business', tasks: [{ id: '2' }, { id: '3' }] },
    ] as unknown as ClientWithTasks[];

    const stats = computeClientStats(clients);
    expect(stats.total).toBe(4);
    expect(stats.individual).toBe(2);
    expect(stats.business).toBe(2);
    expect(stats.withTasks).toBe(2);
  });

  it('handles clients with missing tasks array', () => {
    const clients = [
      { customer_type: 'individual', tasks: undefined },
    ] as unknown as ClientWithTasks[];

    const stats = computeClientStats(clients);
    expect(stats.total).toBe(1);
    expect(stats.withTasks).toBe(0);
  });
});
