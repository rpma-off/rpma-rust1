'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { ArrowRight, CheckCircle, Thermometer, Droplets, Wrench, AlertTriangle, Camera } from 'lucide-react';
import { usePPFWorkflow } from '@/domains/interventions';
import { getNextPPFStepId, getPPFStepPath } from '@/domains/interventions';
import { PhotoUpload } from '@/shared/ui/PhotoUpload/PhotoUpload';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface PreparationChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface EnvironmentData {
  temperatureCelsius: number | null;
  humidityPercent: number | null;
}

type PreparationCollectedData = {
  checklist?: Record<string, boolean>;
  environment?: {
    temp_celsius?: number | null;
    humidity_percent?: number | null;
  };
};

const defaultChecklist: PreparationChecklistItem[] = [
  {
    id: 'wash',
    label: 'Lavage du véhicule',
    description: 'Nettoyage complet de la surface avec shampooing pH neutre',
    completed: false
  },
  {
    id: 'clay_bar',
    label: 'Clay Bar',
    description: 'Traitement avec clay bar pour éliminer les contaminants',
    completed: false
  },
  {
    id: 'degrease',
    label: 'Dégraissage',
    description: 'Application de dégraissant pour préparation de surface',
    completed: false
  },
  {
    id: 'masking',
    label: 'Masquage',
    description: 'Protection des zones non traitées (joints, poignées, etc.)',
    completed: false
  }
];

export default function PreparationStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { taskId, advanceToStep, stepsData, steps, currentStep } = usePPFWorkflow();
  const [isCompleting, setIsCompleting] = useState(false);

  const [checklist, setChecklist] = useState<PreparationChecklistItem[]>(defaultChecklist);
  const [environment, setEnvironment] = useState<EnvironmentData>({
    temperatureCelsius: null,
    humidityPercent: null
  });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!steps.length) return;
    const hasPreparation = steps.some(step => step.id === 'preparation');
    if (!hasPreparation) {
      const targetId = currentStep?.id ?? steps[0]?.id;
      const targetPath = targetId ? getPPFStepPath(targetId) : null;
      router.replace(
        targetPath ? `/tasks/${taskId}/workflow/ppf/${targetPath}` : `/tasks/${taskId}/workflow/ppf`
      );
    }
  }, [steps, currentStep, router, taskId]);

  // Load existing data when component mounts
  useEffect(() => {
    // Find preparation step data
    const preparationStep = stepsData?.steps?.find((step) => step.step_type === 'preparation');
    const collectedData = preparationStep?.collected_data as PreparationCollectedData | undefined;
    if (collectedData) {
      // Restore checklist from collected_data
      if (collectedData.checklist) {
        const restoredChecklist = defaultChecklist.map(item => ({
          ...item,
          completed: collectedData.checklist?.[item.id] || false
        }));
        setChecklist(restoredChecklist);
      }

      // Restore environment data
      if (collectedData.environment) {
        setEnvironment({
          temperatureCelsius: collectedData.environment.temp_celsius || null,
          humidityPercent: collectedData.environment.humidity_percent || null
        });
      }

      // Restore photos from photo_urls if available
      if (preparationStep?.photo_urls && Array.isArray(preparationStep.photo_urls)) {
        setUploadedPhotos(preparationStep.photo_urls);
      }
    }
  }, [stepsData]);

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed } : item
      )
    );
  };

  const handleEnvironmentChange = (field: keyof EnvironmentData, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEnvironment(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const allChecklistCompleted = checklist.every(item => item.completed);
  const environmentValid = environment.temperatureCelsius !== null &&
                          environment.humidityPercent !== null &&
                          environment.temperatureCelsius >= 10 && environment.temperatureCelsius <= 35 &&
                          environment.humidityPercent >= 20 && environment.humidityPercent <= 80;

  const canProceed = allChecklistCompleted && environmentValid;

  const handleCompletePreparation = async () => {
    if (isCompleting) return; // Prevent multiple calls
    
    setIsCompleting(true);
    try {
      const collectedData = {
        checklist: checklist.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.completed
        }), {}),
        environment: {
          temp_celsius: environment.temperatureCelsius,
          humidity_percent: environment.humidityPercent
        }
      };

      // Complete preparation step with collected data and photos
      await advanceToStep('preparation', collectedData, uploadedPhotos.length > 0 ? uploadedPhotos : undefined);

      const nextStepId = getNextPPFStepId(steps, 'preparation');
      if (nextStepId) {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`);
      } else {
        router.push(`/tasks/${taskId}/workflow/ppf`);
      }
    } catch (error) {
      console.error('Error completing preparation:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const stepIndex = steps.findIndex(step => step.id === 'preparation');
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
          <div className="p-3 bg-purple-500/10 rounded-full">
            <Wrench className="h-8 w-8 text-purple-500" />
          </div>
          <div className="text-sm bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full font-medium">
            {stepLabel}
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Préparation de surface
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Préparation méticuleuse de la surface et contrôle des conditions environnementales
        </p>
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        className="flex items-center justify-center space-x-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-400">Inspection</span>
        </div>
        <div className="w-8 h-px bg-purple-500"></div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">2</span>
          </div>
          <span className="text-sm font-medium text-purple-400">Préparation</span>
        </div>
        <div className="w-8 h-px bg-gray-600"></div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-gray-400">3</span>
          </div>
          <span className="text-sm text-gray-400">Installation</span>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
        variants={containerVariants}
      >
        {/* Preparation Checklist */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))] h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-purple-400 transition-colors">
                      Checklist de préparation
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Procédures de préparation de surface
                    </CardDescription>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  allChecklistCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {checklist.filter(item => item.completed).length}/{checklist.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className={`flex items-start space-x-4 p-4 rounded-lg border transition-all duration-200 ${
                      item.completed
                        ? 'bg-green-500/5 border-green-500/30 hover:bg-green-500/10'
                        : 'bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]/30 hover:bg-[hsl(var(--rpma-surface))]'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.completed}
                      onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                      className="mt-1 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={item.id}
                        className={`text-sm font-medium cursor-pointer block ${
                          item.completed ? 'text-green-400' : 'text-foreground'
                        }`}
                      >
                        {item.label}
                      </label>
                      <p className={`text-xs mt-1 leading-relaxed ${
                        item.completed ? 'text-[hsl(var(--rpma-teal))]' : 'text-muted-foreground'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                    {item.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Environment Data */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))] h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Thermometer className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-blue-400 transition-colors">
                      Conditions environnementales
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Contrôle des paramètres pour une application optimale
                    </CardDescription>
                  </div>
                </div>
                {environmentValid && (
                  <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-400">Optimal</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="temperature" className="flex items-center text-foreground font-medium">
                    <Thermometer className="h-4 w-4 mr-2 text-red-400" />
                    Température (°C)
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="10"
                    max="35"
                    step="0.1"
                    placeholder="22.5"
                    value={environment.temperatureCelsius || ''}
                    onChange={(e) => handleEnvironmentChange('temperatureCelsius', e.target.value)}
                    className={`bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] h-12 text-base transition-all duration-200 ${
                      environment.temperatureCelsius !== null &&
                      (environment.temperatureCelsius < 15 || environment.temperatureCelsius > 25)
                        ? 'border-yellow-500/50 focus:border-yellow-500'
                        : environment.temperatureCelsius !== null &&
                          environment.temperatureCelsius >= 15 && environment.temperatureCelsius <= 25
                        ? 'border-green-500/50 focus:border-green-500'
                        : ''
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Recommandé: 15-25°C
                    </p>
                    {environment.temperatureCelsius !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        environment.temperatureCelsius >= 15 && environment.temperatureCelsius <= 25
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {environment.temperatureCelsius >= 15 && environment.temperatureCelsius <= 25 ? 'Optimal' : 'Ajuster'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="humidity" className="flex items-center text-foreground font-medium">
                    <Droplets className="h-4 w-4 mr-2 text-blue-400" />
                    Humidité (%)
                  </Label>
                  <Input
                    id="humidity"
                    type="number"
                    min="20"
                    max="80"
                    step="1"
                    placeholder="45"
                    value={environment.humidityPercent || ''}
                    onChange={(e) => handleEnvironmentChange('humidityPercent', e.target.value)}
                    className={`bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] h-12 text-base transition-all duration-200 ${
                      environment.humidityPercent !== null &&
                      (environment.humidityPercent < 30 || environment.humidityPercent > 60)
                        ? 'border-yellow-500/50 focus:border-yellow-500'
                        : environment.humidityPercent !== null &&
                          environment.humidityPercent >= 30 && environment.humidityPercent <= 60
                        ? 'border-green-500/50 focus:border-green-500'
                        : ''
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Recommandé: 30-60%
                    </p>
                    {environment.humidityPercent !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        environment.humidityPercent >= 30 && environment.humidityPercent <= 60
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {environment.humidityPercent >= 30 && environment.humidityPercent <= 60 ? 'Optimal' : 'Ajuster'}
                      </span>
                    )}
                  </div>
                </div>

                {!environmentValid && (environment.temperatureCelsius !== null || environment.humidityPercent !== null) && (
                  <motion.div
                    className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-400 mb-1">
                          Conditions non optimales
                        </p>
                        <p className="text-sm text-yellow-300/80">
                          Les conditions environnementales sont hors des plages recommandées. L&apos;application du PPF peut être compromise.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Photo Documentation */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))] h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Camera className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-green-400 transition-colors">
                      Photos de préparation
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Documentation visuelle (optionnel)
                    </CardDescription>
                  </div>
                </div>
                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-500" />
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
                stepId="preparation"
                type="before"
                maxFiles={6}
                minPhotos={0}
                onUploadComplete={(urls) => setUploadedPhotos(urls)}
                title="Photos de préparation"
                uploadButtonText="Ajouter des photos"
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-[hsl(var(--rpma-border))]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="text-center sm:text-left">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              canProceed ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <p className={`text-sm font-medium ${
              canProceed ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {canProceed ? 'Prêt pour l\'installation' : 'Complétez toutes les étapes requises'}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Checklist: {checklist.filter(item => item.completed).length}/{checklist.length} •
            Environnement: {environmentValid ? 'Optimal' : 'À ajuster'}
          </p>
        </div>
        <Button
          onClick={handleCompletePreparation}
          disabled={!canProceed || isCompleting}
          className={`min-w-40 h-12 text-base font-medium transition-all duration-300 ${
            canProceed
              ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30'
              : 'bg-gray-600 cursor-not-allowed'
          }`}
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
