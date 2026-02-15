import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

// ─── Mocks ─────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/auth/compatibility', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    loading: false,
    user: null,
    profile: null,
    session: null,
    isAuthenticating: false,
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/login',
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// ─── Tests ──────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ success: true, data: {} });
  });

  it('renders login form with email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('renders signup link', () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole('link', { name: /créer un compte/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('renders heading text', () => {
    render(<LoginPage />);

    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByText(/accédez à votre tableau de bord/i)).toBeInTheDocument();
  });

  it('updates email and password fields on input', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/adresse email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls signIn with correct credentials on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/adresse email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error message on failed login', async () => {
    mockSignIn.mockResolvedValue({ success: false, error: 'Identifiants invalides' });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/adresse email/i), 'bad@test.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText('Identifiants invalides')).toBeInTheDocument();
    });
  });

  it('displays error on exception during login', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/adresse email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'pass');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows loading state while submitting', async () => {
    // Make signIn take time
    mockSignIn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/adresse email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'pass');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(screen.getByText(/connexion en cours/i)).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    mockSignIn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/adresse email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'pass');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has required attribute on email and password inputs', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/adresse email/i)).toBeRequired();
    expect(screen.getByLabelText(/mot de passe/i)).toBeRequired();
  });

  it('email input has correct type attribute', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/adresse email/i)).toHaveAttribute('type', 'email');
  });

  it('password input has correct type attribute', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('type', 'password');
  });
});
