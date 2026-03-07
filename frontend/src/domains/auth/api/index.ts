/**
 * Auth Domain - Public API
 */

export { AuthProvider, AuthContext } from './AuthProvider';
export { useAuth } from './useAuth';
export { useAuthActions } from './useAuthActions';
export { authBootstrap } from './bootstrapAdmin';
export { getSessionToken, requireSessionToken } from '../services/sessionToken';
export { default as PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
export { LoginForm } from '../components/LoginForm';
export { SignupForm } from '../components/SignupForm';
export { default as TOTPSetup } from '../components/TOTPSetup';

export { useAuthRedirect } from '../hooks/useAuthRedirect';
export { useAdminBootstrapCheck } from '../hooks/useAdminBootstrapCheck';
export { useSignupForm } from '../hooks/useSignupForm';
export { useLoginForm } from '../hooks/useLoginForm';
export { useBootstrapAdminPage } from '../hooks/useBootstrapAdminPage';
export { useDashboardPage } from '../hooks/useDashboardPage';
export { useHomePage } from '../hooks/useHomePage';

export type {
  AuthContextType,
  AuthState,
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
  AuthenticatedRequest,
  UserSession,
  UserRole,
  UserAccount,
  PasswordValidationResult,
} from './types';
