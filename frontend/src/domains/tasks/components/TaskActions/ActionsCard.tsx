import React, { memo, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Edit,
  FileText,
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskWithDetails } from "@/types/task.types";
import { useTaskActions } from "./useTaskActions";
import { PrimaryActionButton } from "./PrimaryActionButton";
import { SecondaryActionsGrid } from "./SecondaryActionsGrid";
import { IconActionButton } from "./IconActionButton";
import { MoreActionsSection } from "./MoreActionsSection";
import { StatusWarnings } from "./StatusWarnings";
import { PrioritySelector } from "./PrioritySelector";
import { TaskActionPanel } from "./TaskActionPanel";
import { StatusDialog } from "./StatusDialog";
import { AssignmentDialog } from "./AssignmentDialog";
import { NotesDialog } from "./NotesDialog";

const EditTaskModal = lazy(() => import("./EditTaskModal"));
const SendMessageModal = lazy(() => import("./SendMessageModal"));
const DelayTaskModal = lazy(() => import("./DelayTaskModal"));
const ReportIssueModal = lazy(() => import("./ReportIssueModal"));

interface ActionsCardProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: (actionId: string) => void;
  isPending?: boolean;
  compact?: boolean;
  stickyOffsetClass?: string;
  mobileDocked?: boolean;
}

type ActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ActionsCard: React.FC<ActionsCardProps> = ({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
  compact = false,
  stickyOffsetClass,
  mobileDocked = false,
}) => {
  const router = useRouter();
  const actions = useTaskActions(task);

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showDelayTaskModal, setShowDelayTaskModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);

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

  const handleActionClick = (action: () => void) => {
    action();
  };

  const communicationActions: ActionItem[] = [
    {
      id: "call",
      label: "Appeler le client",
      icon: Phone,
      onClick: () => actions.initiateCall(),
      disabled: !task.customer_phone,
    },
    {
      id: "message",
      label: "Envoyer un message",
      icon: MessageSquare,
      onClick: () => setShowSendMessageModal(true),
    },
  ];

  const administrationActions: ActionItem[] = [
    {
      id: "status",
      label: "Changer le statut",
      icon: Settings,
      onClick: () => setShowStatusDialog(true),
    },
    {
      id: "assign",
      label: "M&apos;assigner la tâche",
      icon: User,
      onClick: () => setShowAssignmentDialog(true),
      disabled: isAssignedToCurrentUser,
    },
    {
      id: "notes",
      label: "Modifier les notes",
      icon: FileText,
      onClick: () => setShowNotesDialog(true),
    },
    {
      id: "edit",
      label: "Modifier la tâche",
      icon: Edit,
      onClick: () => setShowEditModal(true),
    },
    {
      id: "delay",
      label: "Reporter la tâche",
      icon: Clock,
      onClick: () => setShowDelayTaskModal(true),
    },
    {
      id: "report",
      label: "Signaler un problème",
      icon: AlertCircle,
      onClick: () => setShowReportIssueModal(true),
    },
  ];

  const primaryDisabledReason =
    !isAvailable && !isAssignedToCurrentUser
      ? "Intervention indisponible : cette tâche est déjà prise par un autre technicien."
      : shouldShowDisabledReason
        ? `Cette tâche est au statut « ${task.status} » et ne peut pas être démarrée.`
        : null;

  const dockedQuickActions = communicationActions.slice(0, 2);

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

          {mobileDocked ? (
            <div className="grid grid-cols-4 gap-2">
              {dockedQuickActions.map((action) => (
                <IconActionButton
                  key={action.id}
                  action={action}
                  onActionClick={handleActionClick}
                  compact
                />
              ))}
              <button
                type="button"
                onClick={() => setShowMoreActions((current) => !current)}
                className="rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-xs text-border-light hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4 mx-auto mb-1" />
                Plus
              </button>

              {showMoreActions && (
                <div className="col-span-4 grid grid-cols-2 gap-2 pt-1">
                  {[...communicationActions, ...administrationActions].map(
                    (action) => (
                      <IconActionButton
                        key={action.id}
                        action={action}
                        onActionClick={handleActionClick}
                        compact
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">
                  Communication
                </p>
                <SecondaryActionsGrid
                  actions={communicationActions}
                  onActionClick={handleActionClick}
                  columns={2}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">
                  Administration
                </p>
                <MoreActionsSection
                  showMoreActions={showMoreActions}
                  toggleMoreActions={() =>
                    setShowMoreActions((current) => !current)
                  }
                  actions={administrationActions}
                  onActionClick={handleActionClick}
                />
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

        <StatusDialog
          task={task}
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
        />
        <AssignmentDialog
          task={task}
          open={showAssignmentDialog}
          onOpenChange={setShowAssignmentDialog}
        />
        <NotesDialog
          task={task}
          open={showNotesDialog}
          onOpenChange={setShowNotesDialog}
        />

        <Suspense fallback={null}>
          <EditTaskModal
            task={task}
            open={showEditModal}
            onOpenChange={setShowEditModal}
          />
        </Suspense>
        <Suspense fallback={null}>
          <SendMessageModal
            task={task}
            open={showSendMessageModal}
            onOpenChange={setShowSendMessageModal}
          />
        </Suspense>
        <Suspense fallback={null}>
          <DelayTaskModal
            task={task}
            open={showDelayTaskModal}
            onOpenChange={setShowDelayTaskModal}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ReportIssueModal
            task={task}
            open={showReportIssueModal}
            onOpenChange={setShowReportIssueModal}
          />
        </Suspense>
      </div>
    </div>
  );
};

const ActionsCardWrapper: React.FC<ActionsCardProps> = (props) => {
  const isDelegated = Boolean(
    props.onPrimaryAction ||
    props.onSecondaryAction ||
    props.isPending !== undefined,
  );
  if (isDelegated) {
    return <TaskActionPanel mode="delegated" {...props} />;
  }
  return <TaskActionPanel mode="managed" {...props} />;
};

export default memo(ActionsCardWrapper);
