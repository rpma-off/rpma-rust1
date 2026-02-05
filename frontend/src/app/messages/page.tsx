'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Inbox, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { MessageInbox } from '@/components/messages/MessageInbox';
import { NotificationPreferences } from '@/components/messages/NotificationPreferences';
import { useAuth } from '@/lib/auth/compatibility';

export default function MessagesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inbox');

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Accès non autorisé</h1>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
            <div className="px-5 pt-4 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <h1 className="text-xl font-semibold">Messages</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('compose')}
                className="flex items-center gap-2 text-white border-white/40 hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouveau message</span>
              </Button>
            </div>
            <div className="px-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList data-variant="underline" className="w-full justify-start">
                  <TabsTrigger value="inbox" data-variant="underline" className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    <span className="hidden sm:inline">Boîte de réception</span>
                    <span className="sm:hidden">Inbox</span>
                  </TabsTrigger>
                  <TabsTrigger value="compose" data-variant="underline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Composer</span>
                    <span className="sm:hidden">Compose</span>
                  </TabsTrigger>
                  <TabsTrigger value="preferences" data-variant="underline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Préférences</span>
                    <span className="sm:hidden">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rpma-shell overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="inbox" className="p-6">
              <MessageInbox userId={user.id} />
            </TabsContent>

            <TabsContent value="compose" className="p-6">
              <MessageComposer />
            </TabsContent>

            <TabsContent value="preferences" className="p-6">
              <NotificationPreferences userId={user.id} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
