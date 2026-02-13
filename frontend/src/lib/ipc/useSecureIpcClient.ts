'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSecureIpcClient } from '@/lib/ipc/secure-client';
import type { UserAccount } from '@/lib/backend';

export function useSecureIpcClient() {
  const { profile } = useAuth();

  return useMemo(() => createSecureIpcClient(profile as UserAccount | null), [profile]);
}
