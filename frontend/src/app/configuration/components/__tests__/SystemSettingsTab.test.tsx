import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SystemSettingsTab } from '../SystemSettingsTab';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'test-token' } }),
}));

jest.mock('@/lib/ipc/domains/settings', () => ({
  settingsOperations: {
    getAppSettings: jest.fn().mockResolvedValue({ general: {} }),
    updateGeneralSettings: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logFatal: jest.fn(),
    logPerformance: () => jest.fn(),
    logUserAction: jest.fn(),
    logApiCall: jest.fn(),
    logErrorWithContext: jest.fn(),
    logStateChange: jest.fn(),
    logPropsChange: jest.fn(),
  }),
  useFormLogger: () => ({
    logFormEvent: jest.fn(),
    logFormValidation: jest.fn(),
    logFormSubmit: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('SystemSettingsTab', () => {
  it('renders business hours schedule entries', async () => {
    render(<SystemSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Paramètres Système')).toBeInTheDocument();
    });

    const businessHoursTab = screen.getByRole('tab', { name: /Heures d'ouverture/i });
    const user = userEvent.setup();
    await user.click(businessHoursTab);

    await waitFor(() => {
      expect(screen.getByText('monday')).toBeInTheDocument();
    });
    expect(screen.getAllByText('08:00 - 18:00').length).toBeGreaterThan(0);
  });
});
