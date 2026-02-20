/**
 * @file unified.ts
 * @description Domain entity types for RPMA V2.
 *
 * This file contains **business-domain interfaces and DTOs** used across the application:
 * core entities (Task, Client, Technician), workflow execution types (TaskExecution,
 * TaskStepProgress), photo types (TaskPhoto, PhotoMetadata), audit types (AuditEvent,
 * AuditConfiguration), and domain-level statistics (TaskStatistics, WorkflowStatistics).
 *
 * **Use this file when** you need to work with business objects or data-transfer objects
 * that represent real-world entities (tasks, clients, technicians, etc.).
 *
 * @see unified.types.ts for service-layer infrastructure types (ServiceResponse, ApiError,
 * ValidationResult, etc.).
 *
 * @version 2.0
 * @date 2025-01-20
 */

import type {
  UserRole,
  PhotoType,
  TaskPriority,
  TaskStatus
} from '@/lib/backend';

import {
  WorkflowExecutionStatus,
  StepStatus,
  PhotoContext,
  AuditEventType,
  AuditCategory,
  AuditSeverity,
  PPFZone} from './enums';

// ===== CORE ENTITIES =====

/**
 * Tâche unifiée - Interface principale des tâches
 */
export interface Task {
  id: string;
  taskNumber: string;
  title?: string;
  
  // Relations
  clientId?: string;
  technicianId?: string;
  templateId?: string;
  createdBy: string;
  
  // Véhicule
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehiclePlate?: string;
  vin?: string;
  
  // PPF zones
  ppfZone?: PPFZone;
  customPpfZones: string[];
  
  // Planification
  scheduledDate?: string;
  scheduledAt?: string;
  priority?: TaskPriority;
  
  // État et progression
  status: TaskStatus;
  
  // Métadonnées
  note?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations optionnelles (pour les vues enrichies)
  client?: Client;
  technician?: Technician;
  execution?: TaskExecution;
  photos?: TaskPhoto[];
  history?: TaskHistoryEntry[];
}

/**
 * Client unifié
 */
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company_name?: string;
  customer_type: 'individual' | 'business' | null;
  notes?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields
  task_count?: number;
  last_task_date?: string;
  total_spent?: number;
}

/**
 * Technicien unifié
 */
export interface Technician {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  
  // Informations étendues
  skills?: string[];
  availability?: TechnicianAvailability;
  performance?: TechnicianPerformance;
}



// ===== WORKFLOW EXECUTION =====

/**
 * Exécution de workflow unifiée
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  templateId: string;
  currentStepId?: string;
  status: WorkflowExecutionStatus;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  createdBy: string;
  
  // Contexte d'exécution
  executionContext: ExecutionContext;
  
  // Relations
  currentStep?: TaskStepProgress;
  steps: TaskStepProgress[];
  
  // Progression calculée
  progressPercentage: number;
  estimatedCompletionTime?: string;
  totalDuration?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Progression d'une étape
 */
export interface TaskStepProgress {
  id: string;
  taskExecutionId: string;
  stepId: string;
  stepOrder: number;
  status: StepStatus;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  notes?: string;
  
  // Documentation
  photos: string[];
  checklistCompletion: Record<string, boolean>;
  
  // Contrôle qualité
  requiresQC: boolean;
  qcApprovedAt?: string;
  qcApprovedBy?: string;
  
  // Utilisateurs
  startedBy?: string;
  completedBy?: string;
  
  // Relations
  timings: WorkflowTiming[];
  checklistItems: WorkflowChecklistItem[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Timing de workflow
 */
export interface WorkflowTiming {
  id: string;
  stepProgressId: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  isPaused: boolean;
  pauseDurationSeconds: number;
  startedBy: string;
  endedBy?: string;
  createdAt: string;
}

/**
 * Item de checklist en cours d'exécution
 */
export interface WorkflowChecklistItem {
  id: string;
  stepProgressId: string;
  templateItemId: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

// ===== PHOTOS UNIFIÉES =====

/**
 * Photo de tâche unifiée
 */
export interface TaskPhoto {
  id: string;
  
  // Relations hiérarchiques
  taskId: string;
  taskExecutionId?: string;
  stepId?: string;
  stepProgressId?: string;
  
  // Fichier
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  
  // Classification
  photoType: PhotoType;
  captureContext: PhotoContext;
  
  // Contenu
  title?: string;
  description?: string;
  notes?: string;
  
  // Métadonnées techniques
  metadata: PhotoMetadata;
  
  // Validation et approbation
  isRequired: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // Traçabilité
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Métadonnées des photos
 */
export interface PhotoMetadata {
  // Contexte de capture
  captureContext: PhotoContext;
  stepId?: string;
  checklistItemId?: string;
  
  // Informations techniques
  cameraSettings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    flash?: boolean;
  };
  
  // Géolocalisation (avec consentement)
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // Annotations
  annotations?: Array<{
    type: 'arrow' | 'circle' | 'text';
    position: { x: number; y: number };
    content?: string;
  }>;
}

// ===== COMMON TYPES =====

// ServiceResponse is now imported from base.service.ts
/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    limit?: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, unknown>;
}

/**
 * Query parameters for filtering and pagination
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

// ===== AUDIT UNIFIÉ =====

/**
 * Événement d'audit unifié
 */
export interface AuditEvent {
  id: string;
  
  // Contexte événement
  eventId: string;
  eventType: AuditEventType;
  eventCategory: AuditCategory;
  
  // Entité concernée
  entityType: string;
  entityId: string;
  parentEntityType?: string;
  parentEntityId?: string;
  
   // Utilisateur et session
   userId: string | null;
  sessionId?: string;
  requestId?: string;
  
  // Données de changement
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  
  // Contexte technique
  ipAddress?: string;
  userAgent?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  
  // Métadonnées métier
  businessContext: Record<string, unknown>;
  complianceTags?: string[];
  severity: AuditSeverity;
  
  // Performance et résultat
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  
  // Temporalité
  occurredAt: string;
  processedAt?: string;
}

/**
 * Configuration d'audit par entité
 */
export interface AuditConfiguration {
  id: string;
  entityType: string;
  auditLevel: 'minimal' | 'standard' | 'detailed' | 'full';
  includedFields?: string[];
  excludedFields?: string[] ;
  sensitiveFields?: string[];
  trackedEvents: AuditEventType[];
  createSnapshots: boolean;
  snapshotTriggers: string[];
  retentionDays: number;
  archiveBeforeDelete: boolean;
  complianceRequirements?: string[];
  gdprApplicable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== CONTEXTES ET MÉTADONNÉES =====

/**
 * Contexte d'exécution de workflow
 */
export interface ExecutionContext {
  // Environnement
  workspaceType: 'indoor' | 'outdoor' | 'mobile';
  lighting: 'natural' | 'artificial' | 'mixed';
  temperature?: number;
  humidity?: number;
  
  // Véhicule
  vehiclePosition: string;
  vehicleCondition: string;
  
  // Équipe
  primaryTechnician: string;
  assistants?: string[];
  
  // Équipements
  tools: string[];
  materials: string[];
  
  // Client
  customerPresent: boolean;
  specialRequirements?: string[];
  
  // Métadonnées
  notes?: string;
  photos?: string[];
}

/**
 * Disponibilité technicien
 */
export interface TechnicianAvailability {
  status: 'available' | 'busy' | 'offline' | 'vacation';
  currentTaskId?: string;
  nextAvailable?: string;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
}

/**
 * Performance technicien
 */
export interface TechnicianPerformance {
  completedTasks: number;
  averageTaskDuration: number;
  qualityScore: number;
  customerSatisfaction: number;
  efficiency: number;
  lastUpdated: string;
}

/**
 * Entrée d'historique de tâche
 */
export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: string;
  changedBy: string;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  changedAt: string;
}

// ===== DTOs POUR LES APIS =====

/**
 * DTO de création de tâche
 */
export interface CreateTaskDTO {
  title: string;
  clientId?: string;
  templateId?: string;
  
  // Véhicule
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehiclePlate?: string;
  vin?: string;
  
  // PPF
  ppfZone?: PPFZone;
  customPpfZones?: string[];
  
  // Planification
  technicianId?: string;
  scheduledDate?: string;
  scheduledAt?: string;
  priority?: TaskPriority;
  
  // Client (si pas de clientId)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Métadonnées
  note?: string;
}

/**
 * DTO de mise à jour de tâche
 */
export interface UpdateTaskDTO {
  title?: string;
  status?: TaskStatus;
  technicianId?: string;
  scheduledDate?: string;
  scheduledAt?: string;
  priority?: TaskPriority;
  note?: string;
  
  // Client
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
}



/**
 * DTO de création d'item de checklist
 */
export interface CreateChecklistItemDTO {
  description: string;
  isRequired?: boolean;
  orderIndex: number;
  validationRules?: Record<string, unknown>;
}

// ===== RESPONSES ET PAGINATION =====

// ===== STATISTIQUES =====

/**
 * Statistiques des tâches
 */
export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  overdue: number;
  completionRate: number;
  averageCompletionTime: number;
  averageResponseTime: number;
}

/**
 * Statistiques des templates
 */
export interface TemplateStatistics {
  total: number;
  active: number;
  usageFrequency: Record<string, number>;
  averageExecutionTime: Record<string, number>;
  successRate: Record<string, number>;
  qualityScore: Record<string, number>;
}

/**
 * Statistiques des workflows
 */
export interface WorkflowStatistics {
  activeExecutions: number;
  completedToday: number;
  averageStepTime: number;
  bottleneckSteps: Array<{
    stepId: string;
    stepName: string;
    averageTime: number;
    frequency: number;
  }>;
  qualityIssues: number;
  retryRate: number;
}