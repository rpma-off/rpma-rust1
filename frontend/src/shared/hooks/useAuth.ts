import { useContext } from 'react';
import { AuthContext } from '@/domains/auth/api/AuthProvider';
import type { AuthContextType } from '@/types/auth.types';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
