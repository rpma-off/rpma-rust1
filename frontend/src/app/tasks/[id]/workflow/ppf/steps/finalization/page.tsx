'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, PenTool, User, Award, Camera, MessageSquare, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { usePPFWorkflow } from '@/contexts/PPFWorkflowContext';
import { SignatureCapture } from '@/components/SignatureCapture';
import { PhotoUpload } from '@/components/PhotoUpload/PhotoUpload';

interface QCItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

type FinalizationCollectedData = {
  qc_checklist?: Record<string, boolean>;
  customer_signature?: {
    svg_data?: string | null;
    signatory?: string | null;
    customer_comments?: string | null;
  };
};

const defaultQCChecklist: QCItem[] = [
  {
    id: 'edges_sealed',
    label: 'Bords scellÃ©s',
    description: 'VÃ©rifier que tous les bords du film sont correctement scellÃ©s',
    completed: false
  },
  {
    id: 'no_bubbles',
    label: 'Aucune bulle',
    description: 'S\'assurer qu\'il n\'y a pas de bulles d\'air sous le film',
    completed: false
  },
  {
    id: 'smooth_surface',
    label: 'Surface lisse',
    description: 'La surface du film est uniforme et sans rides',
    completed: false
  },
  {
    id: 'alignment_correct',
    label: 'Alignement correct',
    description: 'Le film est correctement alignÃ© avec les contours du vÃ©hicule',
    completed: false
  },
  {
    id: 'no_dust',
    label: 'Pas de poussiÃ¨re',
    description: 'Aucune poussiÃ¨re ou particule visible sous le film',
    completed: false
  },
  {
    id: 'cure_time_respected',
    label: 'Temps de polymÃ©risation respectÃ©',
    description: 'Le film a eu suffisamment de temps pour polymÃ©riser',
    completed: false
  }
];

export default function FinalizationStepPage() {
  const router = useRouter();
  const { taskId, finalizeIntervention, stepsData } = usePPFWorkflow();
  const [isCompleting, setIsCompleting] = useState(false);


  const [qcChecklist, setQcChecklist] = useState<QCItem[]>(defaultQCChecklist);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatoryName, setSignatoryName] = useState('');
  const [customerComments, setCustomerComments] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Load existing data when component mounts
  useEffect(() => {
    // Find the finalization step data
    const finalizationStep = stepsData?.steps?.find((step) => step.step_type === 'finalization');
    const collectedData = finalizationStep?.collected_data as FinalizationCollectedData | undefined;
    if (collectedData) {
      // Restore QC checklist from collected_data
      if (collectedData.qc_checklist) {
        const restoredQCChecklist = defaultQCChecklist.map(item => ({
          ...item,
          completed: collectedData.qc_checklist?.[item.id] || false
        }));
        setQcChecklist(restoredQCChecklist);
      }

      // Restore signature data
      if (collectedData.customer_signature) {
        const signature = collectedData.customer_signature;
        setSignatureData(signature.svg_data || '');
        setSignatoryName(signature.signatory || '');
        setCustomerComments(signature.customer_comments || '');
      }

      // Restore photos from photo_urls if available
      if (finalizationStep?.photo_urls && Array.isArray(finalizationStep.photo_urls)) {
        setUploadedPhotos(finalizationStep.photo_urls);
      }
    }
  }, [stepsData]);

  const handleQcChange = (itemId: string, completed: boolean) => {
    setQcChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed } : item
      )
    );
  };

  const handleSignatureCapture = (data: string) => {
    setSignatureData(data);
  };

  const allQcCompleted = qcChecklist.every(item => item.completed);
  const signatureValid = signatureData !== '' && signatoryName.trim() !== '';

  const canComplete = allQcCompleted && signatureValid;

  const handleCompleteFinalization = async () => {
    setIsCompleting(true);
    try {
      const collectedData = {
        qc_checklist: qcChecklist.reduce((acc, item) => {
          acc[item.id] = item.completed;
          return acc;
        }, {} as Record<string, boolean>),
        customer_signature: {
          svg_data: signatureData,
          signatory: signatoryName,
          customer_comments: customerComments
        },
        quality_score: 95, // Default quality score
        final_observations: ['Intervention PPF terminÃ©e avec succÃ¨s']
      };

      // Finalize the intervention with collected data and photos
      await finalizeIntervention(collectedData, uploadedPhotos.length > 0 ? uploadedPhotos : undefined);

      // Navigate to the completed page
      router.push(`/tasks/${taskId}/completed`);
    } catch (error) {
      console.error('Error completing finalization:', error);
      toast.error('Erreur lors de la finalisation');
    }
  };

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
          <div className="p-3 bg-emerald-500/10 rounded-full">
            <Trophy className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="text-sm bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-medium">
            Ã‰tape 4 sur 4
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Finalisation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          ContrÃ´le qualitÃ© final et validation client pour une intervention rÃ©ussie
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
          <span className="text-sm text-green-400">Installation</span>
        </div>
        <div className="w-8 h-px bg-emerald-500"></div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">4</span>
          </div>
          <span className="text-sm font-medium text-emerald-400">Finalisation</span>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
        variants={containerVariants}
      >
        {/* Quality Control Checklist */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))] h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Award className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-emerald-400 transition-colors">
                      ContrÃ´le QualitÃ©
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      VÃ©rifications finales avant validation
                    </CardDescription>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  allQcCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {qcChecklist.filter(item => item.completed).length}/{qcChecklist.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {qcChecklist.map((item, index) => (
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
                      onCheckedChange={(checked) => handleQcChange(item.id, checked as boolean)}
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

        {/* Customer Information & Signature */}
        <motion.div variants={cardVariants}>
          <Card className="group hover:shadow-[var(--rpma-shadow-soft)] transition-all duration-300 border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))] h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <PenTool className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground group-hover:text-purple-400 transition-colors">
                      Signature Client
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Validation et signature de satisfaction
                    </CardDescription>
                  </div>
                </div>
                {signatureValid && (
                  <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-400">SignÃ©</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                {/* Signatory Name */}
                <div className="space-y-3">
                  <Label htmlFor="signatory-name" className="flex items-center text-foreground font-medium">
                    <User className="h-4 w-4 mr-2 text-blue-400" />
                    Nom du signataire
                  </Label>
                  <Input
                    id="signatory-name"
                    placeholder="Nom complet du client"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className={`bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] h-12 text-base transition-all duration-200 ${
                      signatoryName.trim() ? 'border-green-500/50 focus:border-green-500' : 'focus:border-purple-500/50'
                    }`}
                  />
                </div>

                {/* Customer Comments */}
                <div className="space-y-3">
                  <Label htmlFor="customer-comments" className="flex items-center text-foreground font-medium">
                    <MessageSquare className="h-4 w-4 mr-2 text-cyan-400" />
                    Commentaires client (optionnel)
                  </Label>
                  <textarea
                    id="customer-comments"
                    placeholder="Commentaires ou remarques du client..."
                    value={customerComments}
                    onChange={(e) => setCustomerComments(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg text-foreground placeholder-border-light resize-none transition-all duration-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
                  />
                </div>

                {/* Signature Capture */}
                <div className="space-y-3">
                  <Label className="flex items-center text-foreground font-medium">
                    <PenTool className="h-4 w-4 mr-2 text-purple-400" />
                    Signature digitale
                  </Label>
                  <div className="border border-[hsl(var(--rpma-border))] rounded-lg p-4 bg-[hsl(var(--rpma-surface))] hover:border-[hsl(var(--rpma-teal))]/30 transition-colors duration-200">
                    <SignatureCapture
                      onSignatureCapture={handleSignatureCapture}
                      width={350}
                      height={150}
                      className="dark-signature"
                    />
                  </div>
                  {signatureData && (
                    <motion.div
                      className="flex items-center space-x-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-400 font-medium">Signature capturÃ©e</span>
                    </motion.div>
                  )}
                </div>
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
                      Photos de finalisation
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Documentation du rÃ©sultat final (optionnel)
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
                stepId="finalization"
                type="before"
                maxFiles={8}
                minPhotos={0}
                onUploadComplete={(urls) => setUploadedPhotos(urls)}
                title="Photos de finalisation"
                uploadButtonText="Ajouter des photos"
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Completion Summary */}
      {canComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/10">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <motion.div
                  className="flex items-center justify-center space-x-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                >
                  <div className="p-3 bg-emerald-500/20 rounded-full">
                    <Trophy className="h-8 w-8 text-emerald-400" />
                  </div>
                  <CheckCircle className="h-12 w-12 text-emerald-400" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Intervention terminÃ©e avec succÃ¨s !
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Toutes les vÃ©rifications qualitÃ© sont validÃ©es et la signature client est capturÃ©e.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-400">ContrÃ´le qualitÃ©: {qcChecklist.filter(item => item.completed).length}/{qcChecklist.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-400">Signature client: ValidÃ©e</span>
                  </div>
                </div>
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
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="text-center sm:text-left">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              canComplete ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <p className={`text-sm font-medium ${
              canComplete ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {canComplete ? 'PrÃªt pour finalisation' : 'ComplÃ©tez les vÃ©rifications requises'}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            QC: {qcChecklist.filter(item => item.completed).length}/{qcChecklist.length} â€¢
            Signature: {signatureValid ? 'ValidÃ©e' : 'Requise'}
          </p>
        </div>
        <Button
          onClick={handleCompleteFinalization}
          disabled={!canComplete || isCompleting}
          className={`min-w-48 h-12 text-base font-medium transition-all duration-300 ${
            canComplete
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30'
              : 'bg-gray-600 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center justify-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>{isCompleting ? 'Finalisation...' : 'Terminer l\'intervention'}</span>
          </span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
