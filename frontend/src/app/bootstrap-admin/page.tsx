'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/lib/auth/compatibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';

export default function BootstrapAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  // Check if admins already exist
  const { data: hasAdmins, isLoading: checkingAdmins } = useQuery({
    queryKey: ['hasAdmins'],
    queryFn: () => ipcClient.bootstrap.hasAdmins(),
  });

  const bootstrapMutation = useMutation({
    mutationFn: (userId: string) => ipcClient.bootstrap.firstAdmin(userId),
    onSuccess: () => {
      setTimeout(() => router.push('/dashboard'), 3000);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.user_id) {
      bootstrapMutation.mutate(user.user_id);
    }
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
            <CardTitle>Administrateur déjà existant</CardTitle>
            <CardDescription>
              Un compte administrateur a déjà été créé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Le système possède déjà un utilisateur administrateur. Si vous devez gérer les rôles ou créer des administrateurs supplémentaires,
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
          <CardTitle>Créer le premier administrateur</CardTitle>
          <CardDescription>
            Créez le premier compte administrateur. Cela ne peut être fait qu&apos;une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <AlertDescription>
                Promouvoir l&apos;utilisateur actuellement connecté ({user?.email}) en administrateur.
                Cela ne peut être fait qu&apos;une seule fois lorsqu&apos;aucun administrateur n&apos;existe.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={bootstrapMutation.isPending || !user?.user_id}
            >
              {bootstrapMutation.isPending ? 'Création de l\'admin...' : 'Promouvoir en Admin'}
            </Button>

            {bootstrapMutation.isSuccess && (
              <Alert>
                <AlertDescription>
                  ✓ Administrateur créé avec succès ! Redirection vers le tableau de bord...
                </AlertDescription>
              </Alert>
            )}

            {bootstrapMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(() => {
                    console.log('Bootstrap error:', bootstrapMutation.error);
                    const error = bootstrapMutation.error as { message?: string; error?: string };
                    return error?.message || (error as { error?: string })?.error ||
                      'Échec de la création de l\'admin. L\'utilisateur peut ne pas exister ou l\'admin existe déjà.';
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
