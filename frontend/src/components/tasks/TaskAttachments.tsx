import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertCircle } from 'lucide-react';
import { TaskPhotos } from './TaskPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useQuery } from '@tanstack/react-query';

interface TaskAttachmentsProps {
  taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { session } = useAuth();
  
  // Check for active intervention
  const { data: interventionData } = useQuery({
    queryKey: ['intervention', taskId],
    queryFn: async () => {
      if (!session?.token) return null;
      try {
        const result = await ipcClient.interventions.getActiveByTask(taskId, session.token);
        return result;
      } catch {
        return null;
      }
    },
    enabled: !!session?.token
  });

  const interventionId = (interventionData as any)?.intervention?.id;

  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Camera className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold text-foreground">Photos et pièces jointes</h2>
        </div>
        {interventionId ? (
          <TaskPhotos taskId={taskId} interventionId={interventionId} />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-border-light mx-auto mb-4" />
            <p className="text-border-light">
              Les photos ne sont disponibles qu&apos;après le démarrage d&apos;une intervention.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}