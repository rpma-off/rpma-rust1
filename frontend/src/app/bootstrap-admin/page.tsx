'use client';

import { useBootstrapAdminPage } from '@/domains/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BootstrapAdminPage() {
  const { t, user, hasAdmins, checkingAdmins, bootstrapMutation, handleSubmit, handleGoToLogin } =
    useBootstrapAdminPage();

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
            <CardTitle>Administrateur déjÃ  existant</CardTitle>
            <CardDescription>
              Un compte administrateur a déjÃ  été créé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Le système possède déjÃ  un utilisateur administrateur. Si vous devez gérer les rôles ou créer des administrateurs supplémentaires,
                veuillez vous connecter avec un compte administrateur existant et utiliser le panneau d&apos;administration.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleGoToLogin}
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
              disabled={bootstrapMutation.isPending || !user?.user_id || !user?.token}
            >
              {bootstrapMutation.isPending ? 'Création de l\'admin...' : 'Promouvoir en Admin'}
            </Button>

            {bootstrapMutation.isSuccess && (
              <Alert>
                <AlertDescription>
                  âœ“ Administrateur créé avec succès ! Redirection vers le tableau de bord...
                </AlertDescription>
              </Alert>
            )}

            {bootstrapMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(() => {
                    const error = bootstrapMutation.error as { message?: string; error?: string };
                    return error?.message || (error as { error?: string })?.error ||
                      'Échec de la création de l\'admin. L\'utilisateur peut ne pas exister ou l\'admin existe déjÃ .';
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

