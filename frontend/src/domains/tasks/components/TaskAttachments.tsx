import React from 'react';
import { AlertCircle, Camera } from 'lucide-react';
import { TaskPhotos } from './TaskPhotos';

interface TaskAttachmentsProps {
  taskId: string;
  interventionId: string;
}

export function TaskAttachments({ taskId, interventionId }: TaskAttachmentsProps) {
  if (!interventionId) {
    return (
      <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/40 bg-background/20">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-semibold mb-1">Aucun média disponible</p>
        <p className="text-muted-foreground text-xs">Démarrez l&apos;intervention pour activer les photos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2 mb-2">
          <Camera className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Photos & Pièces Jointes</h2>
        </div>
      <TaskPhotos taskId={taskId} interventionId={interventionId} />
    </div>
  );
}
