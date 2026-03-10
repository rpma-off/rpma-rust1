/**
 * Auth Domain - Public API
 */

export { AuthProvider, AuthContext } from './AuthProvider';
/** TODO: document */
export { useAuth } from './useAuth';
/** TODO: document */
export { useAuthActions } from './useAuthActions';
/** TODO: document */
export { authBootstrap } from './bootstrapAdmin';
/** TODO: document */
export { getSessionToken, requireSessionToken } from '../services/sessionToken';
/** TODO: document */
export { default as PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
/** TODO: document */
export { LoginForm } from '../components/LoginForm';
/** TODO: document */
export { SignupForm } from '../components/SignupForm';
/** TODO: document */
export { default as TOTPSetup } from '../components/TOTPSetup';

/** TODO: document */
export { useAuthRedirect } from '../hooks/useAuthRedirect';
/** TODO: document */
export { useAdminBootstrapCheck } from '../hooks/useAdminBootstrapCheck';
/** TODO: document */
export { useSignupForm } from '../hooks/useSignupForm';
/** TODO: document */
export { useLoginForm } from '../hooks/useLoginForm';
/** TODO: document */
export { useBootstrapAdminPage } from '../hooks/useBootstrapAdminPage';
/** TODO: document */
export { useDashboardPage } from '../hooks/useDashboardPage';
/** TODO: document */
export { useHomePage } from '../hooks/useHomePage';

/** TODO: document */
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
