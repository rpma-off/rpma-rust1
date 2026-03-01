'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PpfChecklist,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  getNextPPFStepId,
  getPPFStepPath,
  usePpfWorkflow,
} from '@/domains/interventions';
import type { StepType } from '@/lib/backend';

const SURFACE_CHECKLIST = [
  {
    id: 'wash',
    title: 'Lavage complet du véhicule',
    description: 'Nettoyage pH neutre, rinçage sans traces',
    required: true,
  },
  {
    id: 'clay_bar',
    title: 'Décontamination (clay bar)',
    description: 'Éliminer particules et résidus incrustés',
    required: true,
  },
  {
    id: 'degrease',
    title: 'Dégraissage des zones PPF',
    description: 'IPA 70% sur capot, ailes, pare-choc',
    required: true,
  },
  {
    id: 'masking',
    title: 'Masquage zones sensibles',
    description: 'Joints, poignées, capteurs',
    required: true,
  },
  {
    id: 'drying',
    title: 'Séchage complet',
    description: 'Microfibre + air comprimé',
    required: true,
  },
  {
    id: 'final_check',
    title: 'Contrôle surface',
    description: 'Aucune poussière ou résidu',
    required: true,
  },
];

const CUT_CHECKLIST = [
  { id: 'hood', title: 'Capot prédécoupé', description: 'Film 200µ' },
  { id: 'left_fender', title: 'Aile avant G', description: 'Film 150µ' },
  { id: 'right_fender', title: 'Aile avant D', description: 'Film 150µ' },
  { id: 'bumper', title: 'Pare-choc avant', description: 'Film 150µ' },
  { id: 'mirrors', title: 'Rétroviseurs', description: 'Film 100µ' },
  { id: 'sills', title: 'Seuils de porte', description: 'Film 150µ' },
];

const MATERIALS_CHECKLIST = [
  { id: 'ppf_200', title: 'Film PPF 200µ (capot)' },
  { id: 'ppf_150', title: 'Film PPF 150µ (ailes/pare-choc)' },
  { id: 'ppf_100', title: 'Film PPF 100µ (rétros)' },
  { id: 'solution', title: 'Solution d’application 1L' },
  { id: 'squeegee', title: 'Squeegee pro (dur)' },
  { id: 'heatgun', title: 'Pistolet chaleur' },
  { id: 'knife', title: 'Cutter précision' },
  { id: 'microfiber', title: 'Microfibres (x10)' },
];

const CUT_ROWS = [
  { id: 'hood', label: 'Capot', surface: '2.4 m²', film: '200µ' },
  { id: 'left_fender', label: 'Aile G', surface: '1.2 m²', film: '150µ' },
  { id: 'right_fender', label: 'Aile D', surface: '1.2 m²', film: '150µ' },
  { id: 'bumper', label: 'Pare-choc', surface: '0.9 m²', film: '150µ' },
  { id: 'mirrors', label: 'Rétros', surface: '0.3 m²', film: '100µ' },
  { id: 'sills', label: 'Seuils', surface: '1.0 m²', film: '150µ' },
];

type PreparationDraft = {
  surfaceChecklist?: Record<string, boolean>;
  cutChecklist?: Record<string, boolean>;
  materialsChecklist?: Record<string, boolean>;
  notes?: string;
};

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

  useEffect(() => {
    if (!stepRecord) return;
    const collected = (stepRecord?.collected_data ?? {}) as PreparationDraft;
    setSurfaceChecklist(collected.surfaceChecklist ?? {});
    setCutChecklist(collected.cutChecklist ?? {});
    setMaterialsChecklist(collected.materialsChecklist ?? {});
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
        'preparation',
        {
          surfaceChecklist,
          cutChecklist,
          materialsChecklist,
          notes,
        },
        { photos }
      );
    }, 800);
    return () => clearTimeout(timeout);
  }, [surfaceChecklist, cutChecklist, materialsChecklist, notes, photos, saveDraft]);

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
      await saveDraft(
        'preparation',
        { surfaceChecklist, cutChecklist, materialsChecklist, notes },
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

  return (
    <PpfWorkflowLayout
      stepId="preparation"
      actionBar={{
        summary: summaryText,
        onSaveDraft: handleSaveDraft,
        onValidate: handleValidate,
        validateLabel: 'Préparation',
        saveDisabled: isSaving,
        validateDisabled: !canValidate || isValidating,
      }}
    >
      <PpfStepHero
        stepLabel={stepLabel}
        title="🛠️ Préparation de surface"
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
              <div className="text-sm font-semibold text-foreground">✅ Checklist Préparation</div>
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
            <div className="mb-3 text-sm font-semibold text-foreground">✂️ Pré-découpe Film PPF</div>
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
            <div className="mb-3 text-sm font-semibold text-foreground">📦 Vérification Matériaux</div>
            <PpfChecklist
              items={MATERIALS_CHECKLIST}
              values={materialsChecklist}
              onToggle={(id) => setMaterialsChecklist((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-semibold text-foreground">Notes préparation</label>
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
              title="📷 Photos de préparation"
              hint="Documentation visuelle (optionnel)"
            />
          </div>
        </div>
      </div>
    </PpfWorkflowLayout>
  );
}
