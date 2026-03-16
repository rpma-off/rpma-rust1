import React, { useState } from 'react';
import { TaskWithDetails } from '@/lib/backend';
import enhancedToast from '@/lib/enhanced-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { useTaskMutations } from '../../hooks/useTaskMutations';

interface SendMessageModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ task, open, onOpenChange }) => {
  const { sendMessage } = useTaskMutations();

  // Form state
  const [messageType, setMessageType] = useState('internal');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      enhancedToast.error('Veuillez saisir un message');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        taskId: task.id,
        message: message.trim(),
        messageType
      });
      enhancedToast.success('Message envoyé avec succès');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      enhancedToast.error('Erreur lors de l\'envoi du message');
      console.error('Send message error:', error);
    }
  };

  const handleCancel = () => {
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un message</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Tâche concernée: #{task.task_number} - {task.title}</p>
          </div>

          <div>
            <Label htmlFor="message-type">Canal de communication</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="internal" className="text-foreground hover:bg-border">Note interne (Technicien)</SelectItem>
                <SelectItem value="client" className="text-foreground hover:bg-border">Message au client</SelectItem>
                <SelectItem value="admin" className="text-foreground hover:bg-border">Note à l&apos;administration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Saisissez votre message ici..."
              rows={4}
              required
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={sendMessage.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <SubmitButton
              isPending={sendMessage.isPending}
              pendingLabel="Envoi..."
              disabled={!message.trim()}
              variant="default"
            >
              Envoyer
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;
