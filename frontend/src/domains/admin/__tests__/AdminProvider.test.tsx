import { renderHook } from '@testing-library/react';
import { AdminProvider, useAdminContext } from '../api/AdminProvider';

jest.mock('../server', () => ({
  configurationService: { getConfiguration: jest.fn() },
}));

jest.mock('../hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({
    systemStatus: 'healthy',
    statusDetails: null,
    loading: false,
    refreshing: false,
    refresh: jest.fn(),
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}

describe('AdminProvider', () => {
  it('throws when useAdminContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAdminContext())).toThrow(
      'useAdminContext must be used within AdminProvider'
    );
  });

  it('provides configurationService and health to consumers', () => {
    const { result } = renderHook(() => useAdminContext(), { wrapper });

    expect(result.current.configurationService).toBeDefined();
    expect(result.current.health).toEqual(
      expect.objectContaining({ systemStatus: 'healthy', loading: false })
    );
  });
});
