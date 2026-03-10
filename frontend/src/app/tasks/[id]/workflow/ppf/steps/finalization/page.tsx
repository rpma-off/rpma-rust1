'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PpfChecklist,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  getPPFStepPath,
  getNextPPFStepId,
  usePpfWorkflow,
} from '@/domains/interventions';
import type { StepType } from '@/lib/backend';
import { buildStepExportPayload, downloadJsonFile, getEffectiveStepData } from '@/domains/interventions';

const FINAL_CHECKLIST = [
  {
    id: 'edges_sealed',
    title: 'Bords scellés',
    description: 'Vérifier l’adhérence sur tous les contours',
    required: true,
  },
  {
    id: 'no_bubbles',
    title: 'Aucune bulle',
    description: 'Contrôle visuel complet',
    required: true,
  },
  {
    id: 'smooth_surface',
    title: 'Surface lisse',
    description: 'Pas de plis ni sur-épaisseurs',
    required: true,
  },
  {
    id: 'alignment_ok',
    title: 'Alignement correct',
    description: 'Respect des lignes et découpes',
    required: true,
  },
  {
    id: 'clean_finish',
    title: 'Finition propre',
    description: 'Nettoyage final effectué',
    required: true,
  },
  {
    id: 'client_briefed',
    title: 'Consignes client',
    description: 'Entretien et temps de séchage rappelés',
    required: true,
  },
];

type FinalizationDraft = {
  checklist?: Record<string, boolean>;
  notes?: string;
};

export default function FinalizationStepPage() {
  const router = useRouter();
  const { taskId, steps, getStepRecord, saveDraft, validateStep, intervention } = usePpfWorkflow();
  const stepRecord = getStepRecord('finalization' as StepType);
  const autosaveReady = useRef(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const hasHydratedFromServerRef = useRef(false);

  useEffect(() => {
    if (!stepRecord) return;
    const collected = getEffectiveStepData(stepRecord) as FinalizationDraft;
    setChecklist(collected.checklist ?? {});
    setNotes(collected.notes ?? '');
    setPhotos(stepRecord?.photo_urls ?? []);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
  }, [stepRecord, stepRecord?.updated_at, stepRecord?.collected_data, stepRecord?.photo_urls]);

  useEffect(() => {
    if (!hasHydratedFromServerRef.current) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      void saveDraft(
        'finalization',
        {
          checklist,
          notes,
        },
        { photos }
      );
    }, 800);
    return () => clearTimeout(timeout);
  }, [checklist, notes, photos, saveDraft]);

  const checklistCount = FINAL_CHECKLIST.filter((item) => checklist[item.id]).length;
  const checklistTotal = FINAL_CHECKLIST.length;
  const requiredPhotos = 3;
  const canValidate = checklistCount === checklistTotal && photos.length >= requiredPhotos;

  const summaryText = `${checklistCount}/${checklistTotal} checklist · ${photos.length}/${requiredPhotos} photos`;

  const stepLabel = `ÉTAPE 4 / ${steps.length || 4}`;
  const completedBadges = steps
    .filter((step) => step.status === 'completed')
    .map((step) => `✓ ${step.title}`);
  const badge = completedBadges.length ? completedBadges.join(' · ') : undefined;

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await saveDraft('finalization', { checklist, notes }, { photos, showToast: true, invalidate: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!canValidate || isValidating) return;
    setIsValidating(true);
    try {
      await validateStep('finalization', { checklist, notes }, photos);
      const nextStepId = getNextPPFStepId(steps, 'finalization');
      if (nextStepId) {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`);
      } else {
        router.push(`/tasks/${taskId}/workflow/ppf`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleOpenFinalizeDialog = () => {
    if (!canValidate || isValidating) return;
    setIsFinalizeDialogOpen(true);
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizeDialogOpen(false);
    await handleValidate();
  };

  const handleDownloadStepData = () => {
    if (!intervention?.id || !stepRecord) return;
    const payload = buildStepExportPayload(taskId, intervention.id, stepRecord);
    const nowDate = new Date().toISOString().split('T')[0];
    downloadJsonFile(payload, `intervention-${intervention.id}-step-finalization-${nowDate}.json`);
  };

  return (
    <>
      <PpfWorkflowLayout
        stepId="finalization"
        actionBar={{
          summary: summaryText,
          onSaveDraft: handleSaveDraft,
          onDownloadData: handleDownloadStepData,
          onValidate: handleOpenFinalizeDialog,
          validateLabel: 'Finalisation',
          saveDisabled: isSaving,
          downloadDisabled: !stepRecord,
          validateDisabled: !canValidate || isValidating,
        }}
      >
        <PpfStepHero
          stepLabel={stepLabel}
          title="🏁 Finalisation et Validation"
          subtitle="Contrôle qualité final et validation client"
          badge={badge}
          rightSlot={
            <div>
              <div className="text-[10px] uppercase font-semibold text-white/70">Étape finale</div>
              <div className="text-2xl font-extrabold">~8 min</div>
              <div className="text-[10px] text-white/60">Finalisation</div>
            </div>
          }
          progressSegments={{ total: 4, filled: 4 }}
          gradientClassName="bg-gradient-to-r from-emerald-600 to-emerald-800"
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">✅ Checklist Finale</div>
                <span className="rounded-full bg-[hsl(var(--rpma-surface))] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {checklistCount} / {checklistTotal}
                </span>
              </div>
              <PpfChecklist
                items={FINAL_CHECKLIST}
                values={checklist}
                onToggle={(id) => setChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
              />
            </div>

            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <label className="mb-2 block text-xs font-semibold text-foreground">Notes de finalisation</label>
              <textarea
                className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observations finales, remarques client..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <PpfPhotoGrid
                taskId={taskId}
                interventionId={intervention?.id}
                stepId="finalization"
                type="after"
                photos={photos}
                minPhotos={requiredPhotos}
                onChange={setPhotos}
                title="📷 Photos de finalisation"
                hint="Vue avant · latérales · arrière"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
              Finalisez l’intervention une fois toutes les vérifications et photos validées.
            </div>
          </div>
        </div>
      </PpfWorkflowLayout>

      <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finaliser l&apos;intervention ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Assurez-vous que toutes les étapes sont complètes et que les photos ont
              était prises.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinalize}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
