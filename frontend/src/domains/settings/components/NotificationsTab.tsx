'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Save,
  TestTube,
} from 'lucide-react';
import { Form } from '@/components/ui/form';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';
import { useNotificationSettings, sendTestNotification } from './useNotificationSettings';
import {
  NotificationChannelsSection,
  NotificationTasksSection,
  NotificationSystemSection,
  NotificationScheduleSection,
  NotificationSoundSection,
} from './NotificationSections';

// Re-export for backwards compatibility
export { sendTestNotification };

interface NotificationsSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function NotificationsTab({ user }: NotificationsSettingsTabProps) {
  const {
    form,
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    testNotificationSent,
    onSubmit,
    handleTestNotification,
  } = useNotificationSettings(user);

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
            Préférences de notification mises à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {testNotificationSent && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Notification de test envoyée. Vérifiez vos canaux activés.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <NotificationChannelsSection form={form} />
          <NotificationTasksSection form={form} />
          <NotificationSystemSection form={form} />
          <NotificationScheduleSection form={form} />
          <NotificationSoundSection form={form} />

          {/* Test Notification */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Tester les notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Envoyer une notification de test à tous vos canaux activés
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleTestNotification}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Tester
                </Button>
              </div>
            </CardContent>
          </Card>

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
