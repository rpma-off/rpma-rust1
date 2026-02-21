import { renderHook } from '@testing-library/react';
import {
  NotificationsProvider,
  useNotificationsContext,
} from '../api/NotificationsProvider';

jest.mock('../server', () => ({
  notificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <NotificationsProvider>{children}</NotificationsProvider>;
}

describe('NotificationsProvider', () => {
  it('throws when useNotificationsContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNotificationsContext())).toThrow(
      'useNotificationsContext must be used within NotificationsProvider'
    );
  });

  it('provides notificationService to consumers', () => {
    const { result } = renderHook(() => useNotificationsContext(), { wrapper });

    expect(result.current.notificationService).toBeDefined();
  });
});
