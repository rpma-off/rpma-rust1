'use client';

import React from 'react';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PreferencesSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function PreferencesTab({ user: _user, profile: _profile }: PreferencesSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Préférences générales</CardTitle>
          <CardDescription>
            Gérez vos préférences d&apos;application (en cours de construction).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Les paramètres locaux seront disponibles prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
