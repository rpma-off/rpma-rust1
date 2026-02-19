'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';
import { ArrowRight, Camera, MapPin, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePPFWorkflow, getNextPPFStepId, getPPFStepPath, VehicleDiagram } from '@/domains/interventions';
import { PhotoUpload } from '@/domains/workflow';
import type { Defect } from '@/domains/interventions';
import { useTranslation } from '@/shared/hooks';

type InspectionDefectPayload = {
  id: string;
  zone: string;
  type: Defect['type'];
  severity?: Defect['severity'];
  notes?: string | null;
};

type InspectionCollectedData = {
  defects?: InspectionDefectPayload[];
  meta?: {
    photos_count?: number;
  };
};

export default function InspectionStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { taskId, advanceToStep, stepsData, steps, currentStep } = usePPFWorkflow();
  const [defects, setDefects] = useState<Array<Defect>>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Load existing data when component mounts
  useEffect(() => {
    // Find the inspection step data
    const inspectionStep = stepsData?.steps?.find((step) => step.step_type === 'inspection');
    const collectedData = inspectionStep?.collected_data as InspectionCollectedData | undefined;
    if (collectedData) {
      // Restore defects from collected_data
      if (collectedData.defects) {
        const restoredDefects: Defect[] = collectedData.defects.map((defect) => ({
          id: defect.id,
          zone: defect.zone,
          type: defect.type,
          severity: defect.severity || 'low',
          notes: defect.notes ?? undefined
        }));
        setDefects(restoredDefects);
      }

      // Restore photos from photo_urls if available
      if (inspectionStep?.photo_urls && Array.isArray(inspectionStep.photo_urls)) {
        setUploadedPhotos(inspectionStep.photo_urls);
      }
    }
  }, [stepsData]);

  useEffect(() => {
    if (!steps.length) return;
    const hasInspection = steps.some(step => step.id === 'inspection');
    if (!hasInspection) {
      const targetId = currentStep?.id ?? steps[0]?.id;
      const targetPath = targetId ? getPPFStepPath(targetId) : null;
      router.replace(
        targetPath ? `/tasks/${taskId}/workflow/ppf/${targetPath}` : `/tasks/${taskId}/workflow/ppf`
      );
    }
  }, [steps, currentStep, router, taskId]);

  const handleCompleteInspection = async () => {
    if (isCompleting) return; // Prevent multiple calls
    
    setIsCompleting(true);
    try {
      const collectedData = {
        defects: defects.map(defect => ({
          id: defect.id,
          zone: defect.zone,
          type: defect.type,
          severity: defect.severity || 'low',
          notes: defect.notes || null
        })),
        meta: {
          photos_count: uploadedPhotos.length
        }
      };

      // Use advanceToStep which both saves data AND completes the step
      // This replaces the separate completeStep + advanceToStep calls
      await advanceToStep('inspection', collectedData, uploadedPhotos.length > 0 ? uploadedPhotos : undefined);

      const nextStepId = getNextPPFStepId(steps, 'inspection');
      if (nextStepId) {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`);
      } else {
        router.push(`/tasks/${taskId}/workflow/ppf`);
      }
    } catch (error) {
      console.error('Error completing inspection:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const stepIndex = steps.findIndex(step => step.id === 'inspection');
  const stepLabel = stepIndex >= 0 ? `${t('interventions.steps')} ${stepIndex + 1}/${steps.length}` : t('interventions.steps');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Search className="h-8 w-8 text-blue-500" />
          </div>
          <div className="text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-medium">
            {stepLabel}
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Inspection du véhicule
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Documentez les dommages pré-existants et l&apos;état du véhicule avant l&apos;installation
        </p>
      </motion.div>

      {/* Main Content Grid */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        variants={containerVariants}
      >
        {/* Vehicle Diagram */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground group-hover:text-blue-400 transition-colors">
                    Diagramme du véhicule
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Cliquez sur les zones pour signaler les défauts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-[hsl(var(--rpma-surface))] rounded-lg p-4 border border-[hsl(var(--rpma-border))]">
                <VehicleDiagram
                  defects={defects}
                  onDefectAdd={(defect) => setDefects([...defects, defect])}
                  onDefectRemove={(defectId) => setDefects(defects.filter(d => d.id !== defectId))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Photos */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Camera className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-green-400 transition-colors">
                      Photos d&apos;inspection
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Documentation visuelle (optionnel)
                    </CardDescription>
                  </div>
                </div>
                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-400">
                      {uploadedPhotos.length} photo{uploadedPhotos.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <PhotoUpload
                taskId={taskId}
                stepId="inspection"
                type="before"
                maxFiles={6}
                minPhotos={0}
                onUploadComplete={(urls: string[]) => setUploadedPhotos(urls)}
                title="Photos d'inspection"
                uploadButtonText="Ajouter des photos"
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Defects List */}
      {defects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Défauts identifiés ({defects.length})
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Zones nécessitant une attention particulière
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {defects.map((defect, index) => (
                  <motion.div
                    key={defect.id}
                    className="flex items-center justify-between p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]/30 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-foreground text-sm">{defect.zone}</span>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          {defect.type}
                        </span>
                      </div>
                      {defect.notes && (
                        <p className="text-muted-foreground text-sm truncate">{defect.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefects(defects.filter(d => d.id !== defect.id))}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-3 shrink-0"
                    >
                      {t('common.remove')}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-[hsl(var(--rpma-border))]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="text-center sm:text-left">
          <p className="text-muted-foreground text-sm">
            {defects.length === 0
              ? "Aucun défaut détecté - prêt pour la préparation"
              : `${defects.length} défaut${defects.length > 1 ? 's' : ''} documenté${defects.length > 1 ? 's' : ''} - attention requise`
            }
          </p>
        </div>
        <Button
          onClick={handleCompleteInspection}
          disabled={isCompleting}
          className="min-w-40 h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/30"
        >
          <span className="flex items-center justify-center space-x-2">
            <span>{isCompleting ? t('common.loading') : t('common.next')}</span>
            <ArrowRight className={`h-5 w-5 transition-transform ${isCompleting ? '' : 'group-hover:translate-x-1'}`} />
          </span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
