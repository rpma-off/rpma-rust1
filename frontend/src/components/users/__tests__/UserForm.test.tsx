import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { UserForm } from '../UserForm';
import { UserAccount } from '@/types';

// Mock dependencies
jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    users: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUsersCreate = ipcClient.users.create as jest.MockedFunction<typeof ipcClient.users.create>;
const mockUsersUpdate = ipcClient.users.update as jest.MockedFunction<typeof ipcClient.users.update>;
const mockToast = require('sonner').toast;

// Mock session data
const mockSession = {
  id: 'user-123',
  user_id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin' as const,
  token: 'mock-token',
  refresh_token: null,
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  last_activity: new Date().toISOString(),
  created_at: new Date().toISOString(),
  device_info: null,
  ip_address: null,
  user_agent: null,
  location: null,
  two_factor_verified: false,
  session_timeout_minutes: null,
};

const mockAuthContext = {
  user: mockSession,
  profile: null,
  session: mockSession,
  loading: false,
  isAuthenticating: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

// Mock user data
const mockUser: UserAccount = {
  id: 'user-456',
  email: 'existing@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'technician',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login: null,
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('UserForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersCreate.mockResolvedValue({} as Record<string, unknown>);
    mockUsersUpdate.mockResolvedValue({} as Record<string, unknown>);
  });

  describe('Create User Mode', () => {
    it('renders create user form correctly', () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.queryByLabelText('Active')).not.toBeInTheDocument();
    });

    it('creates new user with valid data', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'newuser@example.com');
      await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
      await userEvent.type(screen.getByLabelText('Last Name'), 'Smith');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      
      // Select role
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'supervisor');

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockUsersCreate).toHaveBeenCalledWith(
          {
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'supervisor',
            password: 'password123',
          },
          'mock-token'
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('User created successfully');
    });

    it('validates required fields for new user', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit form without filling required fields
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
      await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
      await userEvent.type(screen.getByLabelText('Last Name'), 'Smith');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });

      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
      await userEvent.type(screen.getByLabelText('Last Name'), 'Smith');
      await userEvent.type(screen.getByLabelText('Password'), '123');

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });

      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('clears errors when user starts typing', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit empty form to trigger errors
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing in email field
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit User Mode', () => {
    it('renders edit user form correctly', () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('technician')).toBeInTheDocument();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Active')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('updates existing user with valid data', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Update form
      await userEvent.clear(screen.getByLabelText('Email'));
      await userEvent.type(screen.getByLabelText('Email'), 'updated@example.com');
      
      await userEvent.clear(screen.getByLabelText('First Name'));
      await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
      
      // Change role
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'admin');

      // Submit form
      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUsersUpdate).toHaveBeenCalledWith(
          'user-456',
          {
            email: 'updated@example.com',
            first_name: 'Jane',
            last_name: 'Doe', // Unchanged
            role: 'admin',
            is_active: true,
          },
          'mock-token'
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
    });

    it('toggles active status', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Uncheck active
      fireEvent.click(screen.getByLabelText('Active'));

      // Submit form
      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUsersUpdate).toHaveBeenCalledWith(
          'user-456',
          expect.objectContaining({
            is_active: false,
          }),
          'mock-token'
        );
      });
    });

    it('validates required fields for edit mode', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Clear required fields
      await userEvent.clear(screen.getByLabelText('Email'));
      await userEvent.clear(screen.getByLabelText('First Name'));
      await userEvent.clear(screen.getByLabelText('Last Name'));

      // Submit form
      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });

      expect(mockUsersUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Form Behavior', () => {
    it('calls onClose when clicking Cancel', () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      mockUsersCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('First Name'), 'Test');
      await userEvent.type(screen.getByLabelText('Last Name'), 'User');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeDisabled();
    });

    it('disables submit button during loading', async () => {
      mockUsersCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('First Name'), 'Test');
      await userEvent.type(screen.getByLabelText('Last Name'), 'User');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when creation fails', async () => {
      const errorMessage = 'Email already exists';
      mockUsersCreate.mockRejectedValue(new Error(errorMessage));

      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('First Name'), 'Test');
      await userEvent.type(screen.getByLabelText('Last Name'), 'User');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to save user: ' + errorMessage);
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('shows error toast when update fails', async () => {
      const errorMessage = 'User not found';
      mockUsersUpdate.mockRejectedValue(new Error(errorMessage));

      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit form
      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to save user: ' + errorMessage);
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('shows error toast when not authenticated', () => {
      const authContextWithoutToken = {
        ...mockAuthContext,
        user: { ...mockSession, token: null },
        session: { ...mockSession, token: null },
      };

      render(
        <AuthContext.Provider value={authContextWithoutToken}>
          <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
        </AuthContext.Provider>
      );

      // Fill form
      userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      userEvent.type(screen.getByLabelText('First Name'), 'Test');
      userEvent.type(screen.getByLabelText('Last Name'), 'User');
      userEvent.type(screen.getByLabelText('Password'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      expect(mockToast.error).toHaveBeenCalledWith('Not authenticated');
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Form Initialization', () => {
    it('populates form with user data when editing', () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('technician')).toBeInTheDocument();
      expect(screen.getByLabelText('Active')).toBeChecked();
    });

    it('resets password field when switching users', async () => {
      const { rerender } = renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Switch to create mode
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
        </AuthContext.Provider>
      );

      // Form should be empty except for default role
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Email
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // First name
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Last name
      expect(screen.getByDisplayValue('technician')).toBeInTheDocument(); // Default role
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('handles text input changes correctly', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const emailInput = screen.getByLabelText('Email');
      await userEvent.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles select input changes correctly', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const roleSelect = screen.getByLabelText('Role');
      await userEvent.selectOptions(roleSelect, 'admin');

      expect(roleSelect).toHaveValue('admin');
    });

    it('handles checkbox input changes correctly', () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const activeCheckbox = screen.getByLabelText('Active');
      fireEvent.click(activeCheckbox);

      expect(activeCheckbox).not.toBeChecked();
    });
  });
});