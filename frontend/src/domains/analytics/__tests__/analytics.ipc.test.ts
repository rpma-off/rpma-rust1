import { analyticsIpc } from '../ipc/analytics.ipc';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
}));

const { safeInvoke, cachedInvoke, invalidatePattern } = jest.requireMock('@/lib/ipc/core') as {
  safeInvoke: jest.Mock;
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('analyticsIpc', () => {
  const mockSessionToken = 'test-session-token';
  const mockAnalyticsSummary = {
    total_interventions: 100n,
    completed_today: 10n,
    active_technicians: 5n,
    average_completion_time: 2.5,
    client_satisfaction_score: 4.8,
    quality_compliance_rate: 95.5,
    revenue_this_month: 15000.0,
    inventory_turnover: 3.2,
    top_performing_technician: 'John Doe',
    most_common_issue: 'Scratches',
    last_updated: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should call safeInvoke with correct parameters', async () => {
      safeInvoke.mockResolvedValue(mockAnalyticsSummary);

      const result = await analyticsIpc.getSummary(mockSessionToken);

      expect(safeInvoke).toHaveBeenCalledWith(
        IPC_COMMANDS.ANALYTICS_GET_SUMMARY,
        {
          session_token: mockSessionToken,
          correlation_id: null,
        }
      );
      expect(result).toEqual(mockAnalyticsSummary);
    });

    it('should handle error response', async () => {
      const mockError = new Error('Failed to fetch analytics');
      safeInvoke.mockRejectedValue(mockError);

      await expect(analyticsIpc.getSummary(mockSessionToken)).rejects.toThrow('Failed to fetch analytics');
    });
  });

  describe('getSummaryCached', () => {
    it('should call cachedInvoke with cache key', async () => {
      cachedInvoke.mockResolvedValue(mockAnalyticsSummary);

      const result = await analyticsIpc.getSummaryCached(mockSessionToken);

      expect(cachedInvoke).toHaveBeenCalledWith(
        'analytics:summary',
        IPC_COMMANDS.ANALYTICS_GET_SUMMARY,
        {
          session_token: mockSessionToken,
          correlation_id: null,
        },
        expect.any(Function),
        300000
      );
      expect(result).toEqual(mockAnalyticsSummary);
    });

    it('should handle cached data retrieval', async () => {
      cachedInvoke.mockImplementation((_key, _command, request, validator) => {
        validator(mockAnalyticsSummary);
        return Promise.resolve(mockAnalyticsSummary);
      });

      const result = await analyticsIpc.getSummaryCached(mockSessionToken);

      expect(result).toEqual(mockAnalyticsSummary);
    });

    it('should handle error response', async () => {
      const mockError = new Error('Failed to fetch cached analytics');
      cachedInvoke.mockRejectedValue(mockError);

      await expect(analyticsIpc.getSummaryCached(mockSessionToken)).rejects.toThrow('Failed to fetch cached analytics');
    });
  });

  describe('invalidateCache', () => {
    it('should call invalidatePattern with correct pattern', () => {
      analyticsIpc.invalidateCache();

      expect(invalidatePattern).toHaveBeenCalledWith('analytics:');
    });

    it('should not throw when invalidating cache', () => {
      expect(() => analyticsIpc.invalidateCache()).not.toThrow();
    });
  });

  describe('cache invalidation integration', () => {
    it('should invalidate cache after data mutation', async () => {
      safeInvoke.mockResolvedValue(mockAnalyticsSummary);
      invalidatePattern.mockImplementation(() => {});

      await analyticsIpc.getSummary(mockSessionToken);
      analyticsIpc.invalidateCache();

      expect(invalidatePattern).toHaveBeenCalledWith('analytics:');
    });
  });
});
