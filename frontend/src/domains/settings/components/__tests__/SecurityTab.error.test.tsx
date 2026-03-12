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

describe('SecurityTab error handling', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error when getActiveSessions fails', async () => {
    mockGetActiveSessions.mockRejectedValue(new Error('IPC failed'));
    mockGetSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 30 });

    render(<SecurityTab user={user} />);

    await waitFor(() => {
      expect(loggerMock.logError).toHaveBeenCalled();
    });
  });
});
