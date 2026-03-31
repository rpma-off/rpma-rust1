'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StepType } from '@/lib/backend';
import {
  PpfChecklist,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  getNextPPFStepId,
  getPPFStepPath,
  usePpfWorkflow,
} from '@/domains/interventions';
import { buildStepExportPayload, downloadJsonFile, getEffectiveStepData } from '@/domains/interventions';
import {
  SURFACE_CHECKLIST,
  CUT_CHECKLIST,
  MATERIALS_CHECKLIST,
  CUT_ROWS,
  type PreparationDraft,
} from './preparation.data';

export default function PreparationStepPage() {
  const router = useRouter();
  const { taskId, steps, getStepRecord, saveDraft, validateStep, intervention } = usePpfWorkflow();
  const stepRecord = getStepRecord('preparation' as StepType);
  const autosaveReady = useRef(false);

  const [surfaceChecklist, setSurfaceChecklist] = useState<Record<string, boolean>>({});
  const [cutChecklist, setCutChecklist] = useState<Record<string, boolean>>({});
  const [materialsChecklist, setMaterialsChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const hasHydratedFromServerRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const lastHydratedVersionRef = useRef<string | null>(null);

  const currentDraft = useMemo(
    () => ({
      surfaceChecklist,
      cutChecklist,
      materialsChecklist,
      notes,
    }),
    [surfaceChecklist, cutChecklist, materialsChecklist, notes]
  );

  const currentSignature = useMemo(
    () => JSON.stringify({ draft: currentDraft, photos }),
    [currentDraft, photos]
  );

  useEffect(() => {
    if (!stepRecord) return;
    const collected = getEffectiveStepData(stepRecord) as PreparationDraft;
    const serverDraft = {
      surfaceChecklist: collected.surfaceChecklist ?? {},
      cutChecklist: collected.cutChecklist ?? {},
      materialsChecklist: collected.materialsChecklist ?? {},
      notes: collected.notes ?? '',
    };
    const serverPhotos = stepRecord?.photo_urls ?? [];
    const serverSignature = JSON.stringify({ draft: serverDraft, photos: serverPhotos });
    const serverVersion = `${stepRecord.id}:${String(stepRecord.updated_at ?? '')}`;
    const hasUnsavedLocalChanges =
      hasHydratedFromServerRef.current && currentSignature !== lastPersistedSignatureRef.current;
    const serverIsBehindPersisted =
      hasHydratedFromServerRef.current &&
      lastPersistedSignatureRef.current !== null &&
      serverSignature !== lastPersistedSignatureRef.current &&
      serverVersion === lastHydratedVersionRef.current;

    if (hasUnsavedLocalChanges || serverIsBehindPersisted) {
      return;
    }

    setSurfaceChecklist(serverDraft.surfaceChecklist);
    setCutChecklist(serverDraft.cutChecklist);
    setMaterialsChecklist(serverDraft.materialsChecklist);
    setNotes(serverDraft.notes);
    setPhotos(serverPhotos);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
    lastPersistedSignatureRef.current = serverSignature;
    lastHydratedVersionRef.current = serverVersion;
  }, [stepRecord, stepRecord?.updated_at, stepRecord?.collected_data, stepRecord?.photo_urls, currentSignature]);

  const saveNow = useCallback(
    async (options?: { showToast?: boolean; invalidate?: boolean }) => {
      if (!stepRecord) {
        return false;
      }

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }

      if (currentSignature === lastPersistedSignatureRef.current) {
        return false;
      }

      await saveDraft('preparation', currentDraft, {
        photos,
        showToast: options?.showToast,
        invalidate: options?.invalidate,
      });

      lastPersistedSignatureRef.current = currentSignature;
      return true;
    },
    [currentDraft, currentSignature, photos, saveDraft, stepRecord]
  );

  useEffect(() => {
    if (!hasHydratedFromServerRef.current) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    if (currentSignature === lastPersistedSignatureRef.current) {
      return;
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      void saveNow();
    }, 800);
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [currentSignature, saveNow]);

  const surfaceCompleted = SURFACE_CHECKLIST.filter((item) => surfaceChecklist[item.id]).length;
  const surfaceTotal = SURFACE_CHECKLIST.length;
  const cutCompleted = CUT_CHECKLIST.filter((item) => cutChecklist[item.id]).length;
  const cutTotal = CUT_CHECKLIST.length;
  const canValidate = surfaceCompleted === surfaceTotal && cutCompleted === cutTotal;

  const summaryText = `${surfaceCompleted}/${surfaceTotal} dégraissage · ${cutCompleted}/${cutTotal} films découpés`;

  const stepLabel = `ÉTAPE 2 / ${steps.length || 4}`;
  const inspectionDone = steps.find((step) => step.id === 'inspection')?.status === 'completed';

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await saveNow({ showToast: true, invalidate: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!canValidate || isValidating) return;
    setIsValidating(true);
    try {
      await validateStep('preparation', { surfaceChecklist, cutChecklist, materialsChecklist, notes }, photos);
      const nextStepId = getNextPPFStepId(steps, 'preparation');
      if (nextStepId) {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`);
      } else {
        router.push(`/tasks/${taskId}/workflow/ppf`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadStepData = () => {
    if (!intervention?.id || !stepRecord) return;
    const payload = buildStepExportPayload(taskId, intervention.id, stepRecord);
    const nowDate = new Date().toISOString().split('T')[0];
    downloadJsonFile(payload, `intervention-${intervention.id}-step-preparation-${nowDate}.json`);
  };

  return (
    <PpfWorkflowLayout
      stepId="preparation"
      actionBar={{
        summary: summaryText,
        onSaveDraft: handleSaveDraft,
        onDownloadData: handleDownloadStepData,
        onValidate: handleValidate,
        validateLabel: 'Préparation',
        saveDisabled: isSaving,
        downloadDisabled: !stepRecord,
        validateDisabled: !canValidate || isValidating,
      }}
      draftGuard={{
        hasPendingDraft:
          hasHydratedFromServerRef.current && currentSignature !== lastPersistedSignatureRef.current,
        saveNow,
      }}
    >
      <PpfStepHero
        stepLabel={stepLabel}
        title="Préparation de surface"
        subtitle="Préparation méticuleuse des zones et contrôle des matériaux"
        badge={inspectionDone ? '✓ Inspection' : undefined}
        rightSlot={
          <div>
            <div className="text-[10px] uppercase font-semibold text-white/70">Durée estimée</div>
            <div className="text-2xl font-extrabold">~18 min</div>
            <div className="text-[10px] text-white/60">Étape 2</div>
          </div>
        }
        progressSegments={{ total: 4, filled: 2 }}
        gradientClassName="bg-gradient-to-r from-violet-500 to-purple-700"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Checklist de préparation</div>
              <span className="rounded-full bg-[hsl(var(--rpma-surface))] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {surfaceCompleted} / {surfaceTotal}
              </span>
            </div>
            <PpfChecklist
              items={SURFACE_CHECKLIST}
              values={surfaceChecklist}
              onToggle={(id) => setSurfaceChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-foreground">Pré-découpe du film PPF</div>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--rpma-border))]">
              <div className="grid grid-cols-[2fr_70px_70px_90px] gap-3 bg-[hsl(var(--rpma-surface))] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span>Zone</span>
                <span>Surface</span>
                <span>Film</span>
                <span>Statut</span>
              </div>
              {CUT_ROWS.map((row) => {
                const isReady = Boolean(cutChecklist[row.id]);
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[2fr_70px_70px_90px] gap-3 border-t border-[hsl(var(--rpma-border))] px-3 py-2 text-xs"
                  >
                    <span>{row.label}</span>
                    <span>{row.surface}</span>
                    <span>{row.film}</span>
                    <span className={isReady ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {isReady ? '✓ Prêt' : 'À faire'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <PpfChecklist
                items={CUT_CHECKLIST}
                values={cutChecklist}
                onToggle={(id) => setCutChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-foreground">Vérification des matériaux</div>
            <PpfChecklist
              items={MATERIALS_CHECKLIST}
              values={materialsChecklist}
              onToggle={(id) => setMaterialsChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-semibold text-foreground">Notes de préparation</label>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observations sur la préparation..."
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <PpfPhotoGrid
              taskId={taskId}
              interventionId={intervention?.id}
              stepId="preparation"
              type="before"
              photos={photos}
              minPhotos={0}
              onChange={setPhotos}
              title="Photos de préparation"
              hint="Documentation visuelle (optionnel)"
            />
          </div>
        </div>
      </div>
    </PpfWorkflowLayout>
  );
}
