import type { InterventionStep, JsonValue, StepType } from '@/lib/backend';
import { PPF_STEP_CONFIG } from '../components/ppf/ppfWorkflow.config';
import { getEffectiveStepData, getEffectiveStepNote } from './step-export';

type JsonRecord = Record<string, JsonValue>;

export type PpfStepSummary = {
  id: StepType;
  label: string;
  description: string;
  status: InterventionStep['step_status'] | 'pending';
  completedAt: string | number | bigint | null;
  photoCount: number;
  notes: string | null;
  defectsCount?: number;
  temperature?: number | null;
  humidity?: number | null;
  surfaceChecklist?: { checked: number; total: number };
  cutChecklist?: { checked: number; total: number };
  materialsChecklist?: { checked: number; total: number };
  zonesCompleted?: number;
  zonesTotal?: number;
  zonesWithPhotos?: number;
  averageZoneScore?: number | null;
  finalChecklist?: { checked: number; total: number };
  customerSatisfaction?: number | null;
  qualityScore?: number | null;
  hasSignature?: boolean;
};

export type PpfWorkflowSummary = {
  totalSteps: number;
  completedSteps: number;
  totalPhotos: number;
  defectCount: number;
  zonesCompleted: number;
  zonesTotal: number;
  zonesWithPhotos: number;
  averageZoneScore: number | null;
  finalChecklistChecked: number;
  finalChecklistTotal: number;
  customerSatisfaction: number | null;
  qualityScore: number | null;
  hasSignature: boolean;
};

export type PpfCompletionSnapshot = {
  steps: PpfStepSummary[];
  summary: PpfWorkflowSummary;
};

const STEP_ORDER: StepType[] = ['inspection', 'preparation', 'installation', 'finalization'];

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function countChecked(record: unknown): { checked: number; total: number } {
  const source = asRecord(record);
  if (!source) return { checked: 0, total: 0 };
  const values = Object.values(source);
  return {
    checked: values.filter((value) => Boolean(value)).length,
    total: values.length,
  };
}

function getStepByType(steps: InterventionStep[], stepType: StepType): InterventionStep | null {
  return steps.find((step) => step.step_type === stepType) ?? null;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildPpfCompletionSnapshot(steps: InterventionStep[] | null | undefined): PpfCompletionSnapshot {
  const source = steps ?? [];

  const stepSummaries = STEP_ORDER.map((stepId) => {
    const step = getStepByType(source, stepId);
    const effectiveData = asRecord(step ? getEffectiveStepData(step) : null);
    const photoCount = step?.photo_urls?.length ?? 0;
    const notes = step ? getEffectiveStepNote(step) : null;

    if (stepId === 'inspection') {
      const defects = asArray(effectiveData?.defects);
      const environment = asRecord(effectiveData?.environment);
      return {
        id: stepId,
        label: PPF_STEP_CONFIG[stepId].label,
        description: PPF_STEP_CONFIG[stepId].description,
        status: step?.step_status ?? 'pending',
        completedAt: step?.completed_at ?? null,
        photoCount,
        notes,
        defectsCount: defects.length,
        temperature: toNumber(environment?.temp_celsius),
        humidity: toNumber(environment?.humidity_percent),
      } satisfies PpfStepSummary;
    }

    if (stepId === 'preparation') {
      return {
        id: stepId,
        label: PPF_STEP_CONFIG[stepId].label,
        description: PPF_STEP_CONFIG[stepId].description,
        status: step?.step_status ?? 'pending',
        completedAt: step?.completed_at ?? null,
        photoCount,
        notes,
        surfaceChecklist: countChecked(effectiveData?.surfaceChecklist),
        cutChecklist: countChecked(effectiveData?.cutChecklist),
        materialsChecklist: countChecked(effectiveData?.materialsChecklist),
      } satisfies PpfStepSummary;
    }

    if (stepId === 'installation') {
      const zones = asArray<JsonRecord>(effectiveData?.zones);
      const completedZones = zones.filter((zone) => zone.status === 'completed').length;
      const zonesWithPhotos = zones.filter((zone) => asArray(zone.photos).length > 0).length;
      const scores = zones
        .map((zone) => toNumber(zone.quality_score))
        .filter((value): value is number => value !== null);

      return {
        id: stepId,
        label: PPF_STEP_CONFIG[stepId].label,
        description: PPF_STEP_CONFIG[stepId].description,
        status: step?.step_status ?? 'pending',
        completedAt: step?.completed_at ?? null,
        photoCount,
        notes,
        zonesCompleted: completedZones,
        zonesTotal: zones.length,
        zonesWithPhotos,
        averageZoneScore: average(scores),
      } satisfies PpfStepSummary;
    }

    const finalChecklist = countChecked(effectiveData?.checklist ?? effectiveData?.qc_checklist);
    const customerSignature = asRecord(effectiveData?.customer_signature);
    return {
      id: stepId,
      label: PPF_STEP_CONFIG[stepId].label,
      description: PPF_STEP_CONFIG[stepId].description,
      status: step?.step_status ?? 'pending',
      completedAt: step?.completed_at ?? null,
      photoCount,
      notes,
      finalChecklist,
      customerSatisfaction: toNumber(effectiveData?.customer_satisfaction),
      qualityScore: toNumber(effectiveData?.quality_score),
      hasSignature: Boolean(customerSignature?.svg_data),
    } satisfies PpfStepSummary;
  });

  const inspection = stepSummaries.find((step) => step.id === 'inspection');
  const installation = stepSummaries.find((step) => step.id === 'installation');
  const finalization = stepSummaries.find((step) => step.id === 'finalization');

  return {
    steps: stepSummaries,
    summary: {
      totalSteps: stepSummaries.length,
      completedSteps: stepSummaries.filter((step) => step.status === 'completed').length,
      totalPhotos: stepSummaries.reduce((sum, step) => sum + step.photoCount, 0),
      defectCount: inspection?.defectsCount ?? 0,
      zonesCompleted: installation?.zonesCompleted ?? 0,
      zonesTotal: installation?.zonesTotal ?? 0,
      zonesWithPhotos: installation?.zonesWithPhotos ?? 0,
      averageZoneScore: installation?.averageZoneScore ?? null,
      finalChecklistChecked: finalization?.finalChecklist?.checked ?? 0,
      finalChecklistTotal: finalization?.finalChecklist?.total ?? 0,
      customerSatisfaction: finalization?.customerSatisfaction ?? null,
      qualityScore: finalization?.qualityScore ?? null,
      hasSignature: Boolean(finalization?.hasSignature),
    },
  };
}
