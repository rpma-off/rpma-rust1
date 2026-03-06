'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  PpfChecklist,
  PpfPhotoGrid,
  PpfQualitySlider,
  PpfStepHero,
  PpfWorkflowLayout,
  PpfZoneTracker,
} from '@/domains/interventions';
import { useInstallationStep, ZONE_CHECKLIST } from '@/domains/interventions/hooks/useInstallationStep';

export default function InstallationStepPage() {
  const {
    taskId,
    zones,
    activeZone,
    notes,
    setNotes,
    isSaving,
    isValidating,
    completedZones,
    averageScore,
    canValidateZone,
    canValidate,
    summaryText,
    stepLabel,
    badge,
    stepRecord,
    intervention,
    handleSelectZone,
    handleToggleChecklist,
    handleQualityChange,
    handlePhotosChange,
    handleValidateZone,
    handleSaveDraft,
    handleValidate,
    handleDownloadStepData,
  } = useInstallationStep();

  return (
    <PpfWorkflowLayout
      stepId="installation"
      actionBar={{
        summary: summaryText,
        onSaveDraft: handleSaveDraft,
        onDownloadData: handleDownloadStepData,
        onValidate: handleValidate,
        validateLabel: 'Installation',
        saveDisabled: isSaving,
        downloadDisabled: !stepRecord,
        validateDisabled: !canValidate || isValidating,
      }}
    >
      <PpfStepHero
        stepLabel={stepLabel}
        title="🎯 Installation du Film PPF"
        subtitle="Application zone par zone avec contrôle qualité continu"
        badge={badge}
        rightSlot={
          <div>
            <div className="text-[10px] uppercase font-semibold text-white/70">Progression</div>
            <div className="text-2xl font-extrabold">
              {completedZones} / {zones.length || 1} zones
            </div>
            <div className="text-[10px] text-white/60">
              {averageScore ? `${averageScore.toFixed(1)} / 10` : 'Score qualité'}
            </div>
          </div>
        }
        progressSegments={{
          total: Math.min(zones.length || 4, 6),
          filled: Math.min(completedZones, 6),
        }}
        gradientClassName="bg-gradient-to-r from-emerald-600 to-emerald-800"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <PpfZoneTracker
              zones={zones.map((zone) => ({
                id: zone.id,
                name: zone.name,
                area: zone.area,
                film: zone.film,
                status: zone.status ?? 'pending',
                score: zone.quality_score ?? null,
              }))}
              activeZoneId={activeZone?.id}
              onSelect={handleSelectZone}
            />
          </div>

          {activeZone && (
            <div className="rounded-xl border-2 border-blue-500 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="mb-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    Zone active
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {activeZone.name} · {activeZone.area}
                  </div>
                </div>
                <Button size="sm" onClick={handleValidateZone} disabled={!canValidateZone}>
                  Valider cette zone
                </Button>
              </div>

              <div className="mb-4">
                <PpfChecklist
                  items={ZONE_CHECKLIST}
                  values={activeZone.checklist ?? {}}
                  onToggle={handleToggleChecklist}
                />
              </div>

              <PpfQualitySlider
                value={typeof activeZone.quality_score === 'number' ? activeZone.quality_score : 8.5}
                onChange={handleQualityChange}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {activeZone && (
            <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">📷 Photos Après Pose</div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {activeZone.name}
                </span>
              </div>
              <PpfPhotoGrid
                taskId={taskId}
                interventionId={intervention?.id}
                stepId="installation"
                type="after"
                photos={activeZone.photos ?? []}
                minPhotos={1}
                maxPhotos={6}
                requiredLabels={[activeZone.name]}
                onChange={handlePhotosChange}
                title="Photo zone active"
                hint="Ajoutez au moins 1 photo"
              />
            </div>
          )}

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-foreground">🏆 Scores Qualité</div>
            <div className="space-y-3 text-xs">
              {zones.map((zone) => (
                <div key={`score-${zone.id}`}>
                  <div className="flex items-center justify-between">
                    <span>{zone.name}</span>
                    <span className={zone.status === 'completed' ? 'font-semibold text-emerald-600' : 'text-muted-foreground'}>
                      {typeof zone.quality_score === 'number' ? `${zone.quality_score.toFixed(1)} / 10` : '—'}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-[hsl(var(--rpma-border))]">
                    <div
                      className="h-1 rounded-full bg-emerald-500"
                      style={{
                        width: typeof zone.quality_score === 'number' ? `${zone.quality_score * 10}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-[hsl(var(--rpma-border))] pt-2 text-sm font-semibold">
                Moyenne actuelle : {averageScore ? `${averageScore.toFixed(1)} / 10` : '—'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-semibold text-foreground">Notes installation</label>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observations zone par zone..."
            />
          </div>
        </div>
      </div>
    </PpfWorkflowLayout>
  );
}
