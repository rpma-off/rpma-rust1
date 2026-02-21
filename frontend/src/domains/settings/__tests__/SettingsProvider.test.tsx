import { renderHook } from '@testing-library/react';
import { SettingsProvider, useSettingsContext } from '../api/SettingsProvider';

jest.mock('../api/useSettings', () => ({
  useSettings: () => ({
    settings: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../api/useSettingsActions', () => ({
  useSettingsActions: () => ({
    updateProfile: jest.fn(),
    updatePreferences: jest.fn(),
    saving: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe('SettingsProvider', () => {
  it('throws when useSettingsContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSettingsContext())).toThrow(
      'useSettingsContext must be used within SettingsProvider'
    );
  });

  it('provides settings and actions to consumers', () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });

    expect(result.current.settings).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.settings.loading).toBe(false);
  });
});
