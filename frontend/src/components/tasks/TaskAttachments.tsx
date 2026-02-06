import React from 'react';
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

  const interventionId = (interventionData as { intervention?: { id?: string } })?.intervention?.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-accent" />
          <h2 className="text-base md:text-lg font-semibold text-foreground">Photos et pièces jointes</h2>
        </div>
        <span className="text-xs text-border-light uppercase tracking-wide">Médias</span>
      </div>
      <div className="h-px bg-border/40" />
      {interventionId ? (
        <TaskPhotos taskId={taskId} interventionId={interventionId} />
      ) : (
        <div className="text-center py-8 rounded-lg border border-dashed border-border/60 bg-background/30">
          <AlertCircle className="w-12 h-12 text-border-light mx-auto mb-4" />
          <p className="text-foreground font-medium mb-1">Aucun média disponible pour le moment</p>
          <p className="text-border-light text-sm">Démarrez l&apos;intervention pour activer les photos.</p>
        </div>
      )}
    </div>
  );
}
