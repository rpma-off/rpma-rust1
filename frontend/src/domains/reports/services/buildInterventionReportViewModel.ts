// ❌ CROSS-DOMAIN IMPORT
import type { Intervention, InterventionStep } from '@/domains/interventions';
import type { InterventionReport } from '../ipc/reports.ipc';
import { PLACEHOLDERS, type InterventionReportViewModel, type ReportStepViewModel } from './report-view-model.types';

// ─── Label maps ─────────────────────────────────────────────────────────────

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  paused: 'En pause',
  cancelled: 'Annulée',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  paused: 'En pause',
  failed: 'Échouée',
  skipped: 'Ignorée',
  rework: 'À refaire',
};

const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  ppf: 'PPF (Film de protection)',
  ceramic: 'Céramique',
  detailing: 'Détailing',
  other: 'Autre',
};

const WEATHER_LABELS: Record<string, string> = {
  sunny: 'Ensoleillé',
  cloudy: 'Nuageux',
  rainy: 'Pluvieux',
  windy: 'Venteux',
  overcast: 'Couvert',
  snowy: 'Neigeux',
};

const LIGHTING_LABELS: Record<string, string> = {
  natural: 'Lumière naturelle',
  artificial: 'Lumière artificielle',
  mixed: 'Mixte',
  poor: 'Mauvais éclairage',
};

const LOCATION_LABELS: Record<string, string> = {
  indoor: 'Intérieur',
  outdoor: 'Extérieur',
  garage: 'Garage',
  workshop: 'Atelier',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nullable(value: string | null | undefined, fallback: string = PLACEHOLDERS.notSpecified): string {
  return value !== null && value !== undefined && value !== '' ? value : fallback;
}

function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return PLACEHOLDERS.notSpecified;
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return PLACEHOLDERS.notSpecified;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${minutes} min`;
}

function formatTimestamp(ts: string | bigint | number | null | undefined): string {
  if (ts === null || ts === undefined) return PLACEHOLDERS.notSpecified;
  try {
    const date = typeof ts === 'bigint' || typeof ts === 'number'
      ? new Date(Number(ts))
      : new Date(ts);
    if (isNaN(date.getTime())) return PLACEHOLDERS.notSpecified;
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return PLACEHOLDERS.notSpecified;
  }
}

function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return PLACEHOLDERS.notSpecified;
  return map[key] ?? key;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function humanizeToken(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function checklistLabel(value: string): string {
  const normalized = normalizeLookupKey(value);
  const labels: Record<string, string> = {
    clean_dry: 'Surface propre et sèche',
    client_informed: 'Client informé',
    client_briefed: 'Client informé',
    defects_logged: 'Défauts enregistrés',
    film_ready: 'Film prêt',
    humidity_ok: 'Humidité conforme',
    temp_ok: 'Température conforme',
    alignment_ok: 'Alignement conforme',
    clean_finish: 'Finition propre',
    edges_sealed: 'Bords scellés',
    no_bubbles: 'Aucune bulle',
    smooth_surface: 'Surface lisse',
    wash: 'Lavage effectué',
    clay_bar: 'Décontamination à la clay',
    ipa_wipe: 'Nettoyage IPA',
  };
  return labels[normalized] ?? value;
}

function zoneLabel(value: string): string {
  const normalized = normalizeLookupKey(value);
  const labels: Record<string, string> = {
    front_bumper: 'Pare-chocs avant',
    bumper: 'Pare-chocs avant',
    rear_bumper: 'Pare-chocs arrière',
    hood: 'Capot',
    roof: 'Toit',
    trunk: 'Coffre',
    full_front: 'Face avant complète',
    full_vehicle: 'Véhicule complet',
    front_left_fender: 'Aile avant gauche',
    front_right_fender: 'Aile avant droite',
    rear_left_fender: 'Aile arrière gauche',
    rear_right_fender: 'Aile arrière droite',
    left_door: 'Porte gauche',
    right_door: 'Porte droite',
  };
  return labels[normalized] ?? humanizeToken(value);
}

function defectTypeLabel(value: string): string {
  const normalized = normalizeLookupKey(value);
  const labels: Record<string, string> = {
    scratch: 'Rayure',
    dent: 'Bosse',
    bubble: 'Bulle',
    contamination: 'Contamination',
    peeling: 'Décollement',
    edge_lift: 'Relèvement',
    lift: 'Relèvement',
  };
  return labels[normalized] ?? value;
}

function severityLabel(value: string): string {
  const normalized = normalizeLookupKey(value);
  const labels: Record<string, string> = {
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
    critical: 'Critique',
  };
  return labels[normalized] ?? humanizeToken(value);
}

/** Safely parse collected_data / step_data to a plain object. */
function parseStepData(step: InterventionStep): Record<string, unknown> {
  const raw = step.collected_data ?? step.step_data;
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function getEffectiveStepNote(step: InterventionStep, data: Record<string, unknown>): string | null {
  if (typeof step.notes === 'string' && step.notes.trim() !== '') {
    return step.notes;
  }

  return typeof data['notes'] === 'string' && data['notes'].trim() !== ''
    ? data['notes']
    : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}

function parseChecklist(value: unknown): { label: string; checked: boolean }[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') {
        return [{ label: checklistLabel(item), checked: true }];
      }
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const labelValue = typeof item['label'] === 'string' ? item['label'] : String(item['label'] ?? '');
        return [{ label: checklistLabel(labelValue), checked: item['checked'] === true }];
      }
      return [];
    });
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({
      label: checklistLabel(key),
      checked: raw === true,
    }));
  }

  return [];
}

function parseDefects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [defectTypeLabel(item)];
    }

    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const zone = typeof item['zone'] === 'string' && item['zone'].trim() !== '' ? zoneLabel(item['zone']) : '';
      const defectType = typeof item['type'] === 'string' && item['type'].trim() !== '' ? defectTypeLabel(item['type']) : '';
      const severity = typeof item['severity'] === 'string' && item['severity'].trim() !== '' ? severityLabel(item['severity']) : '';
      const notes = typeof item['notes'] === 'string' && item['notes'].trim() !== '' ? item['notes'].trim() : '';

      const summary = [zone, defectType, severity].filter(Boolean).join(' · ');
      if (summary && notes) return [`${summary} (${notes})`];
      if (summary) return [summary];
      if (notes) return [notes];
    }

    return [];
  });
}

function parseMeasurements(measurements: unknown): { key: string; value: string }[] {
  if (!measurements || typeof measurements !== 'object' || Array.isArray(measurements)) return [];
  return Object.entries(measurements as Record<string, unknown>).map(([k, v]) => ({
    key: k,
    value: String(v ?? ''),
  }));
}

function parseEnvironment(env: unknown): { key: string; value: string }[] {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return [];
  const labels: Record<string, string> = {
    humidity: 'Humidité',
    temperature: 'Température',
    wind: 'Vent',
    lighting: 'Éclairage',
  };
  return Object.entries(env as Record<string, unknown>).map(([k, v]) => ({
    key: labels[k] ?? k,
    value: typeof v === 'number' ? String(v) : String(v ?? ''),
  }));
}

// ─── Step mapper ─────────────────────────────────────────────────────────────

function buildStepViewModel(step: InterventionStep): ReportStepViewModel {
  const data = parseStepData(step);
  const qualityScores = toNumberArray(data['quality_scores']);

  let qualityScore: string;
  if (step.validation_score !== null && step.validation_score !== undefined) {
    qualityScore = `${step.validation_score}/100`;
  } else if (qualityScores.length > 0) {
    const avg = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    qualityScore = `${avg.toFixed(1)}/10`;
  } else {
    qualityScore = PLACEHOLDERS.notEvaluated;
  }

  const stepObs = Array.isArray(step.observations) ? step.observations.filter((o): o is string => typeof o === 'string') : [];
  const dataObs = toStringArray(data['observations']);
  const allObservations = [...new Set([...stepObs, ...dataObs])];

  const zones = toStringArray(data['zones']).length > 0
    ? toStringArray(data['zones'])
    : toStringArray(data['installation_zones']);

  const stepMeasurements = step.measurements ? parseMeasurements(step.measurements) : [];
  const dataMeasurements = parseMeasurements(data['measurements']);
  const measurements = stepMeasurements.length > 0 ? stepMeasurements : dataMeasurements;

  return {
    id: step.id,
    title: step.title ?? step.step_name,
    number: step.step_number,
    status: label(STEP_STATUS_LABELS, step.step_status),
    statusBadge: step.step_status,
    startedAt: formatTimestamp(step.started_at),
    completedAt: formatTimestamp(step.completed_at),
    duration: formatDurationSeconds(step.duration_seconds),
    photoCount: step.photo_count ?? 0,
    notes: nullable(getEffectiveStepNote(step, data), PLACEHOLDERS.noObservation),
    defects: parseDefects(data['defects']),
    observations: allObservations,
    zones: zones.map(zoneLabel),
    qualityScore,
    qualityScores,
    checklist: parseChecklist(data['checklist']),
    measurements,
    environment: parseEnvironment(data['environment']),
    approvedBy: nullable(step.approved_by),
    approvedAt: formatTimestamp(step.approved_at),
    rejectionReason: nullable(step.rejection_reason, ''),
  };
}

// ─── Main mapper ─────────────────────────────────────────────────────────────

export function buildInterventionReportViewModel(
  intervention: Intervention,
  steps: InterventionStep[],
  report: InterventionReport | null,
): InterventionReportViewModel {
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);
  const stepViewModels = sortedSteps.map(buildStepViewModel);

  const totalPhotos = sortedSteps.reduce((acc, s) => acc + (s.photo_count ?? 0), 0);

  const qualityCheckpoints = stepViewModels.map((s) => ({
    stepName: s.title,
    stepStatus: s.status,
    score: s.qualityScore,
  }));

  const globalScore =
    intervention.quality_score !== null && intervention.quality_score !== undefined
      ? `${intervention.quality_score}/100`
      : PLACEHOLDERS.notEvaluated;

  const finalObservations =
    Array.isArray(intervention.final_observations)
      ? intervention.final_observations.filter((o): o is string => typeof o === 'string')
      : [];

  const satisfaction =
    intervention.customer_satisfaction !== null && intervention.customer_satisfaction !== undefined
      ? `${intervention.customer_satisfaction}/10`
      : PLACEHOLDERS.notEvaluated;

  const signaturePresent =
    intervention.customer_signature !== null &&
    intervention.customer_signature !== undefined &&
    intervention.customer_signature !== '';

  const now = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    meta: {
      reportTitle: 'Rapport d\'intervention',
      generatedAt: report ? formatTimestamp(report.generated_at) : now,
      interventionId: intervention.id,
      taskNumber: nullable(intervention.task_number),
      reportNumber: report?.report_number ?? null,
    },
    summary: {
      status: label(INTERVENTION_STATUS_LABELS, intervention.status),
      statusBadge: intervention.status,
      technicianName: nullable(intervention.technician_name),
      estimatedDuration: formatDurationMinutes(intervention.estimated_duration),
      actualDuration: formatDurationMinutes(intervention.actual_duration),
      completionPercentage: Math.min(100, Math.max(0, intervention.completion_percentage ?? 0)),
      interventionType: label(INTERVENTION_TYPE_LABELS, intervention.intervention_type),
    },
    client: {
      name: nullable(intervention.client_name),
      email: nullable(intervention.client_email),
      phone: nullable(intervention.client_phone),
    },
    vehicle: {
      plate: nullable(intervention.vehicle_plate),
      make: nullable(intervention.vehicle_make),
      model: nullable(intervention.vehicle_model),
      year: intervention.vehicle_year !== null && intervention.vehicle_year !== undefined
        ? String(intervention.vehicle_year)
        : PLACEHOLDERS.notSpecified,
      color: nullable(intervention.vehicle_color),
      vin: nullable(intervention.vehicle_vin),
    },
    workConditions: {
      weather: label(WEATHER_LABELS, intervention.weather_condition),
      lighting: label(LIGHTING_LABELS, intervention.lighting_condition),
      location: label(LOCATION_LABELS, intervention.work_location),
      temperature: intervention.temperature_celsius !== null && intervention.temperature_celsius !== undefined
        ? `${intervention.temperature_celsius} °C`
        : PLACEHOLDERS.notSpecified,
      humidity: intervention.humidity_percentage !== null && intervention.humidity_percentage !== undefined
        ? `${intervention.humidity_percentage} %`
        : PLACEHOLDERS.notSpecified,
    },
    materials: {
      filmType: label(
        { standard: 'Standard', premium: 'Premium', matte: 'Mat', satin: 'Satiné', colored: 'Coloré' },
        intervention.film_type,
      ),
      filmBrand: nullable(intervention.film_brand),
      filmModel: nullable(intervention.film_model),
    },
    steps: stepViewModels,
    quality: {
      globalScore,
      checkpoints: qualityCheckpoints,
      finalObservations,
    },
    customerValidation: {
      satisfaction,
      signaturePresent,
      comments: nullable(intervention.customer_comments, PLACEHOLDERS.noObservation),
    },
    photos: {
      totalCount: totalPhotos,
      byStep: sortedSteps.map((s) => ({
        label: s.title ?? s.step_name,
        count: s.photo_count ?? 0,
      })),
    },
  };
}
