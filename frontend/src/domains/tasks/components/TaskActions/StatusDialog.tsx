'use client';

import { TaskStatus } from "@/lib/backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskWithDetails } from "@/types/task.types";
import {
  getAllowedTransitions,
  TASK_STATUS_LABELS,
} from "../../constants/task-transitions";
import { useTaskActions } from "./useTaskActions";

interface StatusDialogProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusDialog({ task, open, onOpenChange }: StatusDialogProps) {
  const actions = useTaskActions(task);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le statut de la tâche</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="status-select">Nouveau statut</Label>
            {/* Options are derived from ALLOWED_TRANSITIONS so this list
                stays in sync with task_state_machine.rs automatically.
                DEBT-21 — do NOT add hardcoded <SelectItem> entries here. */}
            {getAllowedTransitions(task.status).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Aucune transition disponible depuis le statut actuel.
              </p>
            ) : (
              <Select
                onValueChange={(value: string) => {
                  const allowed = getAllowedTransitions(task.status);
                  const statusValue = allowed.find((s) => s === value) as
                    | TaskStatus
                    | undefined;
                  if (statusValue) {
                    actions.updateStatus(statusValue);
                    onOpenChange(false);
                  }
                }}
                disabled={actions.isUpdatingStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut…" />
                </SelectTrigger>
                <SelectContent>
                  {getAllowedTransitions(task.status).map((nextStatus) => (
                    <SelectItem key={nextStatus} value={nextStatus}>
                      {TASK_STATUS_LABELS[nextStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
