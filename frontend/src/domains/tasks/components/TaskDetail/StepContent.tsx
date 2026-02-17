'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  CheckSquare,
  Play,
  PenTool,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { TaskWithDetails, ChecklistItem } from '@/types/task.types';
import PhotoUploadZone from '@/PhotoUpload/PhotoUploadZone';
import { Photo, PhotoType, TaskPhoto } from '@/lib/backend';
import { ChecklistView } from '../TaskInfo/ChecklistView';

// Helper function to convert TaskPhoto to Photo
function _convertTaskPhotoToPhoto(taskPhoto: TaskPhoto): Photo {
  return {
    id: taskPhoto.id,
    intervention_id: '', // Not available in TaskPhoto
    step_id: null,
    step_number: null,
    file_path: taskPhoto.file_path,
    file_name: 'unknown.jpg', // TaskPhoto doesn't have filename
    file_size: BigInt(taskPhoto.file_size) || BigInt(0),
    mime_type: taskPhoto.mime_type || 'image/jpeg',
    width: null,
    height: null,
    photo_type: (taskPhoto.photo_type as PhotoType) || 'before',
    photo_category: 'other', // TaskPhoto doesn't have category
    photo_angle: null,
    zone: null,
    title: null,
    description: taskPhoto.description || null,
    notes: null,
    annotations: null,
    gps_location_lat: null,
    gps_location_lon: null,
    gps_location_accuracy: null,
    quality_score: null,
    blur_score: null,
    exposure_score: null,
    composition_score: null,
    is_required: false,
    is_approved: false,
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    synced: false, // TaskPhoto doesn't have synced
    storage_url: taskPhoto.url || taskPhoto.file_path,
    upload_retry_count: 0,
    upload_error: null,
    last_synced_at: null, // TaskPhoto doesn't have last_synced_at
    captured_at: taskPhoto.taken_at,
    uploaded_at: String(taskPhoto.created_at),
    created_at: String(taskPhoto.created_at),
    updated_at: String(taskPhoto.created_at),
  };
}
import { SOPViewer } from '../TaskInfo/SOPViewer';
import { SignatureCapture } from '@/components/SignatureCapture';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
  sopStep: number;
}

interface StepContentProps {
  step: WorkflowStep;
  task: TaskWithDetails;
  isCompleted: boolean;
  onComplete: () => void;
  onPhotoUpload: (file: File, type: 'before' | 'during' | 'after') => Promise<void>;
  onChecklistUpdate: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
}

export function StepContent({
  step,
  task,
  isCompleted,
  onComplete,
  onPhotoUpload,
  onChecklistUpdate
}: StepContentProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate step completion requirements
  const validateStep = (): boolean => {
    const errors: string[] = [];

    switch (step.id) {
      case 'before-photos':
        if (!task.photos_before || task.photos_before.length === 0) {
          errors.push('Au moins une photo avant est requise');
        }
        break;
      case 'preparation':
        if (task.checklist_items && !task.checklist_items.every(item => item.is_completed)) {
          errors.push('Toutes les étapes de préparation doivent être complétées');
        }
        break;
      case 'installation':
        // Add installation validation logic
        break;
      case 'after-photos':
        if (!task.photos_after || task.photos_after.length === 0) {
          errors.push('Au moins une photo après est requise');
        }
        break;
      case 'signature':
        // Signature validation will be handled by the SignatureCapture component
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleComplete = async () => {
    if (!validateStep()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Failed to complete step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'before-photos':
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Prenez des photos de qualité du véhicule avant l&apos;intervention. 
                Assurez-vous que les zones à traiter sont bien visibles.
              </AlertDescription>
            </Alert>

            <PhotoUploadZone
              type="before"
              existingPhotos={task.photos_before || []}
              onUpload={(file) => onPhotoUpload(file, 'before')}
              maxPhotos={6}
            />

            <SOPViewer stepNumber={1} taskId={task.id} />
          </div>
        );

      case 'preparation':
        return (
          <div className="space-y-6">
            <Alert>
              <CheckSquare className="h-4 w-4" />
              <AlertDescription>
                Complétez toutes les étapes de préparation avant de continuer.
              </AlertDescription>
            </Alert>

            <ChecklistView
              items={task.checklist_items || []}
              onItemUpdate={onChecklistUpdate}
            />

            <SOPViewer stepNumber={2} taskId={task.id} />
          </div>
        );

      case 'installation':
        return (
          <div className="space-y-6">
            <Alert>
              <Play className="h-4 w-4" />
              <AlertDescription>
                Suivez les procédures SOP pour l&apos;installation du film de protection.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Photos pendant l&apos;installation</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoUploadZone
                    type="during"
                    existingPhotos={[]}
                    onUpload={(file) => onPhotoUpload(file, 'during')}
                    maxPhotos={4}

                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notes d&apos;installation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Notez ici les observations pendant l&apos;installation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>
            </div>

            <SOPViewer stepNumber={3} taskId={task.id} />
          </div>
        );

      case 'after-photos':
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Prenez des photos du résultat final. Ces photos serviront de preuve 
                de la qualité du travail effectué.
              </AlertDescription>
            </Alert>

            <PhotoUploadZone
              type="after"
              existingPhotos={task.photos_after || []}
              onUpload={(file) => onPhotoUpload(file, 'after')}
              maxPhotos={6}
            />

            <SOPViewer stepNumber={4} taskId={task.id} />
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-6">
            <Alert>
              <PenTool className="h-4 w-4" />
              <AlertDescription>
                Obtenez la signature du client pour valider l&apos;intervention.
              </AlertDescription>
            </Alert>

            <SignatureCapture
              onSignatureCapture={() => {
                // Signature handling will trigger completion
                handleComplete();
              }}
            />

            <SOPViewer stepNumber={5} taskId={task.id} />
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Contenu de l&apos;étape non disponible</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      {renderStepContent()}

      {/* Step completion section */}
      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isCompleted ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    Étape terminée
                  </span>
                </>
              ) : (
                <>
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">
                    Marquer comme terminé
                  </span>
                </>
              )}
            </div>

            {!isCompleted && (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="ml-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Validation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Terminer l&apos;étape
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Notes section */}
          {step.id === 'installation' && notes && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-medium">Notes d&apos;installation</Label>
              <p className="text-sm text-gray-600 mt-1">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}