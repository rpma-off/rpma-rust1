'use client';

import React, { useState } from 'react';
import { Shield, Lock, Monitor, Clock, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserSession } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSecurityTabData } from '../hooks/useSecurityTabData';

export interface SecurityTabProps {
  user: UserSession;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  const {
    sessions,
    timeoutMinutes,
    setTimeoutMinutes,
    isLoadingSessions,
    isRevokingAll,
    isRevokingId,
    isSavingTimeout,
    sessionsError,
    revokeSession,
    revokeAllSessions,
    saveTimeout,
    changePassword,
    logger,
  } = useSecurityTabData(user);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe';
      setPasswordError(msg);
      logger.logError('Password change failed', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const TIMEOUT_OPTIONS = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 heure' },
    { value: 120, label: '2 heures' },
    { value: 240, label: '4 heures' },
    { value: 480, label: '8 heures (défaut)' },
    { value: 1440, label: '24 heures' },
  ];

  return (
    <div data-testid="security-tab" className="space-y-6">

      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Modifiez votre mot de passe de connexion</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Mot de passe modifié avec succès</AlertDescription>
            </Alert>
          )}
          {passwordError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2"
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isChangingPassword ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Timeout de session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Durée de session
          </CardTitle>
          <CardDescription>Définissez la durée d&apos;inactivité avant déconnexion automatique</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 max-w-sm">
            <Select
              value={String(timeoutMinutes)}
              onValueChange={v => setTimeoutMinutes(Number(v))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => saveTimeout()}
              disabled={isSavingTimeout}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isSavingTimeout ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Appliquer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions actives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Sessions actives
              </CardTitle>
              <CardDescription>Appareils connectés à votre compte</CardDescription>
            </div>
            {sessions.filter(s => !s.is_current).length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => revokeAllSessions()}
                disabled={isRevokingAll}
                className="flex items-center gap-2"
              >
                {isRevokingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Révoquer toutes les autres
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sessionsError}</AlertDescription>
            </Alert>
          )}

          {isLoadingSessions ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Session actuelle uniquement</p>
              <p className="text-xs mt-1">
                Utilisateur : <span className="font-medium">{user.username}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <div key={session.id ?? index}>
                  {index > 0 && <Separator className="my-2" />}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {session.device ?? 'Appareil inconnu'}
                          </p>
                          {session.is_current && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              Session actuelle
                            </Badge>
                          )}
                        </div>
                        {session.ip_address && (
                          <p className="text-xs text-muted-foreground">IP : {session.ip_address}</p>
                        )}
                        {session.last_activity && (
                          <p className="text-xs text-muted-foreground">
                            Dernière activité : {session.last_activity}
                          </p>
                        )}
                      </div>
                    </div>
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSession(session.id)}
                        disabled={isRevokingId === session.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {isRevokingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
