import React, { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, CheckCircle, Image as ImageIcon, ListChecks, 
  MoreVertical, Edit, FileText, MessageSquare, Clock, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskWithDetails } from '@/types/task.types';
import toast from 'react-hot-toast';
import { useAuth } from '@/domains/auth';
import { InterventionWorkflowService } from '@/domains/interventions';
import { ipcClient } from '@/lib/ipc/client';
import EditTaskModal from '../../TaskActions/EditTaskModal';

interface ActionsCardProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
}

const ActionsCard: React.FC<ActionsCardProps> = ({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
}) => {
  const router = useRouter();
  const { session } = useAuth();

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!session?.token) {
    return <div>Loading...</div>;
  }
  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';
  const hasBeforePhotos = task.photos_before && task.photos_before.length > 0;
  const hasAfterPhotos = task.photos_after && task.photos_after.length > 0;
  const hasChecklist = task.checklist_items && task.checklist_items.length > 0;

  const toggleMoreActions = () => setShowMoreActions(!showMoreActions);

  const handleActionClick = (action: () => void) => {
    setShowMoreActions(false);
    action();
  };

  const handleStartWorkflow = async () => {
    if (!session?.token) {
      toast.error('Authentification requise');
      return;
    }

    setIsStarting(true);
    try {
      // Start the intervention first
      const taskRecord = task as unknown as Record<string, unknown>;
      const startData = {
        task_id: task.id,
        intervention_number: `INT-${Date.now()}`,
        ppf_zones: task.ppf_zones || [],
        custom_zones: [],
        film_type: (taskRecord.film_type as string) || 'Standard',
        film_brand: (taskRecord.film_brand as string) || 'Default',
        film_model: (taskRecord.film_model as string) || 'Standard',
        weather_condition: 'Indoor',
        lighting_condition: 'Good',
        work_location: 'Workshop',
        temperature: 22.0,
        humidity: 45.0,
        technician_id: session.user_id,
        assistant_ids: [],
        scheduled_start: new Date().toISOString()
      };

      const result = await InterventionWorkflowService.startIntervention(task.id, startData, session.token);
      
      if (!result.success) {
        toast.error(result.error?.message || 'Échec du démarrage de l\'intervention');
        return;
      }

      toast.success('Intervention démarrée avec succès');
      
      // Navigate to workflow after successful start
      router.push(`/tasks/${task.id}/workflow/ppf`);
    } catch (error) {
      console.error('Failed to start intervention:', error);
      toast.error('Échec du démarrage de l\'intervention');
    } finally {
      setIsStarting(false);
    }
  };

  const handleViewWorkflow = () => {
    router.push(`/tasks/${task.id}/workflow/ppf`);
  };

  const handleViewChecklistPage = () => {
    router.push(`/tasks/${task.id}/checklist`);
  };

  const handleViewPhotosPage = () => {
    router.push(`/tasks/${task.id}/photos`);
  };

  const handleViewCompleted = () => {
    router.push(`/tasks/${task.id}/completed`);
  };

  // Primary action button based on task status
  const renderPrimaryAction = () => {
    if (isCompleted) {
      return (
        <Button
          onClick={handleViewCompleted}
          className="w-full bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Voir le rapport final
        </Button>
      );
    }

    if (isInProgress) {
      return (
        <Button
          onClick={handleViewWorkflow}
          className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowRight className="h-5 w-5 mr-2" />
          Continuer l&apos;intervention
        </Button>
      );
    }

    return (
      <Button
        onClick={handleStartWorkflow}
        disabled={!canStartTask || isStarting}
        className={cn(
          "w-full transition-colors duration-200",
          canStartTask && !isStarting
            ? "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            : "bg-gray-300 cursor-not-allowed"
        )}
      >
        {isStarting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            Démarrage...
          </>
        ) : (
          <>
            <Play className="h-5 w-5 mr-2" />
            Démarrer l&apos;intervention
          </>
        )}
      </Button>
    );
  };

  // Secondary actions (photos, checklist, etc.)
  const secondaryActions = [
    {
      id: 'photos',
      label: 'Voir les photos',
      icon: ImageIcon,
      count: (hasBeforePhotos ? task.photos_before?.length || 0 : 0) +
             (hasAfterPhotos ? task.photos_after?.length || 0 : 0),
      onClick: handleViewPhotosPage,
      disabled: !hasBeforePhotos && !hasAfterPhotos,
    },
    {
      id: 'checklist',
      label: 'Voir la check-list',
      icon: ListChecks,
      count: hasChecklist ? task.checklist_items?.length : 0,
      onClick: handleViewChecklistPage,
      disabled: !hasChecklist,
    },
  ];

  // More actions dropdown items
  const moreActions = [
    {
      id: 'edit',
      label: 'Modifier la tâche',
      icon: Edit,
      onClick: () => {
        setShowEditModal(true);
      }
    },
    {
      id: 'notes',
      label: 'Ajouter une note',
      icon: FileText,
      onClick: async () => {
        try {
          // For now, use a simple approach - in a real implementation,
          // this would open a proper modal dialog
          const note = window.prompt('Entrez votre note:');
          if (note && note.trim()) {
            await ipcClient.tasks.addTaskNote(task.id, note.trim(), session.token);
            toast.success('Note ajoutée avec succès');
          }
        } catch (error) {
          console.error('Failed to add note:', error);
          toast.error('Erreur lors de l\'ajout de la note');
        }
      }
    },
    {
      id: 'message',
      label: 'Envoyer un message',
      icon: MessageSquare,
      onClick: async () => {
        try {
          const message = prompt('Entrez votre message:');
          if (message && message.trim()) {
            await ipcClient.tasks.sendTaskMessage(task.id, message.trim(), 'general', session.token);
            toast.success('Message envoyé avec succès');
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          toast.error('Erreur lors de l\'envoi du message');
        }
      }
    },
    {
      id: 'delay',
      label: 'Reporter la tâche',
      icon: Clock,
      onClick: async () => {
        try {
          const newDate = prompt('Nouvelle date (YYYY-MM-DD):');
          const reason = prompt('Raison du report:');
          if (newDate && reason && reason.trim()) {
            await ipcClient.tasks.delayTask(task.id, newDate, reason.trim(), session.token);
            toast.success('Tâche reportée avec succès');
          }
        } catch (error) {
          console.error('Failed to delay task:', error);
          toast.error('Erreur lors du report de la tâche');
        }
      }
    },
    {
      id: 'report',
      label: 'Signaler un problème',
      icon: AlertCircle,
      onClick: async () => {
        try {
          const issueType = prompt('Type de problème (technique, client, autre):') || 'autre';
          const severity = prompt('Sévérité (low, medium, high, critical):') || 'medium';
          const description = prompt('Description du problème:');
          if (description && description.trim()) {
            await ipcClient.tasks.reportTaskIssue(task.id, issueType, severity, description.trim(), session.token);
            toast.success('Problème signalé avec succès');
          }
        } catch (error) {
          console.error('Failed to report issue:', error);
          toast.error('Erreur lors du signalement du problème');
        }
      }
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm hover:shadow transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900">Actions</h3>
        <div className="relative">
          <button
            onClick={toggleMoreActions}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Plus d'actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          
          {/* Dropdown menu */}
          {showMoreActions && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {moreActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.onClick)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                    role="menuitem"
                  >
                    <action.icon className="h-4 w-4 mr-3 text-gray-500" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Primary Action Button */}
        <div>
          {renderPrimaryAction()}
        </div>
        
        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.onClick)}
              disabled={action.disabled}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-md border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-colors duration-150",
                action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <action.icon className={cn(
                "h-5 w-5 mb-1",
                action.disabled ? "text-gray-400" : "text-blue-600"
              )} />
              <span className="text-xs font-medium text-gray-700">
                {action.label}
              </span>
              {action.count && action.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {action.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Task Status Info */}
        {!isAvailable && !isAssignedToCurrentUser && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
            <p className="text-xs text-yellow-700 flex items-start">
              <AlertCircle className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0" />
              Cette tâche est déjà assignée à un autre technicien.
            </p>
          </div>
        )}
        
        {/* Task Note */}
        {task.note && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-xs text-blue-700 flex items-start">
              <FileText className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-3">{task.note}</span>
            </p>
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={task}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </div>
  );
};

export default memo(ActionsCard);
