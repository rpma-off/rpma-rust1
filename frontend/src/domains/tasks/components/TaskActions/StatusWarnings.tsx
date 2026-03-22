import React from "react";
import { AlertCircle } from "lucide-react";
import { TaskStatus } from "@/lib/backend";
import { isTerminalStatus } from "../../constants/task-transitions";

interface StatusWarningsProps {
  isAvailable: boolean;
  isAssignedToCurrentUser: boolean;
  canStartTask: boolean;
  isInProgress: boolean;
  taskStatus: TaskStatus;
}

export function StatusWarnings({
  isAvailable,
  isAssignedToCurrentUser,
  canStartTask,
  isInProgress,
  taskStatus,
}: StatusWarningsProps) {
  return (
    <>
      {!isAvailable && !isAssignedToCurrentUser && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/85">
              Cette tâche est déjà assignée à un autre technicien.
            </p>
          </div>
        </div>
      )}

      {!canStartTask && !isInProgress && !isTerminalStatus(taskStatus) && (
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/85">
              Statut incompatible avec le démarrage d&apos;intervention :{" "}
              {taskStatus}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
