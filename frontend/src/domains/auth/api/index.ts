/**
 * Auth Domain - Public API
 */

export { AuthProvider, AuthContext } from './AuthProvider';
export { useAuth } from './useAuth';
export { useAuthActions } from './useAuthActions';
export { authBootstrap } from './bootstrapAdmin';
export { default as PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
export { LoginForm } from '../components/LoginForm';
export { SignupForm } from '../components/SignupForm';
export { default as TOTPSetup } from '../components/TOTPSetup';

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
