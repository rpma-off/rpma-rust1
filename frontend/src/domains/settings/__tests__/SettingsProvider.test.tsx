import { renderHook } from '@testing-library/react';
import { useSettingsContext } from '../api';

describe('SettingsProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSettingsContext());
    }).toThrow('useSettingsContext must be used within SettingsProvider');
  });
});
