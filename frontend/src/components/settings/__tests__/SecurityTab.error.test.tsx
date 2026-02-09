import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityTab } from '../SecurityTab';
import { mockIPC } from '@tauri-apps/api/mocks';

// Mock the IPC calls
const mockGetUserSettings = jest.fn();
const mockUpdateUserSettings = jest.fn();
const mockEnableTwoFactor = jest.fn();
const mockDisableTwoFactor = jest.fn();
const mockRegenerateBackupCodes = jest.fn();

// Setup IPC mocks
beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === 'get_user_settings') {
      return mockGetUserSettings(args);
    }
    if (cmd === 'update_user_settings') {
      return mockUpdateUserSettings(args);
    }
    if (cmd === 'enable_two_factor') {
      return mockEnableTwoFactor(args);
    }
    if (cmd === 'disable_two_factor') {
      return mockDisableTwoFactor(args);
    }
    if (cmd === 'regenerate_backup_codes') {
      return mockRegenerateBackupCodes(args);
    }
  });
});

// Helper to render component with providers
const renderSecurityTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityTab />
    </QueryClientProvider>
  );
};

describe('SecurityTab Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays error when security settings fail to load', async () => {
    // Mock error response
    mockGetUserSettings.mockRejectedValue(new Error('Failed to load security settings'));

    renderSecurityTab();

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load security settings/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid current password when changing password', async () => {
    // Mock initial settings
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: false,
        session_timeout_minutes: 30,
        require_password_change: false,
      },
    });

    // Mock password update failure
    mockUpdateUserSettings.mockResolvedValue({
      success: false,
      error: 'Current password is incorrect',
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByText(/change password/i)).toBeInTheDocument();
    });

    // Fill password form
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123!' } });

    // Submit form
    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  test('shows error when new password does not meet requirements', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: false,
      },
    });

    renderSecurityTab();

    // Try to set weak password
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('handles error when enabling 2FA fails', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: false,
      },
    });

    // Mock 2FA enable failure
    mockEnableTwoFactor.mockResolvedValue({
      success: false,
      error: 'Failed to generate QR code: Please try again',
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    // Try to enable 2FA
    const enable2FAButton = screen.getByRole('button', { name: /enable 2fa/i });
    fireEvent.click(enable2FAButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/failed to generate qr code/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid 2FA verification code', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: false,
      },
    });

    // Mock successful QR code generation but failed verification
    mockEnableTwoFactor.mockResolvedValue({
      success: true,
      data: {
        qr_code: 'data:image/png;base64,mockqrcode',
        backup_codes: ['123456', '789012'],
      },
    });

    // Mock verification failure
    mockUpdateUserSettings.mockResolvedValue({
      success: false,
      error: 'Invalid verification code',
    });

    renderSecurityTab();

    // Enable 2FA
    const enableButton = screen.getByRole('button', { name: /enable 2fa/i });
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
    });

    // Enter invalid verification code
    const codeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: '000000' } });

    const verifyButton = screen.getByRole('button', { name: /verify and enable/i });
    fireEvent.click(verifyButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
  });

  test('handles error when disabling 2FA', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: true,
      },
    });

    // Mock 2FA disable failure
    mockDisableTwoFactor.mockResolvedValue({
      success: false,
      error: 'Must provide valid password to disable 2FA',
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByText(/disable 2fa/i)).toBeInTheDocument();
    });

    // Try to disable 2FA without password
    const disableButton = screen.getByRole('button', { name: /disable 2fa/i });
    fireEvent.click(disableButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/must provide valid password/i)).toBeInTheDocument();
    });
  });

  test('displays error for invalid session timeout value', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        session_timeout_minutes: 30,
      },
    });

    mockUpdateUserSettings.mockResolvedValue({
      success: false,
      error: 'Session timeout must be between 5 and 480 minutes',
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByLabelText(/session timeout/i)).toBeInTheDocument();
    });

    // Try to set invalid timeout
    const timeoutInput = screen.getByLabelText(/session timeout/i);
    fireEvent.change(timeoutInput, { target: { value: '500' } });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/session timeout must be between 5 and 480 minutes/i)).toBeInTheDocument();
    });
  });

  test('handles error when generating backup codes fails', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: true,
      },
    });

    // Mock backup codes generation failure
    mockRegenerateBackupCodes.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded: Please wait before generating new codes',
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate codes/i })).toBeInTheDocument();
    });

    // Try to regenerate codes
    const regenerateButton = screen.getByRole('button', { name: /regenerate codes/i });
    fireEvent.click(regenerateButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  test('shows confirmation dialog for destructive actions', async () => {
    mockGetUserSettings.mockResolvedValue({
      success: true,
      data: {
        two_factor_enabled: true,
        trusted_devices: ['device-1', 'device-2'],
      },
    });

    renderSecurityTab();

    await waitFor(() => {
      expect(screen.getByText(/trusted devices/i)).toBeInTheDocument();
    });

    // Try to remove trusted device
    const removeButton = screen.getByRole('button', { name: /remove device/i });
    fireEvent.click(removeButton);

    // Check for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to remove this device/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm remove/i });
    fireEvent.click(confirmButton);

    // Should show success message if mock returns success
    await waitFor(() => {
      expect(screen.getByText(/device removed successfully/i)).toBeInTheDocument();
    });
  });
});