'use client';

import React, { useState } from 'react';
import { MessageSquare, Inbox, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { MessageInbox } from '@/components/messages/MessageInbox';
import { NotificationPreferences } from '@/components/messages/NotificationPreferences';
import { useAuth } from '@/lib/auth/compatibility';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/layout/ErrorState';
import { useTranslation } from '@/hooks/useTranslation';

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inbox');

  if (!user) {
    return (
      <PageShell>
        <ErrorState
          title={t('errors.unauthorized')}
          message={t('errors.permissionDenied')}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={t('messages.title')}
        subtitle={t('settings.notifications')}
        icon={<MessageSquare className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <Button
            size="sm"
            onClick={() => setActiveTab('compose')}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('messages.newMessage')}</span>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">{t('messages.inbox')}</span>
            <span className="sm:hidden">Inbox</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('messages.compose')}</span>
            <span className="sm:hidden">Compose</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.preferences')}</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <MessageInbox userId={user.id} />
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <MessageComposer />
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <NotificationPreferences userId={user.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
