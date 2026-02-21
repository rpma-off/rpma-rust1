import { renderHook } from '@testing-library/react';
import { AnalyticsProvider, useAnalyticsContext } from '../api/AnalyticsProvider';

jest.mock('../server', () => ({
  analyticsService: { getAnalytics: jest.fn() },
  dashboardApiService: { getDashboard: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

describe('AnalyticsProvider', () => {
  it('throws when useAnalyticsContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAnalyticsContext())).toThrow(
      'useAnalyticsContext must be used within AnalyticsProvider'
    );
  });

  it('provides analytics services to consumers', () => {
    const { result } = renderHook(() => useAnalyticsContext(), { wrapper });

    expect(result.current.analyticsService).toBeDefined();
    expect(result.current.dashboardApiService).toBeDefined();
  });
});
