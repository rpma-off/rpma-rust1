export const PLACEHOLDERS = {
  notSpecified: 'Non renseigné',
  noObservation: 'Aucune observation',
  notEvaluated: 'Non évalué',
} as const;

export type ReportStepViewModel = {
  id: string;
  title: string;
  number: number;
  status: string;
  statusBadge: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  photoCount: number;
  notes: string;
  defects: string[];
  observations: string[];
  zones: string[];
  qualityScore: string;
  qualityScores: number[];
  checklist: { label: string; checked: boolean }[];
  measurements: { key: string; value: string }[];
  environment: { key: string; value: string }[];
  approvedBy: string;
  approvedAt: string;
  rejectionReason: string;
};

export type InterventionReportViewModel = {
  meta: {
    reportTitle: string;
    generatedAt: string;
    interventionId: string;
    taskNumber: string;
    reportNumber: string | null;
  };
  summary: {
    status: string;
    statusBadge: string;
    technicianName: string;
    estimatedDuration: string;
    actualDuration: string;
    completionPercentage: number;
    interventionType: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    plate: string;
    make: string;
    model: string;
    year: string;
    color: string;
    vin: string;
  };
  workConditions: {
    weather: string;
    lighting: string;
    location: string;
    temperature: string;
    humidity: string;
  };
  materials: {
    filmType: string;
    filmBrand: string;
    filmModel: string;
  };
  steps: ReportStepViewModel[];
  quality: {
    globalScore: string;
    checkpoints: { stepName: string; stepStatus: string; score: string }[];
    finalObservations: string[];
  };
  customerValidation: {
    satisfaction: string;
    signaturePresent: boolean;
    comments: string;
  };
  photos: {
    totalCount: number;
    byStep: { label: string; count: number }[];
  };
};
