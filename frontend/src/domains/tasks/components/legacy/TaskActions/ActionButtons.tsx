'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  Camera, 
  FileText, 
  Download,
  Share2,
  Eye,
  Clock,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskWithDetails } from '@/types/task.types';
import { useAuth } from '@/domains/auth';
import { reportOperations } from '@/lib/ipc/domains/reports';
import toast from 'react-hot-toast';

interface ActionButtonsProps {
  task: TaskWithDetails;
  isTaskStarted: boolean;
  isTaskCompleted: boolean;
  completedSteps: Set<string>;
  onStartTask: () => void;
  onCompleteTask: () => void;
}

export function ActionButtons({
  task,
  isTaskStarted,
  isTaskCompleted,
  completedSteps,
  onStartTask,
  onCompleteTask
}: ActionButtonsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canComplete = completedSteps.size === 5; // All 5 steps completed

  const handleViewPhotos = () => {
    router.push(`/tasks/${task.id}/photos`);
  };

  const handleViewReport = () => {
    router.push(`/tasks/${task.id}/completed`);
  };

  const handleDownloadReport = async () => {
    try {
      if (!user?.token) {
        toast.error('Authentification requise');
        return;
      }
      await reportOperations.exportInterventionReport(task.id, user.token);
      toast.success('Rapport téléchargé avec succès');
    } catch {
      toast.error('Erreur lors du téléchargement du rapport');
    }
  };

  const handleShareTask = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`);
      toast.success('Lien copié dans le presse-papier');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const calculateDuration = () => {
    if (!task.start_time || !task.end_time) return null;
    const start = new Date(task.start_time);
    const end = new Date(task.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}min`;
  };

  const duration = calculateDuration();

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions principales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isTaskStarted ? (
            <Button 
              onClick={onStartTask}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Démarrer l&apos;intervention
            </Button>
          ) : isTaskCompleted ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Intervention terminée</span>
              </div>
              {duration && (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Durée: {duration}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={onCompleteTask}
                disabled={!canComplete}
                className="w-full"
                size="lg"
                variant={canComplete ? "default" : "secondary"}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {canComplete ? 'Finaliser l&apos;intervention' : 'Terminer toutes les étapes'}
              </Button>
              
              {!canComplete && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Complétez toutes les étapes du workflow pour finaliser l&apos;intervention.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions secondaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* View Photos */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleViewPhotos}
          >
            <Camera className="h-4 w-4 mr-2" />
            Voir les photos
            <Badge variant="secondary" className="ml-auto">
              {(task.photos_before?.length || 0) + (task.photos_after?.length || 0)}
            </Badge>
          </Button>

          {/* View Checklist */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            Voir la checklist
            <Badge variant="secondary" className="ml-auto">
              {task.checklist_items?.filter(item => item.is_completed).length || 0}/
              {task.checklist_items?.length || 0}
            </Badge>
          </Button>

          {/* View Report */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleViewReport}
            disabled={!isTaskCompleted}
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir le rapport
          </Button>
        </CardContent>
      </Card>

      {/* Export/Share Actions */}
      {isTaskCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Export et partage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleDownloadReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger le rapport PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleShareTask}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Partager l&apos;intervention
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer le rapport
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task Progress Summary */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-800">Progression</span>
              <span className="text-xs text-blue-600">
                {completedSteps.size}/5 étapes
              </span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps.size / 5) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-1 mt-3">
              {['before-photos', 'preparation', 'installation', 'after-photos', 'signature'].map((stepId) => (
                <div
                  key={stepId}
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    completedSteps.has(stepId) ? "bg-blue-600" : "bg-blue-200"
                  )}
                />
              ))}
            </div>

            <div className="flex justify-between text-xs text-blue-600 mt-2">
              <span>Photos</span>
              <span>Prep</span>
              <span>Install</span>
              <span>Photos</span>
              <span>Sign</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
