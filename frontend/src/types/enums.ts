/**
 * Énumérations standardisées pour RPMA V2
 * Ces énums résolvent les incohérences identifiées dans les PRDs
 * @version 2.0
 * @date 2025-01-20
 */

// ===== WORKFLOW AND PPF SPECIFIC ENUMS =====

/**
 * États d'exécution des workflows
 */
export enum WorkflowExecutionStatus {
  NOT_STARTED = 'not_started',   // Template sélectionné, pas commencé
  INITIALIZING = 'initializing', // Préparation du workflow
  IN_PROGRESS = 'in_progress',   // Exécution active
  PAUSED = 'paused',            // Mis en pause
  AWAITING_QC = 'awaiting_qc',  // En attente de contrôle qualité
  COMPLETED = 'completed',       // Workflow terminé
  CANCELLED = 'cancelled',       // Workflow annulé
  FAILED = 'failed'             // Échec technique
}

/**
 * États des étapes de workflow
 */
export enum StepStatus {
  PENDING = 'pending',         // Pas encore commencée
  IN_PROGRESS = 'in_progress', // En cours d'exécution
  PAUSED = 'paused',          // Mise en pause
  AWAITING_PHOTOS = 'awaiting_photos', // En attente de photos
  AWAITING_QC = 'awaiting_qc', // En attente de validation
  COMPLETED = 'completed',     // Terminée avec succès
  SKIPPED = 'skipped',        // Étape optionnelle ignorée
  FAILED = 'failed',          // Échec de l'étape
  REWORK = 'rework'           // À refaire suite à un problème
}

/**
 * Zones PPF
 */
export enum PPFZone {
  HOOD = 'hood',
  ROOF = 'roof',
  TRUNK = 'trunk',
  FRONT_BUMPER = 'front_bumper',
  REAR_BUMPER = 'rear_bumper',
  FENDERS = 'fenders',
  DOORS = 'doors',
  MIRRORS = 'mirrors',
  ROCKERS = 'rockers',
  WHEEL_WELLS = 'wheel_wells',
  HEADLIGHTS = 'headlights',
  TAILLIGHTS = 'taillights',
  GRILLE = 'grille',
  SPOILER = 'spoiler',
  OTHER = 'other'
}

/**
 * Zones PPF étendues
 */
export enum PPFZoneExtended {
  FULL_FRONT = 'full_front',
  FULL_REAR = 'full_rear',
  FULL_VEHICLE = 'full_vehicle',
  PARTIAL_FRONT = 'partial_front',
  PARTIAL_REAR = 'partial_rear',
  CUSTOM = 'custom'
}

/**
 * Contextes de photos
 */
export enum PhotoContext {
  INSTALLATION = 'installation',
  INSPECTION = 'inspection',
  DAMAGE = 'damage',
  FINISHED = 'finished'
}

/**
 * Angles de photos PPF
 */
export enum PPFPhotoAngle {
  FRONT_LEFT = 'front_left',
  FRONT_RIGHT = 'front_right',
  FRONT_CENTER = 'front_center',
  REAR_LEFT = 'rear_left',
  REAR_RIGHT = 'rear_right',
  REAR_CENTER = 'rear_center',
  DETAIL_CLOSEUP = 'detail_closeup',
  FULL_VEHICLE = 'full_vehicle',
  OTHER = 'other'
}

/**
 * Catégories de photos PPF
 */
export enum PPFPhotoCategory {
  INSPECTION = 'inspection',
  PREPARATION = 'preparation',
  INSTALLATION = 'installation',
  FINALIZATION = 'finalization',
  VEHICLE_OVERVIEW = 'vehicle_overview',
  ZONE_DETAIL = 'zone_detail',
  INSTALLATION_PROGRESS = 'installation_progress',
  QUALITY_CHECK = 'quality_check',
  FINAL_RESULT = 'final_result'
}

/**
 * Statuts d'intervention PPF
 */
export enum PPFInterventionStatus {
  STEP_1_INSPECTION = 'step_1_inspection',
  STEP_2_PREPARATION = 'step_2_preparation',
  STEP_3_INSTALLATION = 'step_3_installation',
  STEP_4_FINALIZATION = 'step_4_finalization',
  FINALIZING = 'finalizing',
  PLANNED = 'planned',
  IN_PREPARATION = 'in_preparation',
  VEHICLE_PREPARATION = 'vehicle_preparation',
  FILM_PREPARATION = 'film_preparation',
  INSTALLATION = 'installation',
  QUALITY_CONTROL = 'quality_control',
  FINISHING = 'finishing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Types d'événements d'audit
 */
export enum AuditEventType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  VIEW = 'view',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
  FAILED_LOGIN = 'failed_login',
  PASSWORD_CHANGE = 'password_change',
  PERMISSION_CHANGE = 'permission_change',
  DATA_ACCESS = 'data_access',
  SYSTEM_ERROR = 'system_error',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation'
}

/**
 * Catégories d'audit
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_MANAGEMENT = 'data_management',
  SYSTEM_OPERATION = 'system_operation',
  BUSINESS_PROCESS = 'business_process',
  SECURITY = 'security',
  COMPLIANCE = 'compliance'
}

/**
 * Sévérité d'audit
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ===== PPF SPECIFIC ENUMS =====

// Create enum objects for PPF types to maintain backward compatibility with z.nativeEnum
export enum PPFFilmType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  MATTE = 'matte',
  COLORED = 'colored'
}

export enum PPFWeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  FOGGY = 'foggy',
  WINDY = 'windy',
  OTHER = 'other'
}

export enum PPFLightingCondition {
  NATURAL = 'natural',
  ARTIFICIAL = 'artificial',
  MIXED = 'mixed'
}

export enum PPFWorkLocation {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  SEMI_COVERED = 'semi_covered'
}