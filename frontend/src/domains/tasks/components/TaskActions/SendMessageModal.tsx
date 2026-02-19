import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskWithDetails } from '@/lib/backend';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InlineLoading } from '@/components/ui/loading';
import enhancedToast from '@/lib/enhanced-toast';

interface SendMessageModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ task, open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('general');

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, messageType }: { message: string; messageType: string }) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await ipcClient.tasks.sendTaskMessage(task.id, message, messageType, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      enhancedToast.success('Message envoyé avec succès');
      setMessage('');
      setMessageType('general');
      onOpenChange(false);
    },
    onError: (error) => {
      enhancedToast.error('Erreur lors de l\'envoi du message');
      console.error('Send message error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      enhancedToast.error('Veuillez saisir un message');
      return;
    }

    sendMessageMutation.mutate({ message: message.trim(), messageType });
  };

  const handleCancel = () => {
    setMessage('');
    setMessageType('general');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un message</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message-type">Type de message</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="general" className="text-foreground hover:bg-border">Général</SelectItem>
                <SelectItem value="update" className="text-foreground hover:bg-border">Mise à jour</SelectItem>
                <SelectItem value="urgent" className="text-foreground hover:bg-border">Urgent</SelectItem>
                <SelectItem value="question" className="text-foreground hover:bg-border">Question</SelectItem>
                <SelectItem value="confirmation" className="text-foreground hover:bg-border">Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Saisissez votre message..."
              rows={4}
              required
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Ce message sera associé à la tâche #{task.task_number}</p>
            {task.customer_name && (
              <p>Destinataire: {task.customer_name}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={sendMessageMutation.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending || !message.trim()}
              variant="default"
            >
              {sendMessageMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <InlineLoading size="sm" />
                  Envoi...
                </span>
              ) : 'Envoyer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;
