'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PpfDraftGuard } from '@/domains/interventions/components/ppf/PpfWorkflowLayout';
import { useRouter } from 'next/navigation';
import type { StepType } from '@/lib/backend';
import { usePpfWorkflow } from '@/domains/interventions/api/client';
import { getNextPPFStepId, getPPFStepPath } from '../utils/ppf-workflow';
import {
  buildStepExportPayload,
  downloadJsonFile,
  getEffectiveStepData,
  getEffectiveStepNote,
} from '../utils/step-export';

const ZONE_CHECKLIST = [
  { id: 'surface_ready', title: 'Surface dégraissée et sèche', required: true },
  { id: 'film_ready', title: 'Film prédécoupé et vérifié', required: true },
  { id: 'solution_applied', title: "Solution d'installation appliquée", required: true },
  { id: 'pose_ok', title: 'Pose film — pas de bulles ni plis', required: true },
  { id: 'edges_sealed', title: 'Chauffage bords + squeegee final', required: true },
];

const ZONE_PRESETS: Record<string, { name: string; area: string; film: string }> = {
  hood: { name: 'Capot', area: '2.4 m²', film: '200µ' },
  left_fender: { name: 'Aile avant G', area: '1.2 m²', film: '150µ' },
  right_fender: { name: 'Aile avant D', area: '1.2 m²', film: '150µ' },
  bumper: { name: 'Pare-choc av.', area: '0.9 m²', film: '150µ' },
  mirrors: { name: 'Rétroviseurs', area: '0.3 m² × 2', film: '100µ' },
  sills: { name: 'Seuils de porte', area: '1.0 m²', film: '150µ' },
};

const DEFAULT_ZONES = [
  { id: 'hood', ...ZONE_PRESETS['hood']! },
  { id: 'left_fender', ...ZONE_PRESETS['left_fender']! },
  { id: 'right_fender', ...ZONE_PRESETS['right_fender']! },
  { id: 'bumper', ...ZONE_PRESETS['bumper']! },
  { id: 'mirrors', ...ZONE_PRESETS['mirrors']! },
  { id: 'sills', ...ZONE_PRESETS['sills']! },
];

export type ZoneDraft = {
  id: string;
  name: string;
  area?: string;
  film?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  checklist?: Record<string, boolean>;
  quality_score?: number | null;
  photos?: string[];
};

type InstallationDraft = {
  zones?: ZoneDraft[];
  activeZoneId?: string | null;
  notes?: string;
};

const buildZoneList = (zones: string[] | null | undefined): ZoneDraft[] => {
  if (!zones || zones.length === 0) {
    return DEFAULT_ZONES.map((zone) => ({
      ...zone,
      status: 'pending',
      checklist: {},
      quality_score: 8.5,
      photos: [],
    }));
  }

  return zones.map((zone, index) => {
    const key = zone.toLowerCase().replace(/\s+/g, '_');
    const preset = ZONE_PRESETS[key];
    return {
      id: key || `zone-${index + 1}`,
      name: preset?.name ?? zone,
      area: preset?.area ?? '—',
      film: preset?.film ?? 'Film PPF',
      status: 'pending',
      checklist: {},
      quality_score: 8.5,
      photos: [],
    };
  });
};

export { ZONE_CHECKLIST };

export function useInstallationStep() {
  const router = useRouter();
  const { taskId, task, steps, getStepRecord, saveDraft, validateStep, intervention } = usePpfWorkflow();
  const stepRecord = getStepRecord('installation' as StepType);
  const autosaveReady = useRef(false);

  const [zones, setZones] = useState<ZoneDraft[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const hasHydratedFromServerRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const lastHydratedVersionRef = useRef<string | null>(null);

  const currentDraft = useMemo(
    () => ({
      zones,
      activeZoneId,
      notes,
    }),
    [zones, activeZoneId, notes]
  );

  const allPhotos = useMemo(() => {
    const set = new Set<string>();
    zones.forEach((zone) => {
      zone.photos?.forEach((photo) => set.add(photo));
    });
    return Array.from(set);
  }, [zones]);

  const currentSignature = useMemo(
    () => JSON.stringify({ draft: currentDraft, photos: allPhotos }),
    [allPhotos, currentDraft]
  );

  // Hydrate from server data
  useEffect(() => {
    if (!stepRecord) return;

    const collected = getEffectiveStepData(stepRecord) as InstallationDraft;
    const baseZones = buildZoneList(task?.ppf_zones ?? null);
    const savedZones = Array.isArray(collected.zones) ? collected.zones : [];
    const merged: ZoneDraft[] = baseZones.map((zone) => {
      const saved = savedZones.find((item) => item.id === zone.id || item.name === zone.name);
      return {
        ...zone,
        ...saved,
        status: saved?.status ?? zone.status ?? 'pending',
        checklist: saved?.checklist ?? zone.checklist ?? {},
        photos: saved?.photos ?? zone.photos ?? [],
      };
    });

    savedZones
      .filter((saved) => !merged.some((zone) => zone.id === saved.id))
      .forEach((saved) => merged.push({ status: 'pending', checklist: {}, photos: [], ...saved }));

    const activeCandidate =
      collected.activeZoneId ??
      merged.find((zone) => zone.status === 'in_progress')?.id ??
      merged.find((zone) => zone.status !== 'completed')?.id ??
      merged[0]?.id ??
      null;

    const adjustedZones = activeCandidate
      ? merged.map((zone) =>
          zone.id === activeCandidate && zone.status === 'pending' ? { ...zone, status: 'in_progress' } : zone,
        )
      : merged;

    const serverDraft = {
      zones: adjustedZones as ZoneDraft[],
      activeZoneId: activeCandidate,
      notes: getEffectiveStepNote(stepRecord) ?? collected.notes ?? '',
    };
    const serverPhotos = Array.from(new Set(serverDraft.zones.flatMap((zone) => zone.photos ?? [])));
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

    setZones(serverDraft.zones);
    setActiveZoneId(serverDraft.activeZoneId);
    setNotes(serverDraft.notes);
    hasHydratedFromServerRef.current = true;
    autosaveReady.current = false;
    lastPersistedSignatureRef.current = serverSignature;
    lastHydratedVersionRef.current = serverVersion;
  }, [currentSignature, stepRecord?.id, stepRecord?.updated_at, stepRecord?.collected_data, stepRecord?.notes, task?.ppf_zones]);

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

      await saveDraft('installation', currentDraft, {
        photos: allPhotos,
        showToast: options?.showToast,
        invalidate: options?.invalidate,
      });

      lastPersistedSignatureRef.current = currentSignature;
      return true;
    },
    [allPhotos, currentDraft, currentSignature, saveDraft, stepRecord]
  );

  // Autosave effect
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

  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? zones[0];
  const completedZones = zones.filter((zone) => zone.status === 'completed').length;
  const zonesWithPhotos = zones.filter((zone) => (zone.photos?.length ?? 0) > 0).length;
  const zoneScores = zones.map((zone) => zone.quality_score).filter((score): score is number => typeof score === 'number');
  const averageScore = zoneScores.length > 0 ? zoneScores.reduce((acc, score) => acc + score, 0) / zoneScores.length : null;

  const zoneChecklistComplete = (zone?: ZoneDraft) =>
    ZONE_CHECKLIST.every((item) => Boolean(zone?.checklist?.[item.id]));

  const canValidateZone = activeZone
    ? zoneChecklistComplete(activeZone) &&
      typeof activeZone.quality_score === 'number'
    : false;

  const canValidate =
    zones.length > 0 &&
    zones.every((zone) => zone.status === 'completed') &&
    zones.every((zone) => zoneChecklistComplete(zone)) &&
    zones.every((zone) => typeof zone.quality_score === 'number');

  const summaryText = `${completedZones}/${zones.length || 1} zones · ${zonesWithPhotos}/${zones.length || 1} photos`;

  const stepLabel = `ÉTAPE 3 / ${steps.length || 4}`;
  const completedBadges = steps.filter((step) => step.status === 'completed').map((step) => `✓ ${step.title}`);
  const badge = completedBadges.length ? completedBadges.join(' · ') : undefined;

  const handleSelectZone = (zoneId: string) => {
    setActiveZoneId(zoneId);
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id === zoneId) {
          return zone.status === 'completed' ? zone : { ...zone, status: 'in_progress' };
        }
        if (zone.status === 'in_progress') {
          return { ...zone, status: 'pending' };
        }
        return zone;
      }),
    );
  };

  const handleToggleChecklist = (id: string) => {
    if (!activeZone) return;
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== activeZone.id) return zone;
        const checklist = { ...(zone.checklist ?? {}) };
        checklist[id] = !checklist[id];
        return { ...zone, checklist };
      }),
    );
  };

  const handleQualityChange = (value: number) => {
    if (!activeZone) return;
    setZones((prev) =>
      prev.map((zone) => (zone.id === activeZone.id ? { ...zone, quality_score: value } : zone)),
    );
  };

  const handlePhotosChange = (nextPhotos: string[]) => {
    if (!activeZone) return;
    setZones((prev) =>
      prev.map((zone) => (zone.id === activeZone.id ? { ...zone, photos: nextPhotos } : zone)),
    );
  };

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
  }, []);

  const handleValidateZone = () => {
    if (!activeZone || !canValidateZone) return;
    setZones((prev) => {
      const updated = prev.map((zone) =>
        zone.id === activeZone.id ? { ...zone, status: 'completed' as const } : zone,
      );
      const nextZone = updated.find((zone) => zone.status === 'pending');
      if (nextZone) {
        setActiveZoneId(nextZone.id);
        return updated.map((zone) =>
          zone.id === nextZone.id ? { ...zone, status: 'in_progress' as const } : zone,
        );
      }
      return updated;
    });
  };

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
      await validateStep('installation', { zones, activeZoneId, notes }, allPhotos);
      const nextStepId = getNextPPFStepId(steps, 'installation');
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
    downloadJsonFile(payload, `intervention-${intervention.id}-step-installation-${nowDate}.json`);
  };

  return {
    taskId,
    zones,
    activeZone,
    activeZoneId,
    notes,
    setNotes: handleNotesChange,
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
    draftGuard: {
      hasPendingDraft:
        hasHydratedFromServerRef.current && currentSignature !== lastPersistedSignatureRef.current,
      saveNow,
    } satisfies PpfDraftGuard,
  };
}
