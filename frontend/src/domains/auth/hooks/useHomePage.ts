'use client';

import { useAuth } from '../api/useAuth';

export function useHomePage() {
  const { loading } = useAuth();
  return { loading };
}
