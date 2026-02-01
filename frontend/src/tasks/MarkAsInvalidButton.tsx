'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type MarkAsInvalidButtonProps = {
  taskId: string;
  taskTitle?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | null | undefined;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined;
  className?: string;
  showIcon?: boolean;
};

export function MarkAsInvalidButton({
  taskId,
  taskTitle = 'cette tâche',
  onSuccess,
  variant = 'outline',
  size = 'default',
  className = '',
  showIcon = true,
}: MarkAsInvalidButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setError(null);
    }
    setIsOpen(open);
  };

  const handleMarkAsInvalid = async () => {
    if (!taskId) {
      setError('ID de la tâche manquant');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/mark-invalid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du marquage de la tâche comme invalide');
      }

      toast.success('Tâche marquée comme invalide avec succès');
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error marking task as invalid:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast.error('Erreur lors du marquage de la tâche comme invalide');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => handleOpenChange(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : showIcon ? (
          <AlertTriangle className="mr-2 h-4 w-4" />
        ) : null}
        Marquer comme invalide
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Marquer comme invalide
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir marquer &quot;{taskTitle}&quot; comme invalide ?
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Raison (facultative)
              </Label>
              <Textarea
                id="reason"
                placeholder="Pourquoi cette tâche est-elle invalide ?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleMarkAsInvalid}
              disabled={isLoading || !taskId}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                'Marquer comme invalide'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
