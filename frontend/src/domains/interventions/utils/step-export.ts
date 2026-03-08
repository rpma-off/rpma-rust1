import type { InterventionStep } from '@/lib/backend';

export type StepExportPayload = {
  exported_at: string;
  task_id: string;
  intervention_id: string;
  step_id: string;
  step_type: InterventionStep['step_type'];
  step_status: InterventionStep['step_status'];
  completed_at: InterventionStep['completed_at'];
  collected_data: InterventionStep['collected_data'] | null;
  step_data: InterventionStep['step_data'] | null;
  effective_data: unknown;
  notes: InterventionStep['notes'];
  photo_urls: InterventionStep['photo_urls'];
  measurements: InterventionStep['measurements'];
  observations: InterventionStep['observations'];
  validation_data: InterventionStep['validation_data'];
};

export function getEffectiveStepData(step: {
  collected_data?: unknown | null;
  step_data?: unknown | null;
}): unknown {
  return step.collected_data ?? step.step_data ?? {};
}

export function buildStepExportPayload(
  taskId: string,
  interventionId: string,
  step: InterventionStep
): StepExportPayload {
  return {
    exported_at: new Date().toISOString(),
    task_id: taskId,
    intervention_id: interventionId,
    step_id: step.id,
    step_type: step.step_type,
    step_status: step.step_status,
    completed_at: step.completed_at,
    collected_data: step.collected_data ?? null,
    step_data: step.step_data ?? null,
    effective_data: getEffectiveStepData(step),
    notes: step.notes,
    photo_urls: step.photo_urls,
    measurements: step.measurements,
    observations: step.observations,
    validation_data: step.validation_data,
  };
}

export function downloadJsonFile(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
