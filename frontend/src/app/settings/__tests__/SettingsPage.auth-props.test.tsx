import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../page';

const mockUser = {
  token: 'token-123',
  user_id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  role: 'technician',
};

const mockProfile = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  email: 'tester@example.com',
  role: 'technician',
};

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  }),
}));

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
    logUserAction: jest.fn(),
    logPerformance: () => () => undefined,
  }),
}));

jest.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('next/dynamic', () => {
  const ReactModule = require('react');
  return (loader: () => Promise<{ default: React.ComponentType<any> }>) => {
    const DynamicComponent = (props: Record<string, unknown>) => {
      const [Loaded, setLoaded] = ReactModule.useState<React.ComponentType<any> | null>(null);
      ReactModule.useEffect(() => {
        let mounted = true;
        Promise.resolve(loader()).then((mod) => {
          const Resolved = mod.default || (mod as unknown as React.ComponentType<any>);
          if (mounted) {
            setLoaded(() => Resolved);
          }
        });
        return () => {
          mounted = false;
        };
      }, []);
      if (!Loaded) return null;
      return ReactModule.createElement(Loaded, props);
    };
    return DynamicComponent;
  };
});

jest.mock('@/domains/settings', () => ({
  ProfileSettingsTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="profile-tab" data-token={user?.token || ''} />
  ),
  PreferencesTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="preferences-tab" data-token={user?.token || ''} />
  ),
  SecurityTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="security-tab" data-token={user?.token || ''} />
  ),
  PerformanceTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="performance-tab" data-token={user?.token || ''} />
  ),
  AccessibilityTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="accessibility-tab" data-token={user?.token || ''} />
  ),
  NotificationsTab: ({ user }: { user?: { token?: string } }) => (
    <div data-testid="notifications-tab" data-token={user?.token || ''} />
  ),
}));

describe('SettingsPage auth props', () => {
  it('passes user token to all settings tabs', async () => {
    render(<SettingsPage />);

    const profileTab = await screen.findByTestId('profile-tab');
    const preferencesTab = await screen.findByTestId('preferences-tab');
    const securityTab = await screen.findByTestId('security-tab');
    const performanceTab = await screen.findByTestId('performance-tab');
    const accessibilityTab = await screen.findByTestId('accessibility-tab');
    const notificationsTab = await screen.findByTestId('notifications-tab');

    expect(profileTab).toHaveAttribute('data-token', 'token-123');
    expect(preferencesTab).toHaveAttribute('data-token', 'token-123');
    expect(securityTab).toHaveAttribute('data-token', 'token-123');
    expect(performanceTab).toHaveAttribute('data-token', 'token-123');
    expect(accessibilityTab).toHaveAttribute('data-token', 'token-123');
    expect(notificationsTab).toHaveAttribute('data-token', 'token-123');
  });
});
