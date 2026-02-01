import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskWithDetails } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ReportIssueModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ task, open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [issueType, setIssueType] = useState('technical');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');

  // Report issue mutation
  const reportIssueMutation = useMutation({
    mutationFn: async ({ issueType, severity, description }: { issueType: string; severity: string; description: string }) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await ipcClient.tasks.reportTaskIssue(task.id, issueType, severity, description, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Problème signalé avec succès');
      setIssueType('technical');
      setSeverity('medium');
      setDescription('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors du signalement du problème');
      console.error('Report issue error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Veuillez décrire le problème');
      return;
    }

    reportIssueMutation.mutate({ issueType, severity, description: description.trim() });
  };

  const handleCancel = () => {
    setIssueType('technical');
    setSeverity('medium');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-border-light">
            <p>Tâche concernée: #{task.task_number} - {task.title}</p>
          </div>

          <div>
            <Label htmlFor="issue-type">Type de problème</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="technical" className="text-foreground hover:bg-border">Technique</SelectItem>
                <SelectItem value="material" className="text-foreground hover:bg-border">Matériel</SelectItem>
                <SelectItem value="client" className="text-foreground hover:bg-border">Client</SelectItem>
                <SelectItem value="planning" className="text-foreground hover:bg-border">Planning</SelectItem>
                <SelectItem value="quality" className="text-foreground hover:bg-border">Qualité</SelectItem>
                <SelectItem value="other" className="text-foreground hover:bg-border">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="severity">Sévérité</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="low" className="text-foreground hover:bg-border">Faible</SelectItem>
                <SelectItem value="medium" className="text-foreground hover:bg-border">Moyenne</SelectItem>
                <SelectItem value="high" className="text-foreground hover:bg-border">Élevée</SelectItem>
                <SelectItem value="critical" className="text-foreground hover:bg-border">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description du problème *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail..."
              rows={4}
              required
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="text-sm text-border-light">
            <p>Ce signalement sera transmis à l&apos;équipe de support pour résolution.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={reportIssueMutation.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={reportIssueMutation.isPending || !description.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {reportIssueMutation.isPending ? 'Signalement...' : 'Signaler'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueModal;