'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authBootstrap } from '../api/bootstrapAdmin';
import { useAuth } from '../api/useAuth';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { structuredLogger as logger, LogDomain } from '@/shared/utils';

export function useBootstrapAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const { data: hasAdmins, isLoading: checkingAdmins } = useQuery({
    queryKey: ['hasAdmins'],
    queryFn: () => authBootstrap.hasAdmins(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!checkingAdmins) {
      logger.debug(LogDomain.AUTH, 'Bootstrap admin status loaded', {
        has_admins: hasAdmins,
        user_id: user?.user_id,
      });
    }
  }, [checkingAdmins, hasAdmins, user?.user_id]);

  const bootstrapMutation = useMutation({
    mutationFn: ({ userId, sessionToken }: { userId: string; sessionToken: string }) =>
      authBootstrap.bootstrapFirstAdmin(userId, sessionToken),
    onSuccess: () => {
      toast.success('Administrateur créé avec succès. Redirection en cours...');
      logger.info(LogDomain.AUTH, 'Bootstrap admin succeeded', { user_id: user?.user_id });
      setTimeout(() => router.push('/dashboard'), 3000);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Échec de la création de l'admin.";
      toast.error(message);
      logger.error(LogDomain.AUTH, 'Bootstrap admin failed', error, { user_id: user?.user_id });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id || !user?.token) {
      logger.warn(LogDomain.AUTH, 'Bootstrap admin blocked: missing session', {
        user_id: user?.user_id,
      });
      return;
    }
    bootstrapMutation.mutate({ userId: user.user_id, sessionToken: user.token });
  };

  const handleGoToLogin = () => router.push('/login');

  return {
    t,
    user,
    hasAdmins,
    checkingAdmins,
    bootstrapMutation,
    handleSubmit,
    handleGoToLogin,
  };
}
