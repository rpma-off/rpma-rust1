import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '../components/NotificationBell';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '@/lib/backend/notifications';

jest.mock('@/lib/ipc/notification', () => ({
  notificationApi: {
    get: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      isPanelOpen: false,
    });
  });

  it('should render bell icon', () => {
    render(<NotificationBell />);
    
    const bell = screen.getByRole('button');
    expect(bell).toBeInTheDocument();
  });

  it('should not show badge when no unread notifications', () => {
    render(<NotificationBell />);
    
    const badge = screen.queryByText('0');
    expect(badge).not.toBeInTheDocument();
  });

  it('should show badge with unread count', () => {
    useNotificationStore.getState().setNotifications([], 5);

    render(<NotificationBell />);
    
    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
  });

  it('should show badge with 99+ for high counts', () => {
    useNotificationStore.getState().setNotifications([], 100);

    render(<NotificationBell />);
    
    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });

  it('should open panel on click', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    
    const bell = screen.getByRole('button');
    await user.click(bell);

    const state = useNotificationStore.getState();
    expect(state.isPanelOpen).toBe(true);
  });
});
