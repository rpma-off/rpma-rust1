import { buildInterventionReportViewModel } from '../buildInterventionReportViewModel';
import { PLACEHOLDERS } from '../report-view-model.types';
import type { Intervention, InterventionStep } from '@/domains/interventions';
import type { InterventionReport } from '../../ipc/reports.ipc';

// ─── Factories ───────────────────────────────────────────────────────────────

function makeIntervention(overrides: Partial<Intervention> = {}): Intervention {
  return {
    id: 'inter-1',
    task_id: 'task-1',
    task_number: 'TSK-001',
    status: 'completed',
    vehicle_plate: 'AB-123-CD',
    vehicle_model: 'Clio',
    vehicle_make: 'Renault',
    vehicle_year: 2022,
    vehicle_color: 'Bleu',
    vehicle_vin: 'VF1ABC123456',
    client_id: 'client-1',
    client_name: 'Jean Dupont',
    client_email: 'jean@example.com',
    client_phone: '+33600000000',
    technician_id: 'tech-1',
    technician_name: 'Marie Martin',
    intervention_type: 'ppf',
    current_step: 4,
    completion_percentage: 100,
    ppf_zones_config: null,
    ppf_zones_extended: null,
    film_type: 'premium',
    film_brand: 'XPEL',
    film_model: 'Ultimate Plus',
    scheduled_at: '2024-01-10T08:00:00Z',
    started_at: '2024-01-10T08:30:00Z',
    completed_at: '2024-01-10T14:00:00Z',
    paused_at: null,
    estimated_duration: 300,
    actual_duration: 330,
    weather_condition: 'sunny',
    lighting_condition: 'artificial',
    work_location: 'garage',
    temperature_celsius: 22.5,
    humidity_percentage: 45.0,
    start_location_lat: null,
    start_location_lon: null,
    start_location_accuracy: null,
    end_location_lat: null,
    end_location_lon: null,
    end_location_accuracy: null,
    customer_satisfaction: 9,
    quality_score: 92,
    final_observations: ['Travail de qualité', 'Client satisfait'],
    customer_signature: 'data:image/png;base64,abc',
    customer_comments: 'Très bon travail',
    metadata: null,
    notes: null,
    special_instructions: null,
    device_info: null,
    app_version: null,
    synced: true,
    last_synced_at: null,
    sync_error: null,
    created_at: BigInt(1704844800000),
    updated_at: BigInt(1704844800000),
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function makeStep(overrides: Partial<InterventionStep> = {}): InterventionStep {
  return {
    id: 'step-1',
    intervention_id: 'inter-1',
    step_number: 1,
    step_name: 'Inspection',
    step_type: 'inspection',
    step_status: 'completed',
    description: null,
    instructions: null,
    quality_checkpoints: null,
    is_mandatory: true,
    requires_photos: true,
    min_photos_required: 1,
    max_photos_allowed: 10,
    started_at: '2024-01-10T08:30:00Z',
    completed_at: '2024-01-10T09:00:00Z',
    paused_at: null,
    duration_seconds: 1800,
    estimated_duration_seconds: 1800,
    step_data: null,
    collected_data: null,
    measurements: null,
    observations: null,
    photo_count: 3,
    required_photos_completed: true,
    photo_urls: null,
    validation_data: null,
    validation_errors: null,
    validation_score: 90,
    requires_supervisor_approval: false,
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    location_lat: null,
    location_lon: null,
    location_accuracy: null,
    device_timestamp: null,
    server_timestamp: null,
    title: 'Inspection',
    notes: 'Surface propre',
    synced: true,
    last_synced_at: null,
    created_at: BigInt(1704844800000),
    updated_at: BigInt(1704844800000),
    ...overrides,
  };
}

function makeReport(overrides: Partial<InterventionReport> = {}): InterventionReport {
  return {
    id: 'report-1',
    intervention_id: 'inter-1',
    report_number: 'INT-2024-0001',
    generated_at: '2024-01-10T15:00:00Z',
    technician_id: 'tech-1',
    technician_name: 'Marie Martin',
    file_path: '/reports/INT-2024-0001.pdf',
    file_name: 'INT-2024-0001.pdf',
    file_size: 512000,
    format: 'pdf',
    status: 'generated',
    created_at: 1704844800000,
    updated_at: 1704844800000,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildInterventionReportViewModel', () => {
  it('maps client fields correctly', () => {
    const vm = buildInterventionReportViewModel(makeIntervention(), [], null);
    expect(vm.client.name).toBe('Jean Dupont');
    expect(vm.client.email).toBe('jean@example.com');
    expect(vm.client.phone).toBe('+33600000000');
  });

  it('replaces null fields with placeholders', () => {
    const vm = buildInterventionReportViewModel(
      makeIntervention({ client_name: null, vehicle_vin: null, film_type: null }),
      [],
      null,
    );
    expect(vm.client.name).toBe(PLACEHOLDERS.notSpecified);
    expect(vm.vehicle.vin).toBe(PLACEHOLDERS.notSpecified);
    expect(vm.materials.filmType).toBe(PLACEHOLDERS.notSpecified);
  });

  it('formats duration in seconds to h/min', () => {
    const step = makeStep({ duration_seconds: 4983 }); // 83 min 3 sec → 1h 23min
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].duration).toBe('1h 23min');
  });

  it('formats intervention estimated and actual duration in minutes', () => {
    const vm = buildInterventionReportViewModel(
      makeIntervention({ estimated_duration: 90, actual_duration: 125 }),
      [],
      null,
    );
    expect(vm.summary.estimatedDuration).toBe('1h 30min');
    expect(vm.summary.actualDuration).toBe('2h 5min');
  });

  it('maps intervention status to French label', () => {
    expect(buildInterventionReportViewModel(makeIntervention({ status: 'completed' }), [], null).summary.status).toBe('Terminée');
    expect(buildInterventionReportViewModel(makeIntervention({ status: 'in_progress' }), [], null).summary.status).toBe('En cours');
    expect(buildInterventionReportViewModel(makeIntervention({ status: 'pending' }), [], null).summary.status).toBe('En attente');
  });

  it('extracts defects from collected_data', () => {
    const step = makeStep({
      collected_data: { defects: ['Rayure légère', 'Bulle d\'air'] } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].defects).toEqual(['Rayure légère', 'Bulle d\'air']);
  });

  it('returns empty defects array when collected_data.defects is not an array', () => {
    const step = makeStep({
      collected_data: { defects: 'pas-un-tableau' } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].defects).toEqual([]);
  });

  it('extracts checklist from collected_data', () => {
    const step = makeStep({
      collected_data: {
        checklist: [
          { label: 'Surface propre', checked: true },
          { label: 'Film découpé', checked: false },
        ],
      } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].checklist).toHaveLength(2);
    expect(vm.steps[0].checklist[0]).toEqual({ label: 'Surface propre', checked: true });
    expect(vm.steps[0].checklist[1]).toEqual({ label: 'Film découpé', checked: false });
  });

  it('handles report: null without crashing and sets reportNumber to null', () => {
    const vm = buildInterventionReportViewModel(makeIntervention(), [], null);
    expect(vm.meta.reportNumber).toBeNull();
  });

  it('uses report_number from report when provided', () => {
    const vm = buildInterventionReportViewModel(makeIntervention(), [], makeReport());
    expect(vm.meta.reportNumber).toBe('INT-2024-0001');
  });

  it('builds quality checkpoints for each step', () => {
    const steps = [
      makeStep({ id: 'step-1', step_number: 1, title: 'Inspection', validation_score: 88 }),
      makeStep({ id: 'step-2', step_number: 2, title: 'Installation', validation_score: 95 }),
    ];
    const vm = buildInterventionReportViewModel(makeIntervention(), steps, null);
    expect(vm.quality.checkpoints).toHaveLength(2);
    expect(vm.quality.checkpoints[0].stepName).toBe('Inspection');
    expect(vm.quality.checkpoints[0].score).toBe('88/100');
    expect(vm.quality.checkpoints[1].score).toBe('95/100');
  });

  it('sums photo_count across steps', () => {
    const steps = [
      makeStep({ id: 'step-1', step_number: 1, photo_count: 3 }),
      makeStep({ id: 'step-2', step_number: 2, photo_count: 5 }),
    ];
    const vm = buildInterventionReportViewModel(makeIntervention(), steps, null);
    expect(vm.photos.totalCount).toBe(8);
  });

  it('sets signaturePresent true when customer_signature is non-empty', () => {
    const vm = buildInterventionReportViewModel(
      makeIntervention({ customer_signature: 'data:image/png;base64,abc' }),
      [],
      null,
    );
    expect(vm.customerValidation.signaturePresent).toBe(true);
  });

  it('sets signaturePresent false when customer_signature is null', () => {
    const vm = buildInterventionReportViewModel(
      makeIntervention({ customer_signature: null }),
      [],
      null,
    );
    expect(vm.customerValidation.signaturePresent).toBe(false);
  });

  it('handles empty steps array without error', () => {
    expect(() => buildInterventionReportViewModel(makeIntervention(), [], null)).not.toThrow();
    const vm = buildInterventionReportViewModel(makeIntervention(), [], null);
    expect(vm.steps).toEqual([]);
    expect(vm.photos.totalCount).toBe(0);
  });

  it('falls back to step_data when collected_data is null', () => {
    const step = makeStep({
      collected_data: null,
      step_data: { defects: ['Rayure'] } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].defects).toEqual(['Rayure']);
  });

  it('uses quality_scores average from collected_data when validation_score is null', () => {
    const step = makeStep({
      validation_score: null,
      collected_data: { quality_scores: [8, 9, 10] } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].qualityScore).toBe('9.0/10');
  });

  it('formats global quality score from intervention', () => {
    const vm = buildInterventionReportViewModel(makeIntervention({ quality_score: 92 }), [], null);
    expect(vm.quality.globalScore).toBe('92/100');
  });

  it('sets globalScore to notEvaluated when quality_score is null', () => {
    const vm = buildInterventionReportViewModel(makeIntervention({ quality_score: null }), [], null);
    expect(vm.quality.globalScore).toBe(PLACEHOLDERS.notEvaluated);
  });

  it('formats temperature and humidity with units', () => {
    const vm = buildInterventionReportViewModel(
      makeIntervention({ temperature_celsius: 30, humidity_percentage: 43 }),
      [],
      null,
    );
    expect(vm.workConditions.temperature).toBe('30 °C');
    expect(vm.workConditions.humidity).toBe('43 %');
  });

  it('sorts steps by step_number', () => {
    const steps = [
      makeStep({ id: 'step-3', step_number: 3, title: 'Installation' }),
      makeStep({ id: 'step-1', step_number: 1, title: 'Inspection' }),
      makeStep({ id: 'step-2', step_number: 2, title: 'Préparation' }),
    ];
    const vm = buildInterventionReportViewModel(makeIntervention(), steps, null);
    expect(vm.steps.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(vm.steps.map((s) => s.title)).toEqual(['Inspection', 'Préparation', 'Installation']);
  });

  it('extracts zones from collected_data', () => {
    const step = makeStep({
      collected_data: { zones: ['full_front', 'full_vehicle'] } as unknown as import('@/lib/backend/common').JsonValue,
    });
    const vm = buildInterventionReportViewModel(makeIntervention(), [step], null);
    expect(vm.steps[0].zones).toEqual(['full_front', 'full_vehicle']);
  });
});
