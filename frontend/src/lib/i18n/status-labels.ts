/**
 * French label mappings for all status enums and constants
 * These provide user-friendly French translations for all enum values
 */

// Task Status Labels
export const taskStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  assigned: "Assignée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  archived: "Archivée",
  failed: "Échouée",
  overdue: "En retard",
  paused: "En pause",
  pending: "En attente",
};

// Task Priority Labels
export const taskPriorityLabels: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

// User Role Labels
export const userRoleLabels: Record<string, string> = {
  admin: "Administrateur",
  supervisor: "Superviseur",
  technician: "Technicien",
  viewer: "Observateur",
  manager: "Gestionnaire",
};

// Workflow Execution Status Labels
export const workflowExecutionStatusLabels: Record<string, string> = {
  not_started: "Non commencé",
  initializing: "Initialisation",
  in_progress: "En cours",
  paused: "En pause",
  awaiting_qc: "En attente de contrôle qualité",
  completed: "Terminé",
  cancelled: "Annulé",
  failed: "Échoué",
};

// Step Status Labels
export const stepStatusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  paused: "En pause",
  awaiting_photos: "En attente de photos",
  awaiting_qc: "En attente de validation",
  completed: "Terminée",
  skipped: "Ignorée",
  failed: "Échouée",
  rework: "À refaire",
};

// PPF Zone Labels
export const ppfZoneLabels: Record<string, string> = {
  hood: "Capot",
  roof: "Toit",
  trunk: "Coffre",
  front_bumper: "Pare-chocs avant",
  rear_bumper: "Pare-chocs arrière",
  fenders: "Ailes",
  doors: "Portes",
  mirrors: "Rétroviseurs",
  rockers: "Bas de caisse",
  wheel_wells: "Passages de roues",
  headlights: "Phares avant",
  taillights: "Feux arrière",
  grille: "Calandre",
  spoiler: "Aileron",
  other: "Autre",
};

// PPF Zone Extended Labels
export const ppfZoneExtendedLabels: Record<string, string> = {
  full_front: "Avant complet",
  full_rear: "Arrière complet",
  full_vehicle: "Véhicule complet",
  partial_front: "Avant partiel",
  partial_rear: "Arrière partiel",
  custom: "Personnalisé",
};

// Photo Context Labels
export const photoContextLabels: Record<string, string> = {
  installation: "Installation",
  inspection: "Inspection",
  damage: "Dommage",
  finished: "Terminé",
};

// PPF Photo Angle Labels
export const ppfPhotoAngleLabels: Record<string, string> = {
  front_left: "Avant gauche",
  front_right: "Avant droit",
  front_center: "Avant centre",
  rear_left: "Arrière gauche",
  rear_right: "Arrière droit",
  rear_center: "Arrière centre",
  detail_closeup: "Détail rapproché",
  full_vehicle: "Véhicule complet",
  other: "Autre",
};

// PPF Photo Category Labels
export const ppfPhotoCategoryLabels: Record<string, string> = {
  inspection: "Inspection",
  preparation: "Préparation",
  installation: "Installation",
  finalization: "Finalisation",
  vehicle_overview: "Vue d'ensemble du véhicule",
  zone_detail: "Détail de zone",
  installation_progress: "Progression de l'installation",
  quality_check: "Contrôle qualité",
  final_result: "Résultat final",
};

// PPF Intervention Status Labels
export const ppfInterventionStatusLabels: Record<string, string> = {
  step_1_inspection: "Étape 1 : Inspection",
  step_2_preparation: "Étape 2 : Préparation",
  step_3_installation: "Étape 3 : Installation",
  step_4_finalization: "Étape 4 : Finalisation",
  finalizing: "Finalisation en cours",
  planned: "Planifiée",
  in_preparation: "En préparation",
  vehicle_preparation: "Préparation du véhicule",
  film_preparation: "Préparation du film",
  installation: "Installation",
  quality_control: "Contrôle qualité",
  finishing: "Finition",
  completed: "Terminée",
  cancelled: "Annulée",
};

// Audit Event Type Labels
export const auditEventTypeLabels: Record<string, string> = {
  create: "Création",
  update: "Mise à jour",
  delete: "Suppression",
  read: "Lecture",
  view: "Consultation",
  export: "Exportation",
  login: "Connexion",
  logout: "Déconnexion",
  failed_login: "Échec de connexion",
  password_change: "Changement de mot de passe",
  permission_change: "Changement de permissions",
  data_access: "Accès aux données",
  system_error: "Erreur système",
  business_rule_violation: "Violation de règle métier",
};

// Audit Category Labels
export const auditCategoryLabels: Record<string, string> = {
  authentication: "Authentification",
  authorization: "Autorisation",
  data_management: "Gestion des données",
  system_operation: "Opération système",
  business_process: "Processus métier",
  security: "Sécurité",
  compliance: "Conformité",
};

// Audit Severity Labels
export const auditSeverityLabels: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

// PPF Film Type Labels
export const ppfFilmTypeLabels: Record<string, string> = {
  standard: "Standard",
  premium: "Premium",
  matte: "Mat",
  colored: "Coloré",
};

// PPF Weather Condition Labels
export const ppfWeatherConditionLabels: Record<string, string> = {
  sunny: "Ensoleillé",
  cloudy: "Nuageux",
  rainy: "Pluvieux",
  foggy: "Brumeux",
  windy: "Venteux",
  other: "Autre",
};

// PPF Lighting Condition Labels
export const ppfLightingConditionLabels: Record<string, string> = {
  natural: "Naturelle",
  artificial: "Artificielle",
  mixed: "Mixte",
};

// PPF Work Location Labels
export const ppfWorkLocationLabels: Record<string, string> = {
  indoor: "Intérieur",
  outdoor: "Extérieur",
  semi_covered: "Semi-couvert",
};

// Material Category Labels
export const materialCategoryLabels: Record<string, string> = {
  film: "Film",
  tool: "Outil",
  consumable: "Consommable",
  accessory: "Accessoire",
};

// Customer Type Labels
export const customerTypeLabels: Record<string, string> = {
  individual: "Particulier",
  business: "Entreprise",
};

// Generic Status Labels (for general use)
export const statusLabels: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  enabled: "Activé",
  disabled: "Désactivé",
  success: "Succès",
  error: "Erreur",
  warning: "Avertissement",
  info: "Information",
};

/**
 * Helper function to get a French label for any enum value
 * Falls back to the original value if no translation is found
 */
export function getStatusLabel(status: string, type: 'task' | 'priority' | 'role' | 'workflow' | 'step' | 'intervention' | 'audit' | 'general' = 'general'): string {
  const labelMaps: Record<string, Record<string, string>> = {
    task: taskStatusLabels,
    priority: taskPriorityLabels,
    role: userRoleLabels,
    workflow: workflowExecutionStatusLabels,
    step: stepStatusLabels,
    intervention: ppfInterventionStatusLabels,
    audit: auditEventTypeLabels,
    general: statusLabels,
  };

  const map = labelMaps[type] || statusLabels;
  return map[status] || status;
}
