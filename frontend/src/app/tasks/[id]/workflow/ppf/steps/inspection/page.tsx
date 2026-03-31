'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { StepType } from '@/lib/backend';
import {
  PpfChecklist,
  PpfDefectsPanel,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  getNextPPFStepId,
  getPPFStepPath,
  usePpfWorkflow,
} from '@/domains/interventions';
import type { Defect } from '@/domains/interventions';
import {
  buildStepExportPayload,
  downloadJsonFile,
  getEffectiveStepData,
  getEffectiveStepNote,
} from '@/domains/interventions';
import { InspectionEnvironmentCard } from '@/domains/interventions/components/ppf/InspectionEnvironmentCard';
import { CHECKLIST_ITEMS, type InspectionDefect, type InspectionDraft } from './inspection.data';

const VehicleDiagram = dynamic(
  () => import('@/domains/interventions').then((mod) => ({ default: mod.VehicleDiagram })),
  {
    loading: () => (
      <div className="h-[400px] w-full rounded-lg border border-border bg-card animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Chargement du diagramme...</div>
      </div>
    ),
    ssr: false,
  }
);

export default function InspectionStepPage() {
  const router = useRouter();
  const { taskId, task, steps, getStepRecord, saveDraft, validateStep, intervention } = usePpfWorkflow();
  const stepRecord = getStepRecord('inspection' as StepType);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [defects, setDefects] = useState<InspectionDefect[]>([]);
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState({
    temp_celsius: intervention?.temperature_celsius ?? null,
    humidity_percent: intervention?.humidity_percentage ?? null,
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const autosaveReady = useRef(false);
  const hasHydratedFromServerRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const lastHydratedVersionRef = useRef<string | null>(null);

  const currentDraft = useMemo(
    () => ({
      checklist,
      defects,
      notes,
      environment,
    }),
    [checklist, defects, notes, environment]
  );

  const currentSignature = useMemo(
    () => JSON.stringify({ draft: currentDraft, photos }),
    [currentDraft, photos]
  );

  useEffect(() => {
    if (!stepRecord) return;
    const collected = getEffectiveStepData(stepRecord) as InspectionDraft;
    const normalizedDefects = Array.isArray(collected.defects)
      ? collected.defects.map((defect) => ({
          ...defect,
          type: (['scratch', 'dent', 'chip', 'paint_issue', 'crack'] as const).includes(
            defect.type as Defect['type']
          )
            ? (defect.type as Defect['type'])
            : 'scratch',
          severity:
            defect.severity === 'low' || defect.severity === 'medium' || defect.severity === 'high'
              ? defect.severity
              : 'low',
        }))
      : [];

    const serverDraft = {
      checklist: collected.checklist ?? {},
      defects: normalizedDefects,
      notes: getEffectiveStepNote(stepRecord) ?? collected.notes ?? '',
      environment: {
        temp_celsius: collected.environment?.temp_celsius ?? intervention?.temperature_celsius ?? null,
        humidity_percent: collected.environment?.humidity_percent ?? intervention?.humidity_percentage ?? null,
      },
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

    setChecklist(serverDraft.checklist);
    setDefects(serverDraft.defects);
    setNotes(serverDraft.notes);
    setEnvironment(serverDraft.environment);
    setPhotos(serverPhotos);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
    lastPersistedSignatureRef.current = serverSignature;
    lastHydratedVersionRef.current = serverVersion;
  }, [
    stepRecord,
    stepRecord?.updated_at,
    stepRecord?.collected_data,
    stepRecord?.photo_urls,
    intervention?.humidity_percentage,
    intervention?.temperature_celsius,
    currentSignature,
  ]);

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

      await saveDraft('inspection', currentDraft, {
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

  const checklistCount = CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  const checklistTotal = CHECKLIST_ITEMS.length;
  const defectsCount = defects.length;
  const canValidate = checklistCount === checklistTotal;

  const summaryText = `${checklistCount}/${checklistTotal} points de contrôle · ${photos.length} photo${photos.length !== 1 ? 's' : ''} · ${defectsCount} ${defectsCount > 1 ? 'défauts' : 'défaut'}`;

  const stepLabel = `ÉTAPE 1 / ${steps.length || 4}`;
  const meta = task?.vehicle_model ? `${task.vehicle_model} · ${task.ppf_zones?.length ?? 0} zones` : undefined;

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
      await validateStep('inspection', { checklist, defects, notes, environment }, photos);
      const nextStepId = getNextPPFStepId(steps, 'inspection');
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
    downloadJsonFile(payload, `intervention-${intervention.id}-step-inspection-${nowDate}.json`);
  };

  return (
    <PpfWorkflowLayout
      stepId="inspection"
      actionBar={{
        summary: summaryText,
        onSaveDraft: handleSaveDraft,
        onDownloadData: handleDownloadStepData,
        onValidate: handleValidate,
        validateLabel: 'Inspection',
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
        title="Inspection du véhicule"
        subtitle="Documentez l'état préexistant et vérifiez les conditions d'application"
        meta={meta}
        rightSlot={
          <div>
            <div className="text-[10px] uppercase font-semibold text-white/70">Durée estimée</div>
            <div className="text-2xl font-extrabold">~12 min</div>
            <div className="text-[10px] text-white/60">Section en cours</div>
          </div>
        }
        progressSegments={{ total: 4, filled: 1 }}
        gradientClassName="bg-gradient-to-r from-sky-500 to-emerald-600"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Checklist de pré-inspection</div>
              <span className="rounded-full bg-[hsl(var(--rpma-surface))] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {checklistCount} / {checklistTotal}
              </span>
            </div>
            <PpfChecklist
              items={CHECKLIST_ITEMS}
              values={checklist}
              onToggle={(id) => setChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <PpfDefectsPanel
              defects={defects}
              onAdd={(defect) => setDefects((prev) => [...prev, defect])}
              onRemove={(id) => setDefects((prev) => prev.filter((item) => item.id !== id))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Diagramme du véhicule</div>
              <span className="text-[10px] text-muted-foreground">Cliquez pour marquer</span>
            </div>
            <VehicleDiagram
              defects={defects.map((defect) => ({
                ...defect,
                notes: defect.notes ?? undefined,
              }))}
              onDefectAdd={(defect) => setDefects((prev) => [...prev, defect])}
              onDefectRemove={(id) => setDefects((prev) => prev.filter((item) => item.id !== id))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-semibold text-foreground">Notes d&apos;inspection</label>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observations complémentaires..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <InspectionEnvironmentCard environment={environment} onChange={setEnvironment} />

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <PpfPhotoGrid
              taskId={taskId}
              interventionId={intervention?.id}
              stepId="inspection"
              type="before"
              photos={photos}
              minPhotos={0}
              requiredLabels={['Face', 'Capot', 'Ailes', 'Pare-choc']}
              onChange={setPhotos}
              title="Photos avant pose"
              hint="Face · Capot · Ailes G/D · Pare-chocs"
            />
          </div>
        </div>
      </div>
    </PpfWorkflowLayout>
  );
}
