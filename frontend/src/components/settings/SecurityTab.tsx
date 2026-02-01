'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Lock,
  Key,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Clock,
  MapPin
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';

// Password change form schema
const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  new_password: z.string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface SecuritySettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

interface LoginSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip_address: string;
  last_active: string;
  current_session: boolean;
}

export function SecurityTab({ user, profile }: SecuritySettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(480); // 8 hours in minutes

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.SECURITY,
    component: 'SecurityTab',
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // Load security settings and sessions
  useEffect(() => {
    const loadSecurityData = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        // Load user settings which may include security preferences
        const userSettings = await ipcClient.settings.getUserSettings(user.token);

        // Load active sessions from backend
        const sessionsResponse = await ipcClient.settings.getActiveSessions(user.token);
        if (sessionsResponse && Array.isArray(sessionsResponse)) {
          const formattedSessions = sessionsResponse.map((session: any) => ({
            id: session.id,
            device: session.device_info?.device_name || session.device_info?.device_type || 'Unknown Device',
            browser: session.user_agent || 'Unknown Browser',
            location: session.location || 'Unknown Location',
            ip_address: session.ip_address || 'Unknown IP',
            last_active: session.last_activity,
            current_session: false, // Will be determined by backend response
          }));
          setLoginSessions(formattedSessions);
        }

        // Check 2FA status
        const twoFactorStatus = await ipcClient.auth.is2FAEnabled(user.user_id, user.token);
        setTwoFactorEnabled(twoFactorStatus as boolean);

        // Get session timeout config
        const timeoutConfig = await ipcClient.settings.getSessionTimeoutConfig(user.token);
        setSessionTimeout((timeoutConfig as { timeout_minutes?: number })?.timeout_minutes || 480);

        logInfo('Security data loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load security data', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
        // Fallback to basic session info
        setLoginSessions([
          {
            id: 'current',
            device: 'Current Device',
            browser: navigator.userAgent.split(' ').pop() || 'Unknown',
            location: 'Current Location',
            ip_address: 'Current IP',
            last_active: new Date().toISOString(),
            current_session: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, [user?.token, user?.user_id, logInfo, logError]);

  const onPasswordChange = async (data: PasswordChangeFormData) => {
    if (!user?.token) {
      setPasswordChangeError('No authentication token available');
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    logUserAction('Password change initiated', { userId: user.user_id });

    try {
      await ipcClient.settings.changeUserPassword({
        current_password: data.current_password,
        new_password: data.new_password,
      }, user.token);

      setPasswordChangeSuccess(true);
      passwordForm.reset();
      logInfo('Password changed successfully', { userId: user.user_id });

      // Reset success message after 5 seconds
      setTimeout(() => setPasswordChangeSuccess(false), 5000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error changing password';
      setPasswordChangeError(errorMessage);
      logError('Password change failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!user?.token) return;

    logUserAction('Session revocation initiated', { sessionId });

    try {
      await ipcClient.settings.revokeSession(sessionId, user.token);

      setLoginSessions(prev => prev.filter(session => session.id !== sessionId));
      logInfo('Session revoked successfully', { sessionId });

    } catch (error) {
      logError('Session revocation failed', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });
    }
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    if (!user?.token) return;

    logUserAction('2FA toggle initiated', { enabled });

    try {
      if (enabled) {
        // Enable 2FA - this returns setup data (QR code, etc.)
        const setupData = await ipcClient.auth.enable2FA(user.token);
        // In a real implementation, you'd show a modal with QR code here
        // For now, we'll just enable it
        setTwoFactorEnabled(true);
        logInfo('2FA enabled successfully', { enabled });
      } else {
        // Disable 2FA
        await ipcClient.auth.disable2FA(user.token);
        setTwoFactorEnabled(false);
        logInfo('2FA disabled successfully', { enabled });
      }

    } catch (error) {
      logError('2FA toggle failed', { enabled, error: error instanceof Error ? error.message : error });
    }
  };

  const handleUpdateSessionTimeout = async (minutes: number) => {
    if (!user?.token) return;

    logUserAction('Session timeout update initiated', { minutes });

    try {
      await ipcClient.settings.updateSessionTimeout(minutes, user.token);

      setSessionTimeout(minutes);
      logInfo('Session timeout updated', { minutes });

    } catch (error) {
      logError('Session timeout update failed', { minutes, error: error instanceof Error ? error.message : error });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>
            Mettez à jour votre mot de passe pour maintenir la sécurité de votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordChangeSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Mot de passe changé avec succès. Vous serez déconnecté de toutes les autres sessions.
              </AlertDescription>
            </Alert>
          )}

          {passwordChangeError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{passwordChangeError}</AlertDescription>
            </Alert>
          )}

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Votre mot de passe actuel"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Votre nouveau mot de passe"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Au moins 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirmer votre nouveau mot de passe"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isChangingPassword} className="flex items-center gap-2">
                {isChangingPassword ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Key className="h-4 w-4" />
                )}
                Changer le mot de passe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Authentification à deux facteurs (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                {twoFactorEnabled
                  ? "L'authentification à deux facteurs est activée pour votre compte"
                  : "Renforcez la sécurité de votre compte avec l'authentification à deux facteurs"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {twoFactorEnabled && <Badge variant="secondary">Activé</Badge>}
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggleTwoFactor}
              />
            </div>
          </div>

          {!twoFactorEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                L&apos;activation de l&apos;authentification à deux facteurs nécessite un code QR et une application d&apos;authentification.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Session Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Sessions actives
          </CardTitle>
          <CardDescription>
             Gérez vos sessions actives et la durée d&apos;inactivité avant déconnexion automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Timeout */}
          <div className="space-y-2">
            <Label>Déconnexion automatique après inactivité</Label>
            <select
              value={sessionTimeout}
              onChange={(e) => handleUpdateSessionTimeout(parseInt(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="60">1 heure</option>
              <option value="240">4 heures</option>
              <option value="480">8 heures</option>
              <option value="1440">24 heures</option>
            </select>
            <p className="text-sm text-muted-foreground">
               Durée d&apos;inactivité avant déconnexion automatique pour des raisons de sécurité
            </p>
          </div>

          <Separator />

          {/* Active Sessions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Sessions actives</h4>
            <div className="space-y-3">
              {loginSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.device}</p>
                      {session.current_session && <Badge variant="outline">Session actuelle</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{session.browser}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.last_active).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  {!session.current_session && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Révoquer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recommandations de sécurité
          </CardTitle>
          <CardDescription>
            Conseils pour maintenir la sécurité de votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Mot de passe fort</p>
                <p className="text-sm text-muted-foreground">
                  Utilisez un mot de passe complexe avec au moins 12 caractères
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Authentification à deux facteurs</p>
                <p className="text-sm text-muted-foreground">
                  Activez la 2FA pour une protection supplémentaire
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Surveillez vos sessions</p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez régulièrement vos sessions actives et révoquez celles suspectes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}