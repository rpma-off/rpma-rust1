import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SystemSettingsTab } from '../SystemSettingsTab';
import { MonitoringTab } from '../MonitoringTab';
import { BusinessRulesTab } from '../BusinessRulesTab';
import { safeInvoke, settingsOperations } from '@/shared/utils';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ session: { token: 'test-token' } }),
}));

jest.mock('@/shared/utils', () => ({
  settingsOperations: {
    getAppSettings: jest.fn(),
    updateGeneralSettings: jest.fn(),
  },
  safeInvoke: jest.fn(),
}));

jest.mock('@/shared/ui/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        <button type="button" onClick={onConfirm}>
          Confirmer
        </button>
      </div>
    ) : null,
}));

jest.mock('@/shared/hooks/useLogger', () => ({
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
    warning: jest.fn(),
  },
}));

const mockGetAppSettings = settingsOperations.getAppSettings as jest.Mock;
const mockUpdateGeneralSettings = settingsOperations.updateGeneralSettings as jest.Mock;
const mockSafeInvoke = safeInvoke as jest.Mock;

describe('Configuration tabs regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAppSettings.mockResolvedValue({ general: {} });
    mockUpdateGeneralSettings.mockResolvedValue({});
    mockSafeInvoke.mockResolvedValue({
      status: 'healthy',
      components: {
        database: { status: 'healthy', message: 'OK', lastChecked: new Date().toISOString() },
      },
    });
  });

  it('renders business hours schedule entries', async () => {
    render(<SystemSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText(/Paramètres Système/i)).toBeInTheDocument();
    });

    const businessHoursTab = screen.getByRole('tab', { name: /Heures d'ouverture/i });
    const user = userEvent.setup();
    await user.click(businessHoursTab);

    await waitFor(() => {
      expect(screen.getByText('monday')).toBeInTheDocument();
    });
    expect(screen.getAllByText('08:00 - 18:00').length).toBeGreaterThan(0);
  });

  it('does not render removed static monitoring placeholders', async () => {
    render(<MonitoringTab />);

    await waitFor(() => {
      expect(screen.getByText(/État du Système/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Temps de réponse API/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alertes Récentes/i)).not.toBeInTheDocument();
  });

  it('opens confirm dialog before deleting a business rule', async () => {
    mockGetAppSettings.mockResolvedValue({
      business_rules: [
        {
          id: 'rule-1',
          name: 'Règle Test',
          description: 'Description',
          category: 'task_assignment',
          priority: 1,
          is_active: true,
          isActive: true,
          conditions: [{ field: 'status', operator: 'equals', value: 'open' }],
          actions: [{ type: 'send_notification', target: 'manager', value: 'msg' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(<BusinessRulesTab />);

    await waitFor(() => {
      expect(screen.getByText(/Règles Métier/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Supprimer la règle Règle Test/i }));

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog')).toHaveTextContent('Supprimer la règle');

    await user.click(screen.getByRole('button', { name: /Confirmer/i }));

    await waitFor(() => {
      expect(mockUpdateGeneralSettings).toHaveBeenCalled();
    });
  });
});

