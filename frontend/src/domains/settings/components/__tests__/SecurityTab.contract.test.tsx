import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { UserSession } from '@/lib/backend';
import { SecurityTab } from '../SecurityTab';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

const mockGetActiveSessions = jest.fn();
const mockGetSessionTimeoutConfig = jest.fn();

jest.mock('@/lib/ipc/client', () => ({
  useIpcClient: () => ({
    settings: {
      getActiveSessions: mockGetActiveSessions,
      getSessionTimeoutConfig: mockGetSessionTimeoutConfig,
      getUserSettings: jest.fn().mockResolvedValue({ security: { session_timeout: 30 } }),
    },
  }),
}));

describe('SecurityTab IPC contract', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSessions.mockResolvedValue([]);
    mockGetSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 30 });
  });

  it('calls getActiveSessions and getSessionTimeoutConfig on mount', async () => {
    render(<SecurityTab user={user} />);

    await waitFor(() => {
      expect(mockGetActiveSessions).toHaveBeenCalled();
      expect(mockGetSessionTimeoutConfig).toHaveBeenCalled();
    });
  });
});
