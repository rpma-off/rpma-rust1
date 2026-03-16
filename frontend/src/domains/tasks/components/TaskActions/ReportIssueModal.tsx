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

interface ReportIssueModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ task, open, onOpenChange }) => {
  const { reportIssue } = useTaskMutations();

  // Form state
  const [issueType, setIssueType] = useState('technical');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      enhancedToast.error('Veuillez décrire le problème');
      return;
    }

    try {
      await reportIssue.mutateAsync({
        taskId: task.id,
        issueType,
        severity,
        description: description.trim()
      });
      enhancedToast.success('Problème signalé avec succès');
      setIssueType('technical');
      setSeverity('medium');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      enhancedToast.error('Erreur lors du signalement du problème');
      console.error('Report issue error:', error);
    }
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
          <div className="text-sm text-muted-foreground">
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

          <div className="text-sm text-muted-foreground">
            <p>Ce signalement sera transmis Ã  l&apos;équipe de support pour résolution.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={reportIssue.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <SubmitButton
              isPending={reportIssue.isPending}
              pendingLabel="Signalement..."
              disabled={!description.trim()}
              variant="destructive"
            >
              Signaler
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueModal;

