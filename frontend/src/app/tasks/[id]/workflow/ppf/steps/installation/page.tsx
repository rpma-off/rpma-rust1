'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { ArrowRight, Play, Pause, Square, Package, Timer, CheckCircle2, Camera, Layers } from 'lucide-react';
import { usePPFWorkflow } from '@/domains/interventions';
import { getNextPPFStepId, getPPFStepPath } from '@/domains/interventions';
import { PhotoUpload } from '@/domains/workflow';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface ZoneTimer {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  startTime: number | null;
  endTime: number | null;
  duration: number; // in minutes
  materialLot: string;
}

type InstallationCollectedData = {
  zones?: Array<{
    name: string;
    status?: ZoneTimer['status'];
    duration_min?: number;
    material_lot?: string;
  }>;
};

export default function InstallationStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { taskId, advanceToStep, task, stepsData, steps, currentStep } = usePPFWorkflow();
  const [isCompleting, setIsCompleting] = useState(false);

  const [zones, setZones] = useState<ZoneTimer[]>([]);
  const [globalMaterialLot, setGlobalMaterialLot] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!steps.length) return;
    const hasInstallation = steps.some(step => step.id === 'installation');
    if (!hasInstallation) {
      const targetId = currentStep?.id ?? steps[0]?.id;
      const targetPath = targetId ? getPPFStepPath(targetId) : null;
      router.replace(
        targetPath ? `/tasks/${taskId}/workflow/ppf/${targetPath}` : `/tasks/${taskId}/workflow/ppf`
      );
    }
  }, [steps, currentStep, router, taskId]);

  // Initialize zones from task data and load existing data
  useEffect(() => {
    if (task?.ppf_zones && zones.length === 0) {
      const initialZones = task.ppf_zones.map((zoneName: string) => ({
        name: zoneName,
        status: 'pending' as const,
        startTime: null,
        endTime: null,
        duration: 0,
        materialLot: ''
      }));
      setZones(initialZones);
    }
  }, [task?.ppf_zones, zones.length]);

  // Load existing data when component mounts
  useEffect(() => {
    // Find the installation step data
    const installationStep = stepsData?.steps?.find((step) => step.step_type === 'installation');
    const collectedData = installationStep?.collected_data as InstallationCollectedData | undefined;
    if (collectedData) {
      // Restore zones data from collected_data
      if (collectedData.zones) {
        const restoredZones = collectedData.zones.map((zoneData) => ({
          name: zoneData.name,
          status: zoneData.status || 'pending',
          startTime: null,
          endTime: null,
          duration: zoneData.duration_min || 0,
          materialLot: zoneData.material_lot || ''
        }));
        setZones(restoredZones);
      }

      // Restore photos from photo_urls if available
      if (installationStep?.photo_urls && Array.isArray(installationStep.photo_urls)) {
        setUploadedPhotos(installationStep.photo_urls);
      }
    }
  }, [stepsData]);

  // Update current time every second for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-populate material lots from global material lot
  useEffect(() => {
    if (globalMaterialLot.trim()) {
      setZones(prev => prev.map(zone => ({
        ...zone,
        materialLot: zone.materialLot || globalMaterialLot // Only set if empty
      })));
    }
  }, [globalMaterialLot]);

  const startTimer = (zoneIndex: number) => {
    setZones(prev => prev.map((zone, index) => {
      if (index === zoneIndex && zone.status === 'pending') {
        return {
          ...zone,
          status: 'in_progress',
          startTime: Date.now()
        };
      }
      return zone;
    }));
  };

  const pauseTimer = (zoneIndex: number) => {
    setZones(prev => prev.map((zone, index) => {
      if (index === zoneIndex && zone.status === 'in_progress' && zone.startTime) {
        const elapsed = Math.floor((currentTime - zone.startTime) / 1000 / 60); // minutes
        return {
          ...zone,
          status: 'pending',
          duration: zone.duration + elapsed,
          startTime: null
        };
      }
      return zone;
    }));
  };

  const stopTimer = (zoneIndex: number) => {
    setZones(prev => prev.map((zone, index) => {
      if (index === zoneIndex && zone.status === 'in_progress' && zone.startTime) {
        const elapsed = Math.floor((currentTime - zone.startTime) / 1000 / 60); // minutes
        return {
          ...zone,
          status: 'completed',
          duration: zone.duration + elapsed,
          endTime: currentTime,
          startTime: null
        };
      }
      return zone;
    }));
  };

  const updateMaterialLot = (zoneIndex: number, materialLot: string) => {
    setZones(prev => prev.map((zone, index) =>
      index === zoneIndex ? { ...zone, materialLot } : zone
    ));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const allZonesCompleted = zones.every(zone => zone.status === 'completed');
  const allMaterialLotsFilled = zones.every(zone => zone.materialLot.trim() !== '');
  const canProceed = allZonesCompleted && allMaterialLotsFilled;

  const handleCompleteInstallation = async () => {
    setIsCompleting(true);
    try {
      const collectedData = {
        zones: zones.map(zone => ({
          name: zone.name,
          status: zone.status,
          duration_min: zone.duration,
          material_lot: zone.materialLot
        }))
      };

      await advanceToStep('installation', collectedData, uploadedPhotos.length > 0 ? uploadedPhotos : undefined);

      const nextStepId = getNextPPFStepId(steps, 'installation');
      if (nextStepId) {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`);
      } else {
        router.push(`/tasks/${taskId}/workflow/ppf`);
      }
    } catch (error) {
      console.error('Error completing installation:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!task) {
    return <div>{t('common.loading')}</div>;
  }

  const stepIndex = steps.findIndex(step => step.id === 'installation');
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
          <div className="p-3 bg-orange-500/10 rounded-full">
            <Layers className="h-8 w-8 text-orange-500" />
          </div>
          <div className="text-sm bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full font-medium">
            {stepLabel}
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Installation du PPF
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Application professionnelle du film protecteur avec suivi pr�cis des zones
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
        variants={containerVariants}
      >
        {/* Global Material Lot */}
        <motion.div variants={cardVariants}>
        <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Package className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-foreground group-hover:text-indigo-400 transition-colors">
                  Lot de Mat�riel Global
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Num�ro de lot du film PPF utilis� (optionnel)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-w-sm">
              <Input
                placeholder="Ex: LOT-2024-001"
                value={globalMaterialLot}
                onChange={(e) => setGlobalMaterialLot(e.target.value)}
                className="bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] h-12 text-base transition-all duration-200 focus:border-indigo-500/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Ce num�ro sera utilis� comme valeur par d�faut pour toutes les zones
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Zone Timers */}
      <motion.div variants={cardVariants}>
        <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Timer className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground group-hover:text-orange-400 transition-colors">
                    Suivi des Zones
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Chronom�trage pr�cis de l&apos;application par zone
                  </CardDescription>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                allZonesCompleted
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {zones.filter(z => z.status === 'completed').length}/{zones.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {zones.map((zone, index) => (
                <motion.div
                  key={zone.name}
                  className={`p-6 rounded-lg border transition-all duration-200 ${
                    zone.status === 'completed'
                      ? 'bg-green-500/5 border-green-500/30 hover:bg-green-500/10'
                      : zone.status === 'in_progress'
                      ? 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10'
                      : 'bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]/30 hover:bg-[hsl(var(--rpma-surface))]'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        zone.status === 'completed' ? 'bg-green-500' :
                        zone.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <h3 className="text-lg font-semibold text-foreground">{zone.name}</h3>
                      <Badge className={`text-xs ${getZoneStatusColor(zone.status)}`}>
                        {zone.status === 'pending' ? 'En attente' :
                         zone.status === 'in_progress' ? 'En cours' : 'Termin�'}
                      </Badge>
                    </div>
                    {zone.duration > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Dur�e totale</p>
                        <p className="text-lg font-mono font-bold text-foreground">
                          {formatDuration(zone.duration)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timer Display */}
                  {zone.status === 'in_progress' && zone.startTime && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-400">Chronom�tre actif</span>
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-300">
                          {formatDuration(Math.floor((currentTime - zone.startTime) / 1000 / 60) + zone.duration)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Material Lot Input */}
                  <div className="mb-4">
                    <Label htmlFor={`material-${index}`} className="text-sm font-medium text-foreground mb-2 block">
                      Lot de Mat�riel
                    </Label>
                    <Input
                      id={`material-${index}`}
                      placeholder={globalMaterialLot || "Ex: LOT-2024-001"}
                      value={zone.materialLot}
                      onChange={(e) => updateMaterialLot(index, e.target.value)}
                      className="bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] h-10 text-sm transition-all duration-200 focus:border-orange-500/50"
                      disabled={zone.status === 'completed'}
                    />
                  </div>

                  {/* Timer Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      {zone.status === 'pending' && (
                        <Button
                          onClick={() => startTimer(index)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          D�marrer
                        </Button>
                      )}

                      {zone.status === 'in_progress' && (
                        <>
                          <Button
                            onClick={() => pauseTimer(index)}
                            size="sm"
                            variant="outline"
                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          <Button
                            onClick={() => stopTimer(index)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Terminer
                          </Button>
                        </>
                      )}

                      {zone.status === 'completed' && (
                        <div className="flex items-center space-x-2 text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Zone termin�e</span>
                        </div>
                      )}
                    </div>

                    {zone.status === 'completed' && zone.duration > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Dur�e finale</p>
                        <p className="text-sm font-mono font-bold text-green-400">
                          {formatDuration(zone.duration)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Photo Documentation */}
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
                    Photos d&apos;installation
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Documentation visuelle de l&apos;application (optionnel)
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
              stepId="installation"
              type="before"
              maxFiles={12}
              minPhotos={0}
              onUploadComplete={(urls: string[]) => setUploadedPhotos(urls)}
              title="Photos d'installation"
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
              {canProceed ? 'Pr�t pour la finalisation' : 'Compl�tez toutes les zones'}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Zones: {zones.filter(z => z.status === 'completed').length}/{zones.length} �
            Lots: {zones.filter(z => z.materialLot.trim() !== '').length}/{zones.length}
          </p>
        </div>
        <Button
          onClick={handleCompleteInstallation}
          disabled={!canProceed || isCompleting}
          className={`min-w-40 h-12 text-base font-medium transition-all duration-300 ${
            canProceed
              ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/25 hover:shadow-xl hover:shadow-orange-600/30'
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
