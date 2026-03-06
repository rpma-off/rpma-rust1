'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';
import { usePreferencesForm } from '../hooks/usePreferencesForm';
import { NotificationsSection } from './preferences/NotificationsSection';
import { DisplaySection } from './preferences/DisplaySection';
import { AccessibilitySection } from './preferences/AccessibilitySection';
import { PerformanceSection } from './preferences/PerformanceSection';

interface PreferencesSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function PreferencesTab({ user }: PreferencesSettingsTabProps) {
  const { form, isLoading, isSaving, saveSuccess, saveError, onSubmit } = usePreferencesForm(user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Préférences mises à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <NotificationsSection control={form.control} />
          <DisplaySection control={form.control} />
          <AccessibilitySection control={form.control} />
          <PerformanceSection control={form.control} />

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder les préférences
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Réinitialiser
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
