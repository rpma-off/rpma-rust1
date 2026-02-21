import { renderHook } from '@testing-library/react';
import { ClientsProvider, useClientsContext } from '../api/ClientsProvider';

jest.mock('../hooks/useClients', () => ({
  useClients: () => ({
    clients: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../hooks/useClientStats', () => ({
  useClientStats: () => ({
    stats: null,
    loading: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ClientsProvider>{children}</ClientsProvider>;
}

describe('ClientsProvider', () => {
  it('throws when useClientsContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useClientsContext())).toThrow(
      'useClientsContext must be used within ClientsProvider'
    );
  });

  it('provides clients state and stats to consumers', () => {
    const { result } = renderHook(() => useClientsContext(), { wrapper });

    expect(result.current.clientsState).toBeDefined();
    expect(result.current.statsState).toBeDefined();
    expect(result.current.clientsState.loading).toBe(false);
  });
});
