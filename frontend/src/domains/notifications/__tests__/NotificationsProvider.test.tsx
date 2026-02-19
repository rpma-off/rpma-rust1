import { renderHook } from '@testing-library/react';
import { useNotificationsContext } from '../api';

describe('NotificationsProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useNotificationsContext());
    }).toThrow('useNotificationsContext must be used within NotificationsProvider');
  });
});
