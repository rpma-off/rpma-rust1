import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@/lib/backend";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TaskWithDetails } from "@/types/task.types";
import {
  getAllowedTransitions,
  TASK_STATUS_LABELS,
} from "../../constants/task-transitions";
import { useTaskActions } from "./useTaskActions";
import { PrimaryActionButton } from "./PrimaryActionButton";
import { StatusWarnings } from "./StatusWarnings";
import { PrioritySelector } from "./PrioritySelector";

interface ManagedTaskActionPanelProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  mobileDocked?: boolean;
  mode: "managed";
  stickyOffsetClass?: string;
}

export function ManagedTaskActionPanel({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
  compact = false,
  stickyOffsetClass,
  mobileDocked = false,
}: ManagedTaskActionPanelProps) {
  const router = useRouter();
  const actions = useTaskActions(task);

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState(task.note || "");

  const isInProgress = task.status === "in_progress";
  const isCompleted = task.status === "completed";
  const shouldShowDisabledReason =
    !canStartTask && !isInProgress && !isCompleted;

  const handleViewCompleted = () => {
    router.push(`/tasks/${task.id}/completed`);
  };

  const handleViewWorkflow = () => {
    router.push(`/tasks/${task.id}/workflow/ppf`);
  };

  const handleStartWorkflow = () => {
    actions.startIntervention();
  };

  const handleAssignToMe = () => {
    actions.assignToMe();
    setShowAssignmentDialog(false);
  };

  const handleSaveNotes = () => {
    if (notes !== task.note) {
      actions.updateNotes(notes);
      setShowNotesDialog(false);
    }
  };

  const primaryDisabledReason =
    !isAvailable && !isAssignedToCurrentUser
      ? "Intervention indisponible : cette tâche est déjà prise par un autre technicien."
      : shouldShowDisabledReason
        ? `Cette tâche est au statut « ${task.status} » et ne peut pas être démarrée.`
        : null;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        compact
          ? "bg-transparent border-0"
          : "bg-background/40 border border-border/50",
        stickyOffsetClass,
      )}
    >
      <div className={compact ? "p-0" : "p-5"}>
        {!mobileDocked && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Actions de l&apos;intervention
            </h3>
          </div>
        )}

        <div className={cn(mobileDocked ? "space-y-2" : "space-y-5")}>
          <div>
            {!mobileDocked && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">
                Action principale
              </p>
            )}
            <PrimaryActionButton
              isCompleted={isCompleted}
              isInProgress={isInProgress}
              canStartTask={canStartTask}
              isPending={actions.isStartingIntervention}
              onViewCompleted={handleViewCompleted}
              onViewWorkflow={handleViewWorkflow}
              onStartWorkflow={handleStartWorkflow}
              compact={mobileDocked}
            />
            {primaryDisabledReason && !mobileDocked && (
              <p className="mt-2 text-xs text-amber-600">
                {primaryDisabledReason}
              </p>
            )}
          </div>

          {!mobileDocked && (
            <>
              <div className="pt-4 border-t border-border/30">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-border-light">
                  Administration
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowStatusDialog(true)}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background/60 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200 text-sm font-medium text-muted-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Statut
                  </button>
                  <button
                    onClick={() => setShowAssignmentDialog(true)}
                    disabled={isAssignedToCurrentUser}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background/60 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200 text-sm font-medium text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <User className="h-4 w-4" />
                    M&apos;assigner
                  </button>
                  <button
                    onClick={() => setShowNotesDialog(true)}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background/60 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200 text-sm font-medium text-muted-foreground"
                  >
                    <FileText className="h-4 w-4" />
                    Notes
                  </button>
                </div>
              </div>

              <StatusWarnings
                isAvailable={isAvailable}
                isAssignedToCurrentUser={isAssignedToCurrentUser}
                canStartTask={canStartTask}
                isInProgress={isInProgress}
                taskStatus={task.status}
              />

              <PrioritySelector
                value={task.priority || "medium"}
                onChange={(value) => actions.updatePriority(value)}
                isPending={actions.isUpdatingPriority}
              />
            </>
          )}
        </div>

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
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
                        setShowStatusDialog(false);
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

        <Dialog
          open={showAssignmentDialog}
          onOpenChange={setShowAssignmentDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>S&apos;assigner cette tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Vous êtes sur le point de vous assigner cette tâche.
                Confirmez-vous ?
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignmentDialog(false)}
                  className="px-4 py-2 rounded-lg border border-border/50 bg-background/60 hover:bg-border/30 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  disabled={actions.isAssigning}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
                >
                  {actions.isAssigning ? "Assignation..." : "Confirmer"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur cette tâche..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNotesDialog(false)}
                  className="px-4 py-2 rounded-lg border border-border/50 bg-background/60 hover:bg-border/30 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={actions.isUpdatingNotes}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
                >
                  {actions.isUpdatingNotes
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
