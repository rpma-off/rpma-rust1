'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/lib/auth/compatibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BootstrapAdminPage() {
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
            <div className="text-center">Checking admin status...</div>
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
            <CardTitle>Admin Already Exists</CardTitle>
            <CardDescription>
              An administrator account has already been created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The system already has an admin user. If you need to manage roles or create additional admins,
                please log in with an existing admin account and use the admin panel.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/login')}
              className="w-full mt-4"
            >
              Go to Login
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
          <CardTitle>Bootstrap First Admin</CardTitle>
          <CardDescription>
            Create the first administrator account. This can only be done once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <AlertDescription>
                Promote the current logged-in user ({user?.email}) to administrator.
                This can only be done once when no admins exist.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={bootstrapMutation.isPending || !user?.user_id}
            >
              {bootstrapMutation.isPending ? 'Creating Admin...' : 'Promote to Admin'}
            </Button>

            {bootstrapMutation.isSuccess && (
              <Alert>
                <AlertDescription>
                  ✓ Admin created successfully! Redirecting to dashboard...
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
                      'Failed to create admin. User may not exist or admin already exists.';
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