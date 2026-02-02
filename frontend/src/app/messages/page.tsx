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
          <p className="text-border-light">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border-b border-border/20 bg-background rounded-xl mb-6"
        >
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Messages</h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-1">
                    Communication et notifications
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('compose')}
                  className="flex items-center gap-2 border-border/60 text-foreground hover:bg-muted/10"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nouveau message</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border border-border/20 bg-background rounded-xl overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 border-b border-border/10">
              <TabsTrigger value="inbox" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Boîte de réception</span>
                <span className="sm:hidden">Inbox</span>
              </TabsTrigger>
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Composer</span>
                <span className="sm:hidden">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Préférences</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
            </TabsList>

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