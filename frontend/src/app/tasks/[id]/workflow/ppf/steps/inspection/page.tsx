'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, Thermometer } from 'lucide-react';
import {
  PpfChecklist,
  PpfDefectsPanel,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  VehicleDiagram,
  getNextPPFStepId,
  getPPFStepPath,
  usePpfWorkflow,
} from '@/domains/interventions';
import type { StepType } from '@/lib/backend';
import type { Defect } from '@/domains/interventions';

const CHECKLIST_ITEMS = [
  {
    id: 'clean_dry',
    title: 'Véhicule propre et sec',
    description: 'Aucune trace d’eau ou de graisse sur les zones PPF',
    required: true,
  },
  {
    id: 'temp_ok',
    title: 'Température confirmée 18-25°C',
    description: 'Relevé manuel + capteur atelier',
    required: true,
  },
  {
    id: 'humidity_ok',
    title: 'Humidité 40-60% vérifiée',
    description: 'Hygromètre de l’atelier',
  },
  {
    id: 'defects_logged',
    title: 'Défauts pré-existants documentés',
    description: 'Marquer sur le diagramme véhicule',
    required: true,
  },
  {
    id: 'film_ready',
    title: 'Film PPF sélectionné et disponible',
    description: 'Lot : PPF-200µ-2025-09 · Exp. 12/2027',
  },
  {
    id: 'client_informed',
    title: 'Client informé des consignes post-pose',
    description: 'Séchage 48h, pas de lavage HP, pas de cire',
  },
];

type InspectionDefect = Omit<Defect, 'notes'> & { notes?: string | null };

type InspectionDraft = {
  checklist?: Record<string, boolean>;
  defects?: InspectionDefect[];
  notes?: string;
  environment?: {
    temp_celsius?: number | null;
    humidity_percent?: number | null;
  };
};

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

  useEffect(() => {
    if (!stepRecord) return;
    const collected = (stepRecord?.collected_data ?? {}) as InspectionDraft;
    const normalizedDefects = Array.isArray(collected.defects)
      ? collected.defects.map((defect) => ({
          ...defect,
          type: (['scratch', 'dent', 'chip', 'paint_issue', 'crack'] as const).includes(
            defect.type as Defect['type']
          )
            ? (defect.type as Defect['type'])
            : 'scratch',
          severity: (defect.severity === 'low' || defect.severity === 'medium' || defect.severity === 'high')
            ? defect.severity
            : 'low',
        }))
      : [];

    setChecklist(collected.checklist ?? {});
    setDefects(normalizedDefects);
    setNotes(collected.notes ?? '');
    setEnvironment({
      temp_celsius: collected.environment?.temp_celsius ?? intervention?.temperature_celsius ?? null,
      humidity_percent: collected.environment?.humidity_percent ?? intervention?.humidity_percentage ?? null,
    });
    setPhotos(stepRecord?.photo_urls ?? []);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
  }, [
    stepRecord,
    stepRecord?.updated_at,
    stepRecord?.collected_data,
    stepRecord?.photo_urls,
    intervention?.humidity_percentage,
    intervention?.temperature_celsius,
  ]);

  useEffect(() => {
    if (!hasHydratedFromServerRef.current) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      void saveDraft(
        'inspection',
        {
          checklist,
          defects,
          notes,
          environment,
        },
        { photos }
      );
    }, 800);
    return () => clearTimeout(timeout);
  }, [checklist, defects, notes, environment, photos, saveDraft]);

  const checklistCount = CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  const checklistTotal = CHECKLIST_ITEMS.length;
  const requiredPhotos = 4;
  const defectsCount = defects.length;
  const canValidate = checklistCount === checklistTotal && photos.length >= requiredPhotos;

  const summaryText = `${checklistCount}/${checklistTotal} checklist · ${photos.length}/${requiredPhotos} photos · ${defectsCount} ${
    defectsCount > 1 ? 'défauts' : 'défaut'
  }`;

  const stepLabel = `ÉTAPE 1 / ${steps.length || 4}`;
  const meta = task?.vehicle_model ? `${task.vehicle_model} · ${task.ppf_zones?.length ?? 0} zones` : undefined;

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await saveDraft(
        'inspection',
        { checklist, defects, notes, environment },
        { photos, showToast: true, invalidate: true }
      );
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

  return (
    <PpfWorkflowLayout
      stepId="inspection"
      actionBar={{
        summary: summaryText,
        onSaveDraft: handleSaveDraft,
        onValidate: handleValidate,
        validateLabel: 'Inspection',
        saveDisabled: isSaving,
        validateDisabled: !canValidate || isValidating,
      }}
    >
      <PpfStepHero
        stepLabel={stepLabel}
        title="🔍 Inspection du véhicule"
        subtitle="Documentez l’état pré-existant et vérifiez les conditions d’application"
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
              <div className="text-sm font-semibold text-foreground">✅ Checklist Pré-Inspection</div>
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
              <div className="text-sm font-semibold text-foreground">📐 Diagramme véhicule</div>
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
          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">🌡 Conditions Atelier</div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    ● Mesure atelier
                  </span>
            </div>
            <div className="flex items-center gap-4 rounded-md border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] px-3 py-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-extrabold text-orange-500">{environment.temp_celsius ?? '—'}°C</span>
                <span className="text-[10px] font-semibold text-muted-foreground">TEMPÉRATURE</span>
                <span className="text-[9px] font-semibold text-emerald-600">✓ Optimal</span>
              </div>
              <div className="h-7 w-px bg-[hsl(var(--rpma-border))]" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-extrabold text-sky-500">{environment.humidity_percent ?? '—'}%</span>
                <span className="text-[10px] font-semibold text-muted-foreground">HUMIDITÉ</span>
                <span className="text-[9px] font-semibold text-emerald-600">✓ Optimal</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                  Température relevée (°C)
                </span>
                <input
                  type="number"
                  className="rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
                  value={environment.temp_celsius ?? ''}
                  onChange={(event) =>
                    setEnvironment((prev) => ({
                      ...prev,
                      temp_celsius: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
                <span className="text-[10px] text-emerald-600">✓ Zone 18-25°C</span>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-sky-500" />
                  Humidité relative (%)
                </span>
                <input
                  type="number"
                  className="rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
                  value={environment.humidity_percent ?? ''}
                  onChange={(event) =>
                    setEnvironment((prev) => ({
                      ...prev,
                      humidity_percent: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
                <span className="text-[10px] text-emerald-600">✓ Zone 40-60%</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <PpfPhotoGrid
              taskId={taskId}
              interventionId={intervention?.id}
              stepId="inspection"
              type="before"
              photos={photos}
              minPhotos={requiredPhotos}
              requiredLabels={['Face', 'Capot', 'Ailes', 'Pare-choc']}
              onChange={setPhotos}
              title="📷 Photos Avant Pose"
              hint="Face · Capot · Ailes G/D · Pare-choc"
            />
          </div>
        </div>
      </div>
    </PpfWorkflowLayout>
  );
}
