import type { InterventionStep } from '@/lib/backend';
import { buildPPFStepsFromData, DEFAULT_PPF_STEP_ORDER, getCurrentPPFStepId } from '../ppf-workflow';

const createStep = (overrides: Partial<InterventionStep>): InterventionStep => ({
  id: overrides.id ?? `step-${overrides.step_type ?? 'inspection'}`,
  intervention_id: overrides.intervention_id ?? 'intervention-1',
  step_number: overrides.step_number ?? 1,
  step_name: overrides.step_name ?? 'Inspection',
  step_type: overrides.step_type ?? 'inspection',
  step_status: overrides.step_status ?? 'pending',
  description: overrides.description ?? null,
  instructions: overrides.instructions ?? null,
  quality_checkpoints: overrides.quality_checkpoints ?? null,
  is_mandatory: overrides.is_mandatory ?? true,
  requires_photos: overrides.requires_photos ?? false,
  min_photos_required: overrides.min_photos_required ?? 0,
  max_photos_allowed: overrides.max_photos_allowed ?? 0,
  started_at: overrides.started_at ?? '',
  completed_at: overrides.completed_at ?? '',
  paused_at: overrides.paused_at ?? '',
  duration_seconds: overrides.duration_seconds ?? null,
  estimated_duration_seconds: overrides.estimated_duration_seconds ?? null,
  step_data: overrides.step_data ?? {},
  collected_data: overrides.collected_data ?? {},
  measurements: overrides.measurements ?? {},
  observations: overrides.observations ?? null,
  photo_count: overrides.photo_count ?? 0,
  required_photos_completed: overrides.required_photos_completed ?? false,
  photo_urls: overrides.photo_urls ?? null,
  validation_data: overrides.validation_data ?? {},
  validation_errors: overrides.validation_errors ?? null,
  validation_score: overrides.validation_score ?? null,
  requires_supervisor_approval: overrides.requires_supervisor_approval ?? false,
  approved_by: overrides.approved_by ?? null,
  approved_at: overrides.approved_at ?? '',
  rejection_reason: overrides.rejection_reason ?? null,
  location_lat: overrides.location_lat ?? 0,
  location_lon: overrides.location_lon ?? 0,
  location_accuracy: overrides.location_accuracy ?? 0,
  device_timestamp: overrides.device_timestamp ?? '',
  server_timestamp: overrides.server_timestamp ?? '',
  title: overrides.title ?? null,
  notes: overrides.notes ?? null,
  synced: overrides.synced ?? false,
  last_synced_at: overrides.last_synced_at ?? '',
  created_at: overrides.created_at ?? 0n,
  updated_at: overrides.updated_at ?? 0n
});

describe('ppf-workflow helpers', () => {
  it('builds steps from express workflow data', () => {
    const stepsData = [
      createStep({ step_type: 'inspection', step_number: 1, step_status: 'completed' }),
      createStep({ step_type: 'installation', step_number: 2, step_status: 'in_progress' }),
      createStep({ step_type: 'finalization', step_number: 3, step_status: 'pending' })
    ];

    const steps = buildPPFStepsFromData(stepsData);

    expect(steps.map(step => step.id)).toEqual(['inspection', 'installation', 'finalization']);
    expect(steps[1]?.status).toBe('in_progress');
  });

  it('builds default steps when no data is available', () => {
    const steps = buildPPFStepsFromData(undefined);
    expect(steps.map(step => step.id)).toEqual(DEFAULT_PPF_STEP_ORDER);
  });

  it('selects current step based on in-progress status', () => {
    const stepsData = [
      createStep({ step_type: 'inspection', step_number: 1, step_status: 'completed' }),
      createStep({ step_type: 'installation', step_number: 2, step_status: 'in_progress' }),
      createStep({ step_type: 'finalization', step_number: 3, step_status: 'pending' })
    ];

    const current = getCurrentPPFStepId(stepsData, 'in_progress');
    expect(current).toBe('installation');
  });
});
