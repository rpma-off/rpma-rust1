import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { userIpc } from '@/domains/users/ipc/users.ipc';
import { UserAccount } from '@/types';
import { UserForm } from '../UserForm';

// Mock dependencies
jest.mock('@/domains/users/ipc/users.ipc', () => ({
  userIpc: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseAuth = jest.fn(() => ({
  user: { token: 'mock-token' },
}));

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsersCreate = userIpc.create as jest.MockedFunction<typeof userIpc.create>;
const mockUsersUpdate = userIpc.update as jest.MockedFunction<typeof userIpc.update>;
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
  return render(component);
};

describe('UserForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { token: 'mock-token' } });
    mockUsersCreate.mockResolvedValue({} as Record<string, unknown>);
    mockUsersUpdate.mockResolvedValue({} as Record<string, unknown>);
  });

  describe('Create User Mode', () => {
    it('renders create user form correctly', () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Créer un nouvel utilisateur')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
      expect(screen.getByLabelText('Nom')).toBeInTheDocument();
      expect(screen.getByLabelText('Rôle')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
      expect(screen.getByText('Créer')).toBeInTheDocument();
      expect(screen.queryByLabelText('Actif')).not.toBeInTheDocument();
    });

    it('creates new user with valid data', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'newuser@example.com');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Jane');
      await userEvent.type(screen.getByLabelText('Nom'), 'Smith');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
      
      // Select role
      await userEvent.selectOptions(screen.getByLabelText('Rôle'), 'supervisor');

      // Submit form
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(mockUsersCreate).toHaveBeenCalledWith(
          {
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'supervisor',
            password: 'password123',
          }
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Utilisateur créé avec succès');
    });

    it('validates required fields for new user', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit form without filling required fields
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
        expect(screen.getByText('Le prénom est requis')).toBeInTheDocument();
        expect(screen.getByText('Le nom est requis')).toBeInTheDocument();
        expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
      });

      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Jane');
      await userEvent.type(screen.getByLabelText('Nom'), 'Smith');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');

      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(mockUsersCreate).not.toHaveBeenCalled();
      });
      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Jane');
      await userEvent.type(screen.getByLabelText('Nom'), 'Smith');
      await userEvent.type(screen.getByLabelText('Mot de passe'), '123');

      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe doit faire au moins 6 caractères')).toBeInTheDocument();
      });

      expect(mockUsersCreate).not.toHaveBeenCalled();
    });

    it('clears errors when user starts typing', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit empty form to trigger errors
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
      });

      // Start typing in email field
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText('L\'email est requis')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit User Mode', () => {
    it('renders edit user form correctly', () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Modifier l\'utilisateur')).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Rôle')).toHaveValue('technician');
      expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Actif')).toBeInTheDocument();
      expect(screen.getByText('Mettre à jour')).toBeInTheDocument();
    });

    it('updates existing user with valid data', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Update form
      await userEvent.clear(screen.getByLabelText('Email'));
      await userEvent.type(screen.getByLabelText('Email'), 'updated@example.com');
      
      await userEvent.clear(screen.getByLabelText('Prénom'));
      await userEvent.type(screen.getByLabelText('Prénom'), 'Jane');
      
      // Change role
      await userEvent.selectOptions(screen.getByLabelText('Rôle'), 'admin');

      // Submit form
      fireEvent.click(screen.getByText('Mettre à jour'));

      await waitFor(() => {
        expect(mockUsersUpdate).toHaveBeenCalledWith(
          'user-456',
          {
            email: 'updated@example.com',
            first_name: 'Jane',
            last_name: 'Doe', // Unchanged
            role: 'admin',
            is_active: true,
          }
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Utilisateur mis à jour avec succès');
    });

    it('toggles active status', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Uncheck active
      fireEvent.click(screen.getByLabelText('Actif'));

      // Submit form
      fireEvent.click(screen.getByText('Mettre à jour'));

      await waitFor(() => {
        expect(mockUsersUpdate).toHaveBeenCalledWith(
          'user-456',
          expect.objectContaining({
            is_active: false,
          })
        );
      });
    });

    it('validates required fields for edit mode', async () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Clear required fields
      await userEvent.clear(screen.getByLabelText('Email'));
      await userEvent.clear(screen.getByLabelText('Prénom'));
      await userEvent.clear(screen.getByLabelText('Nom'));

      // Submit form
      fireEvent.click(screen.getByText('Mettre à jour'));

      await waitFor(() => {
        expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
        expect(screen.getByText('Le prénom est requis')).toBeInTheDocument();
        expect(screen.getByText('Le nom est requis')).toBeInTheDocument();
      });

      expect(mockUsersUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Form Behavior', () => {
    it('calls onClose when clicking Annuler', () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      fireEvent.click(screen.getByText('Annuler'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      mockUsersCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Test');
      await userEvent.type(screen.getByLabelText('Nom'), 'User');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Créer'));

      expect(screen.getByRole('button', { name: /Enregistrement.../ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enregistrement.../ })).toBeDisabled();
    });

    it('disables submit button during loading', async () => {
      mockUsersCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Test');
      await userEvent.type(screen.getByLabelText('Nom'), 'User');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enregistrement.../ })).toBeDisabled();
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
      await userEvent.type(screen.getByLabelText('Prénom'), 'Test');
      await userEvent.type(screen.getByLabelText('Nom'), 'User');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Échec de l\'enregistrement' + errorMessage);
      });

    });

    it('shows error toast when update fails', async () => {
      const errorMessage = 'User not found';
      mockUsersUpdate.mockRejectedValue(new Error(errorMessage));

      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Submit form
      fireEvent.click(screen.getByText('Mettre à jour'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Échec de l\'enregistrement' + errorMessage);
      });

    });

    it('shows error toast when not authenticated', async () => {
      const _authContextWithoutToken = {
        ...mockAuthContext,
        user: { ...mockSession, token: null },
        session: { ...mockSession, token: null },
      };
      mockUseAuth.mockReturnValue({ user: null });

      render(<UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

      // Fill form
      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Prénom'), 'Test');
      await userEvent.type(screen.getByLabelText('Nom'), 'User');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');

      // Submit form
      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Non authentifié');
      });
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
      expect(screen.getByLabelText('Rôle')).toHaveValue('technician');
      expect(screen.getByLabelText('Actif')).toBeChecked();
    });

    it('resets password field when switching users', async () => {
      const { rerender } = renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Switch to create mode
      rerender(<UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

      // Form should be empty except for default role
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Email
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // First name
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Last name
      expect(screen.getByLabelText('Rôle')).toHaveValue('technician'); // Default role
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('handles text input changes correctly', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles select input changes correctly', async () => {
      renderWithAuth(
        <UserForm user={null} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const roleSelect = screen.getByLabelText('Rôle');
      await userEvent.selectOptions(roleSelect, 'admin');

      expect(roleSelect).toHaveValue('admin');
    });

    it('handles checkbox input changes correctly', () => {
      renderWithAuth(
        <UserForm user={mockUser} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const activeCheckbox = screen.getByLabelText('Actif');
      fireEvent.click(activeCheckbox);

      expect(activeCheckbox).not.toBeChecked();
    });
  });
});
