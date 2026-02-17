import { useAuth } from './useAuth';

export function useAuthActions() {
  const { signIn, signUp, signOut, refreshProfile } = useAuth();
  return { signIn, signUp, signOut, refreshProfile };
}
