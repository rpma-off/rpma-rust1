'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, PenLine, Star, TriangleAlert } from 'lucide-react';
import type { StepType } from '@/lib/backend';
import { cn } from '@/lib/utils';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildStepExportPayload,
  downloadJsonFile,
  getEffectiveStepData,
  getPPFStepPath,
  PpfChecklist,
  PpfPhotoGrid,
  PpfStepHero,
  PpfWorkflowLayout,
  PPF_STEP_CONFIG,
  usePpfWorkflow,
} from '@/domains/interventions';
import { buildPpfCompletionSnapshot, type PpfStepSummary } from '@/domains/interventions/utils/ppf-completion-summary';

const FINAL_CHECKLIST = [
  {
    id: 'edges_sealed',
    title: 'Bords scelles',
    description: 'Verifier l adherence sur tous les contours',
    required: true,
  },
  {
    id: 'no_bubbles',
    title: 'Aucune bulle',
    description: 'Controle visuel complet',
    required: true,
  },
  {
    id: 'smooth_surface',
    title: 'Surface lisse',
    description: 'Pas de plis ni de surepaisseurs',
    required: true,
  },
  {
    id: 'alignment_ok',
    title: 'Alignement correct',
    description: 'Respect des lignes et decoupes',
    required: true,
  },
  {
    id: 'clean_finish',
    title: 'Finition propre',
    description: 'Nettoyage final effectue',
    required: true,
  },
  {
    id: 'client_briefed',
    title: 'Consignes client',
    description: 'Entretien et temps de sechage rappeles',
    required: true,
  },
];

type FinalizationDraft = {
  checklist?: Record<string, boolean>;
  notes?: string;
  customer_satisfaction?: number | null;
  quality_score?: number | null;
  customer_signature?: {
    svg_data?: string | null;
    signatory?: string | null;
    customer_comments?: string | null;
  };
};

export default function FinalizationStepPage() {
  const router = useRouter();
  const { taskId, steps, stepsData, getStepRecord, saveDraft, validateStep, intervention } = usePpfWorkflow();
  const stepRecord = getStepRecord('finalization' as StepType);
  const autosaveReady = useRef(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerSatisfaction, setCustomerSatisfaction] = useState<number | null>(null);
  const [qualityScore, setQualityScore] = useState(85);
  const [customerComments, setCustomerComments] = useState('');
  const [signatory, setSignatory] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const hasHydratedFromServerRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const lastHydratedVersionRef = useRef<string | null>(null);

  const currentDraft = useMemo(
    () => ({
      checklist,
      notes,
      customer_satisfaction: customerSatisfaction,
      quality_score: qualityScore,
      customer_signature: {
        svg_data: signatureDataUrl,
        signatory,
        customer_comments: customerComments,
      },
    }),
    [checklist, notes, customerSatisfaction, qualityScore, signatureDataUrl, signatory, customerComments]
  );

  const currentSignature = useMemo(
    () => JSON.stringify({ draft: currentDraft, photos }),
    [currentDraft, photos]
  );

  useEffect(() => {
    if (!stepRecord) return;
    const collected = getEffectiveStepData(stepRecord) as FinalizationDraft;
    const serverDraft = {
      checklist: collected.checklist ?? {},
      notes: collected.notes ?? '',
      customer_satisfaction: collected.customer_satisfaction ?? null,
      quality_score: collected.quality_score ?? 85,
      customer_signature: {
        svg_data: collected.customer_signature?.svg_data ?? null,
        signatory: collected.customer_signature?.signatory ?? '',
        customer_comments: collected.customer_signature?.customer_comments ?? '',
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
    setNotes(serverDraft.notes);
    setCustomerSatisfaction(serverDraft.customer_satisfaction);
    setQualityScore(serverDraft.quality_score);
    setSignatureDataUrl(serverDraft.customer_signature.svg_data);
    setSignatory(serverDraft.customer_signature.signatory);
    setCustomerComments(serverDraft.customer_signature.customer_comments);
    setPhotos(serverPhotos);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
    lastPersistedSignatureRef.current = serverSignature;
    lastHydratedVersionRef.current = serverVersion;
  }, [stepRecord, stepRecord?.updated_at, stepRecord?.collected_data, stepRecord?.photo_urls, currentSignature]);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const context = getCanvasContext(canvas);
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2;
    context.strokeStyle = '#0f172a';

    if (!signatureDataUrl) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = signatureDataUrl;
  }, [signatureDataUrl]);

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

      await saveDraft('finalization', currentDraft, {
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

  const workflowSnapshot = useMemo(
    () => buildPpfCompletionSnapshot(stepsData?.steps),
    [stepsData?.steps]
  );
  const checklistCount = FINAL_CHECKLIST.filter((item) => checklist[item.id]).length;
  const checklistTotal = FINAL_CHECKLIST.length;
  const hasSignature = Boolean(signatureDataUrl);
  const allPriorStepsCompleted = workflowSnapshot.steps
    .filter((step: PpfStepSummary) => step.id !== 'finalization')
    .every((step: PpfStepSummary) => step.status === 'completed');
  const canValidate =
    checklistCount === checklistTotal &&
    allPriorStepsCompleted &&
    hasSignature &&
    customerSatisfaction !== null &&
    qualityScore > 0;

  const summaryText = `${checklistCount}/${checklistTotal} points de controle · ${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  const stepLabel = `ETAPE 4 / ${steps.length || 4}`;
  const completedBadges = steps
    .filter((step) => step.status === 'completed')
    .map((step) => `OK ${step.title}`);
  const badge = completedBadges.length ? completedBadges.join(' · ') : undefined;
  const finalizeWarnings = [
    !allPriorStepsCompleted ? 'Toutes les etapes precedentes doivent etre terminees.' : null,
    checklistCount !== checklistTotal ? 'La checklist finale doit etre complete.' : null,
    !hasSignature ? 'La signature client est requise.' : null,
    customerSatisfaction === null ? 'La satisfaction client doit etre renseignee.' : null,
  ].filter(Boolean) as string[];

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
      await validateStep(
        'finalization',
        {
          checklist,
          notes,
          customer_satisfaction: customerSatisfaction,
          quality_score: qualityScore,
          customer_signature: {
            svg_data: signatureDataUrl,
            signatory,
            customer_comments: customerComments,
          },
        },
        photos
      );
      router.push(`/tasks/${taskId}/completed`);
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

  const beginSignature = useCallback((x: number, y: number) => {
    const context = signatureCanvasRef.current ? getCanvasContext(signatureCanvasRef.current) : null;
    if (!context) return;
    isDrawingRef.current = true;
    context.beginPath();
    context.moveTo(x, y);
  }, []);

  const drawSignature = useCallback((x: number, y: number) => {
    const canvas = signatureCanvasRef.current;
    const context = canvas ? getCanvasContext(canvas) : null;
    if (!canvas || !context || !isDrawingRef.current) return;
    context.lineTo(x, y);
    context.stroke();
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  }, []);

  const stopSignature = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    const context = canvas ? getCanvasContext(canvas) : null;
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  }, []);

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
        draftGuard={{
          hasPendingDraft:
            hasHydratedFromServerRef.current && currentSignature !== lastPersistedSignatureRef.current,
          saveNow,
        }}
      >
        <PpfStepHero
          stepLabel={stepLabel}
          title="Cockpit de cloture"
          subtitle="Relisez tout le workflow, recueillez la validation client et finalisez l intervention."
          badge={badge}
          rightSlot={
            <div>
              <div className="text-[10px] uppercase font-semibold text-white/70">Etape finale</div>
              <div className="text-2xl font-extrabold">~8 min</div>
              <div className="text-[10px] text-white/60">Cloture PPF</div>
            </div>
          }
          progressSegments={{ total: 4, filled: 4 }}
          gradientClassName="bg-gradient-to-r from-emerald-600 to-teal-700"
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">Vue d ensemble du workflow</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chaque carte ouvre directement l etape correspondante pour correction ou controle.
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {workflowSnapshot.summary.completedSteps}/{workflowSnapshot.summary.totalSteps} terminees
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {workflowSnapshot.steps.map((step: PpfStepSummary) => {
                  const config = PPF_STEP_CONFIG[step.id];
                  const isDone = step.status === 'completed';
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(step.id)}`)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md',
                        isDone ? 'border-emerald-200 bg-emerald-50/70' : 'border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))/0.45]'
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-xl',
                              isDone ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground'
                            )}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : <config.icon className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{config.label}</div>
                            <div className="text-[11px] text-muted-foreground">{config.duration}</div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
                            isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {isDone ? 'Termine' : 'A revoir'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-foreground">
                        {step.id === 'inspection' && (
                          <>
                            <span>{step.defectsCount ?? 0} defauts</span>
                            <span>·</span>
                            <span>{step.photoCount} photos</span>
                          </>
                        )}
                        {step.id === 'preparation' && (
                          <>
                            <span>Surface {step.surfaceChecklist?.checked ?? 0}/{step.surfaceChecklist?.total ?? 0}</span>
                            <span>·</span>
                            <span>Decoupe {step.cutChecklist?.checked ?? 0}/{step.cutChecklist?.total ?? 0}</span>
                          </>
                        )}
                        {step.id === 'installation' && (
                          <>
                            <span>{step.zonesCompleted ?? 0}/{step.zonesTotal ?? 0} zones</span>
                            <span>·</span>
                            <span>{step.averageZoneScore ? `${step.averageZoneScore.toFixed(1)}/10` : 'Score —'}</span>
                          </>
                        )}
                        {step.id === 'finalization' && (
                          <>
                            <span>QC {step.finalChecklist?.checked ?? 0}/{step.finalChecklist?.total ?? 0}</span>
                            <span>·</span>
                            <span>{step.photoCount} photos</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Synthese operationnelle</div>
                <div className="text-xs text-muted-foreground">Agrégée depuis les etapes PPF</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Defauts releves" value={String(workflowSnapshot.summary.defectCount)} helper="Inspection" />
                <MetricCard
                  label="Zones terminees"
                  value={`${workflowSnapshot.summary.zonesCompleted}/${workflowSnapshot.summary.zonesTotal}`}
                  helper="Installation"
                />
                <MetricCard label="Photos capturees" value={String(workflowSnapshot.summary.totalPhotos)} helper="Toutes etapes" />
                <MetricCard
                  label="Score moyen pose"
                  value={workflowSnapshot.summary.averageZoneScore ? `${workflowSnapshot.summary.averageZoneScore.toFixed(1)}/10` : '—'}
                  helper="Zones posees"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Checklist finale</div>
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
                placeholder="Observations finales, remarques client, points a suivre..."
              />
            </div>

            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-4 text-sm font-semibold text-foreground">Validation client</div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-foreground">Nom du signataire</label>
                    <Input
                      value={signatory}
                      onChange={(event) => setSignatory(event.target.value)}
                      placeholder="Nom du client ou receptionnaire"
                    />
                  </div>

                  <div>
                    <div className="mb-2 block text-xs font-semibold text-foreground">Satisfaction client</div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCustomerSatisfaction(value)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                            customerSatisfaction === value
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-[hsl(var(--rpma-border))] bg-white text-muted-foreground hover:border-amber-200 hover:text-foreground'
                          )}
                        >
                          <Star className={cn('h-4 w-4', customerSatisfaction === value && 'fill-current')} />
                          {value}/5
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Score qualite final</span>
                      <span>{qualityScore}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={qualityScore}
                      onChange={(event) => setQualityScore(Number(event.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Signature client</label>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                        Effacer
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-dashed border-[hsl(var(--rpma-border))] bg-slate-50">
                      <canvas
                        ref={signatureCanvasRef}
                        width={560}
                        height={180}
                        className="h-[180px] w-full touch-none bg-white"
                        onMouseDown={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          beginSignature(event.clientX - rect.left, event.clientY - rect.top);
                        }}
                        onMouseMove={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          drawSignature(event.clientX - rect.left, event.clientY - rect.top);
                        }}
                        onMouseUp={stopSignature}
                        onMouseLeave={stopSignature}
                        onTouchStart={(event) => {
                          const touch = event.touches[0];
                          if (!touch) return;
                          const rect = event.currentTarget.getBoundingClientRect();
                          beginSignature(touch.clientX - rect.left, touch.clientY - rect.top);
                        }}
                        onTouchMove={(event) => {
                          const touch = event.touches[0];
                          if (!touch) return;
                          const rect = event.currentTarget.getBoundingClientRect();
                          drawSignature(touch.clientX - rect.left, touch.clientY - rect.top);
                        }}
                        onTouchEnd={stopSignature}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Signature requise pour cloturer l intervention.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-foreground">Commentaire client</label>
                    <textarea
                      className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
                      rows={4}
                      value={customerComments}
                      onChange={(event) => setCustomerComments(event.target.value)}
                      placeholder="Retour client, remarques de livraison, reserves eventuelles..."
                    />
                  </div>
                </div>
              </div>
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
                minPhotos={0}
                onChange={setPhotos}
                title="Photos de finalisation"
                hint="Vue face, laterales, details de finition"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-800">Pret a cloturer</div>
              <div className="mt-2 space-y-2 text-xs text-emerald-700">
                <div>Checklist finale: {checklistCount}/{checklistTotal}</div>
                <div>Satisfaction client: {customerSatisfaction ? `${customerSatisfaction}/5` : 'a renseigner'}</div>
                <div>Score qualite: {qualityScore}%</div>
                <div>Signature: {hasSignature ? 'capturee' : 'requise'}</div>
              </div>
            </div>

            {finalizeWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <TriangleAlert className="h-4 w-4" />
                  Points bloquants avant finalisation
                </div>
                <div className="space-y-1 text-xs text-amber-700">
                  {finalizeWarnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-foreground">Resume par etape</div>
              <div className="space-y-3 text-xs">
                {workflowSnapshot.steps.map((step: PpfStepSummary) => (
                  <div key={`summary-${step.id}`} className="rounded-xl border border-[hsl(var(--rpma-border))] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-foreground">{step.label}</div>
                      <button
                        type="button"
                        onClick={() => router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(step.id)}`)}
                        className="text-emerald-700 underline underline-offset-2"
                      >
                        Ouvrir l etape
                      </button>
                    </div>
                    <div className="mt-2 text-muted-foreground">
                      {step.notes?.trim() ? step.notes : 'Aucune note saisie'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PpfWorkflowLayout>

      <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finaliser l intervention ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le dossier de cloture sera enregistre avec
              {' '}
              {workflowSnapshot.summary.completedSteps}/{workflowSnapshot.summary.totalSteps} etapes terminees,
              {' '}
              {workflowSnapshot.summary.totalPhotos} photos, un score qualite de {qualityScore}% et une satisfaction
              client de {customerSatisfaction ?? '—'}/5.
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

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))/0.55] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}
