'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authBootstrap, useAuth } from '@/domains/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { structuredLogger as logger, LogDomain } from '@/shared/utils';
import { useEffect } from 'react';

export default function BootstrapAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  // Check if admins already exist
  const { data: hasAdmins, isLoading: checkingAdmins } = useQuery({
    queryKey: ['hasAdmins'],
    queryFn: () => authBootstrap.hasAdmins(),
  });

  useEffect(() => {
    if (!checkingAdmins) {
      logger.debug(LogDomain.AUTH, 'Bootstrap admin status loaded', {
        has_admins: hasAdmins,
        user_id: user?.user_id
      });
    }
  }, [checkingAdmins, hasAdmins, user?.user_id]);

  const bootstrapMutation = useMutation({
    mutationFn: ({ userId, sessionToken }: { userId: string; sessionToken: string }) =>
      authBootstrap.bootstrapFirstAdmin(userId, sessionToken),
    onSuccess: () => {
      logger.info(LogDomain.AUTH, 'Bootstrap admin succeeded', {
        user_id: user?.user_id
      });
      setTimeout(() => router.push('/dashboard'), 3000);
    },
    onError: (error) => {
      logger.error(LogDomain.AUTH, 'Bootstrap admin failed', error, {
        user_id: user?.user_id
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id || !user?.token) {
      logger.warn(LogDomain.AUTH, 'Bootstrap admin blocked: missing session', {
        user_id: user?.user_id
      });
      return;
    }
    bootstrapMutation.mutate({ userId: user.user_id, sessionToken: user.token });
  };

  if (checkingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">{t('common.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Administrateur dÃ©jÃ  existant</CardTitle>
            <CardDescription>
              Un compte administrateur a dÃ©jÃ  Ã©tÃ© crÃ©Ã©.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Le systÃ¨me possÃ¨de dÃ©jÃ  un utilisateur administrateur. Si vous devez gÃ©rer les rÃ´les ou crÃ©er des administrateurs supplÃ©mentaires,
                veuillez vous connecter avec un compte administrateur existant et utiliser le panneau d&apos;administration.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/login')}
              className="w-full mt-4"
            >
              {t('auth.signIn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CrÃ©er le premier administrateur</CardTitle>
          <CardDescription>
            CrÃ©ez le premier compte administrateur. Cela ne peut Ãªtre fait qu&apos;une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <AlertDescription>
                Promouvoir l&apos;utilisateur actuellement connectÃ© ({user?.email}) en administrateur.
                Cela ne peut Ãªtre fait qu&apos;une seule fois lorsqu&apos;aucun administrateur n&apos;existe.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={bootstrapMutation.isPending || !user?.user_id || !user?.token}
            >
              {bootstrapMutation.isPending ? 'CrÃ©ation de l\'admin...' : 'Promouvoir en Admin'}
            </Button>

            {bootstrapMutation.isSuccess && (
              <Alert>
                <AlertDescription>
                  âœ“ Administrateur crÃ©Ã© avec succÃ¨s ! Redirection vers le tableau de bord...
                </AlertDescription>
              </Alert>
            )}

            {bootstrapMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(() => {
                    const error = bootstrapMutation.error as { message?: string; error?: string };
                    return error?.message || (error as { error?: string })?.error ||
                      'Ã‰chec de la crÃ©ation de l\'admin. L\'utilisateur peut ne pas exister ou l\'admin existe dÃ©jÃ .';
                  })()}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


