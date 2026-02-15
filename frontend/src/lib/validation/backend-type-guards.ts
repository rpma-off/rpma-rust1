/**
 * Runtime type guards for backend types
 *
 * These type guards provide runtime validation for IPC responses
 * to ensure they match the expected backend types from Rust.
 */

import { z } from 'zod';

// Import backend types for reference
import type {
  Task,
  Client,
  UserSession,
  Intervention,
  InterventionStep
} from '@/lib/backend';
import type { UserAccount } from '@/lib/types';

/**
 * Zod schemas for backend types
 * These must match the Rust serde serialization exactly
 */

// Task-related schemas
const TaskStatusSchema = z.enum([
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
  'pending',
  'invalid',
  'archived',
  'failed',
  'overdue',
  'assigned',
  'paused'
]);

const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// Client-related schemas (defined early to avoid circular dependencies)
export const CustomerTypeSchema = z.enum(['individual', 'business']);

const BigIntLikeSchema = z.union([
  z.bigint(),
  z.number().int().nonnegative().transform((value) => BigInt(value)),
  z.string().regex(/^\d+$/).transform((value) => BigInt(value)),
]);
const PaginationInfoSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: BigIntLikeSchema,
  total_pages: z.number(),
});

// Define TaskSchema first since ClientWithTasksSchema references it
const TaskSchema = z.object({
  id: z.string(),
  task_number: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  vehicle_plate: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_year: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vin: z.string().nullable(),
   ppf_zones: z.array(z.string()).nullable(),
   custom_ppf_zones: z.array(z.string()).nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  technician_id: z.string().nullable(),
  assigned_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  assigned_by: z.string().nullable(),
  scheduled_date: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  start_time: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  end_time: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  date_rdv: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  heure_rdv: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  template_id: z.string().nullable(),
  workflow_id: z.string().nullable(),
  workflow_status: z.string().nullable(),
  current_workflow_step_id: z.string().nullable(),
  started_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  completed_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  completed_steps: z.string().nullable(),
  client_id: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_email: z.string().nullable(),
  customer_phone: z.string().nullable(),
  customer_address: z.string().nullable(),
  external_id: z.string().nullable(),
  lot_film: z.string().nullable(),
  checklist_completed: z.boolean(),
  notes: z.string().nullable(),
  tags: z.string().nullable(),
  estimated_duration: z.number().nullable(),
  actual_duration: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  creator_id: z.string().nullable(),
   created_by: z.string().nullable(),
   updated_by: z.string().nullable(),
   deleted_at: z.string().nullable(),
   deleted_by: z.string().nullable(),
   synced: z.boolean(),
   last_synced_at: z.string().nullable(),
 });

// Client-related schemas
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  customer_type: CustomerTypeSchema,
  address_street: z.string().nullable(),
  address_city: z.string().nullable(),
  address_state: z.string().nullable(),
  address_zip: z.string().nullable(),
  address_country: z.string().nullable(),
  tax_id: z.string().nullable(),
  company_name: z.string().nullable(),
  contact_person: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.string().nullable(),
  total_tasks: z.number(),
  active_tasks: z.number(),
  completed_tasks: z.number(),
  last_task_date: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_by: z.string().nullable(),
  deleted_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  deleted_by: z.string().nullable(),
  synced: z.boolean(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
});

const ClientStatisticsSchema = z.object({
  total_clients: BigIntLikeSchema,
  individual_clients: BigIntLikeSchema,
  business_clients: BigIntLikeSchema,
  clients_with_tasks: BigIntLikeSchema,
  new_clients_this_month: BigIntLikeSchema,
});

const ClientListResponseSchema = z.object({
  data: z.array(ClientSchema),
  pagination: PaginationInfoSchema,
  statistics: ClientStatisticsSchema.nullable(),
});

// Define TaskWithDetailsSchema as alias to TaskSchema (since it's referenced but not defined)
const TaskWithDetailsSchema = TaskSchema;

// Client-related schemas
const ClientWithTasksSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  customer_type: CustomerTypeSchema,
  address_street: z.string().nullable(),
  address_city: z.string().nullable(),
  address_state: z.string().nullable(),
  address_zip: z.string().nullable(),
  address_country: z.string().nullable(),
  tax_id: z.string().nullable(),
  company_name: z.string().nullable(),
  contact_person: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.string().nullable(),
  total_tasks: z.number(),
  active_tasks: z.number(),
  completed_tasks: z.number(),
  last_task_date: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_by: z.string().nullable(),
  deleted_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  deleted_by: z.string().nullable(),
  synced: z.boolean(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  tasks: z.array(TaskSchema).nullable(),
});

const TaskListResponseSchema = z.object({
  data: z.array(TaskWithDetailsSchema),
  pagination: PaginationInfoSchema,
  statistics: z.any().nullable(),
});

// User-related schemas
export const UserRoleSchema = z.enum(['admin', 'technician', 'supervisor', 'viewer']);

export const UserAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: UserRoleSchema,
  password_hash: z.string(),
  salt: z.string().nullable(),
  phone: z.string().nullable(),
  is_active: z.boolean(),
  last_login: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  login_count: z.number(),
  preferences: z.string().nullable(),
  synced: z.boolean(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  name: z.string().optional(), // backward compatibility
});

export const UserSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  username: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  token: z.string(),
  refresh_token: z.string().nullable(),
  expires_at: z.union([z.string(), z.number()]).transform(val =>
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  last_activity: z.union([z.string(), z.number()]).transform(val =>
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.union([z.string(), z.number()]).transform(val =>
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  device_info: z.object({
    device_type: z.string(),
    os: z.string(),
    browser: z.string().nullable(),
    device_name: z.string().nullable(),
  }).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  location: z.string().nullable(),
  two_factor_verified: z.boolean(),
  session_timeout_minutes: z.number().nullable(),
});

// Intervention schemas
export const InterventionStatusSchema = z.enum([
  'pending',
  'in_progress',
  'paused',
  'completed',
  'cancelled'
]);

export const InterventionTypeSchema = z.enum([
  'ppf',
  'ceramic',
  'detailing',
  'other'
]);

export const InterventionSchema = z.object({
  id: z.string(),
  task_number: z.string().nullable(),
  status: InterventionStatusSchema,
  vehicle_plate: z.string(),
  vehicle_model: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_year: z.number().nullable(),
  vehicle_color: z.string().nullable(),
  vehicle_vin: z.string().nullable(),
  client_id: z.string().nullable(),
  client_name: z.string().nullable(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  technician_id: z.string().nullable(),
  technician_name: z.string().nullable(),
  intervention_type: InterventionTypeSchema,
  current_step: z.number(),
  completion_percentage: z.number(),
  ppf_zones_config: z.array(z.string()).nullable(),
  film_type: z.string().nullable(), // FilmType enum
  film_brand: z.string().nullable(),
  film_model: z.string().nullable(),
  scheduled_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  started_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  completed_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  paused_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  estimated_duration: z.number().nullable(),
  actual_duration: z.number().nullable(),
  weather_condition: z.string().nullable(), // WeatherCondition enum
  lighting_condition: z.string().nullable(), // LightingCondition enum
  work_location: z.string().nullable(), // WorkLocation enum
  temperature_celsius: z.number().nullable(),
  humidity_percentage: z.number().nullable(),
  start_location_lat: z.number().nullable(),
  start_location_lon: z.number().nullable(),
  start_location_accuracy: z.number().nullable(),
  end_location_lat: z.number().nullable(),
  end_location_lon: z.number().nullable(),
  end_location_accuracy: z.number().nullable(),
  customer_satisfaction: z.number().nullable(),
  quality_score: z.number().nullable(),
  final_observations: z.array(z.string()).nullable(),
  customer_signature: z.string().nullable(),
  customer_comments: z.string().nullable(),
  notes: z.string().nullable(),
  special_instructions: z.string().nullable(),
  app_version: z.string().nullable(),
  synced: z.boolean(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  sync_error: z.string().nullable(),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
});

// Step schemas
export const StepTypeSchema = z.enum([
  'inspection',
  'preparation',
  'installation',
  'finalization'
]);

export const StepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'paused',
  'completed',
  'failed',
  'skipped',
  'rework'
]);

export const InterventionStepSchema = z.object({
  id: z.string(),
  intervention_id: z.string(),
  step_number: z.number(),
  step_name: z.string(),
  step_type: StepTypeSchema,
  step_status: StepStatusSchema,
  description: z.string().nullable(),
  quality_checkpoints: z.array(z.string()).nullable(),
  is_mandatory: z.boolean(),
  requires_photos: z.boolean(),
  min_photos_required: z.number(),
  max_photos_allowed: z.number(),
  started_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  completed_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  paused_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  duration_seconds: z.number().nullable(),
  estimated_duration_seconds: z.number().nullable(),
  observations: z.array(z.string()).nullable(),
  photo_count: z.number(),
  required_photos_completed: z.boolean(),
  photo_urls: z.array(z.string()).nullable(),
  validation_errors: z.array(z.string()).nullable(),
  validation_score: z.number().nullable(),
  requires_supervisor_approval: z.boolean(),
  approved_by: z.string().nullable(),
  approved_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  rejection_reason: z.string().nullable(),
  location_lat: z.number().nullable(),
  location_lon: z.number().nullable(),
  location_accuracy: z.number().nullable(),
  device_timestamp: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  server_timestamp: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  title: z.string().nullable(),
  notes: z.string().nullable(),
  synced: z.boolean(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.string(),
  updated_at: z.string(),
});

// Notification schemas
export const NotificationChannelSchema = z.enum(['Email', 'Sms', 'Push']);

export const NotificationTypeSchema = z.enum([
  'TaskAssignment',
  'TaskUpdate',
  'TaskCompletion',
  'StatusChange',
  'OverdueWarning',
  'SystemAlert',
  'NewAssignment',
  'DeadlineReminder',
  'QualityApproval'
]);

export const NotificationPrioritySchema = z.enum(['Low', 'Normal', 'High', 'Critical']);

export const NotificationStatusSchema = z.enum(['Pending', 'Sent', 'Failed', 'Cancelled']);

export const EmailProviderSchema = z.enum(['SendGrid', 'Mailgun', 'Smtp']);

export const SmsProviderSchema = z.enum(['Twilio', 'AwsSns']);

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  notification_type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  subject_template: z.string(),
  body_template: z.string(),
  variables: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
});

export const NotificationMessageSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  notification_type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  recipient: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  priority: NotificationPrioritySchema,
  status: NotificationStatusSchema,
  scheduled_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  sent_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  error_message: z.string().nullable(),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
});

export const EmailConfigSchema = z.object({
  provider: EmailProviderSchema,
  api_key: z.string(),
  from_email: z.string(),
  from_name: z.string(),
});

export const SmsConfigSchema = z.object({
  provider: SmsProviderSchema,
  api_key: z.string(),
  from_number: z.string(),
});

export const NotificationConfigSchema = z.object({
  email: EmailConfigSchema.nullable(),
  sms: SmsConfigSchema.nullable(),
  push_enabled: z.boolean(),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  timezone: z.string(),
});

export const TemplateVariablesSchema = z.object({
  user_name: z.string().nullable(),
  task_title: z.string().nullable(),
  task_id: z.string().nullable(),
  client_name: z.string().nullable(),
  due_date: z.string().nullable(),
  status: z.string().nullable(),
  priority: z.string().nullable(),
  assignee_name: z.string().nullable(),
  system_message: z.string().nullable(),
});

// Photo schemas (corrected to match backend.ts)
export const PhotoTypeSchema = z.enum(['before', 'during', 'after']);

export const PhotoCategorySchema = z.enum([
  'vehicle_condition',
  'workspace',
  'step_progress',
  'qc_check',
  'final_result',
  'other'
]);

export const PhotoSchema = z.object({
  id: z.string(),
  intervention_id: z.string(),
  step_id: z.string().nullable(),
  step_number: z.number().nullable(),
  file_path: z.string(),
  file_name: z.string().nullable(),
  file_size: z.number().nullable(),
  mime_type: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  photo_type: PhotoTypeSchema.nullable(),
  photo_category: PhotoCategorySchema.nullable(),
  photo_angle: z.string().nullable(),
  zone: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  gps_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().nullable()
  }).nullable(),
  quality_score: z.number().nullable(),
  blur_score: z.number().nullable(),
  exposure_score: z.number().nullable(),
  composition_score: z.number().nullable(),
  is_required: z.boolean(),
  is_approved: z.boolean(),
  approved_by: z.string().nullable(),
  approved_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  rejection_reason: z.string().nullable(),
  synced: z.boolean(),
  storage_url: z.string().nullable(),
  upload_retry_count: z.number(),
  upload_error: z.string().nullable(),
  last_synced_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  captured_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  uploaded_at: z.union([z.string(), z.number()]).nullable().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
});

// Settings schemas
export const GeneralSettingsSchema = z.object({
  auto_save: z.boolean(),
  language: z.string(),
  timezone: z.string(),
  date_format: z.string(),
  currency: z.string(),
});

export const SecuritySettingsSchema = z.object({
  two_factor_enabled: z.boolean(),
  session_timeout: z.number(),
  password_min_length: z.number(),
  password_require_special_chars: z.boolean(),
  password_require_numbers: z.boolean(),
  login_attempts_max: z.number(),
});

export const NotificationSettingsSchema = z.object({
  push_notifications: z.boolean(),
  email_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  task_assignments: z.boolean(),
  task_completions: z.boolean(),
  system_alerts: z.boolean(),
  daily_digest: z.boolean(),
});

export const AppearanceSettingsSchema = z.object({
  dark_mode: z.boolean(),
  primary_color: z.string(),
  font_size: z.string(),
  compact_view: z.boolean(),
});

export const DataManagementSettingsSchema = z.object({
  auto_backup: z.boolean(),
  backup_frequency: z.string(),
  retention_days: z.number(),
  export_format: z.string(),
  compression_enabled: z.boolean(),
});

export const DatabaseSettingsSchema = z.object({
  connection_status: z.string(),
  last_backup: z.string().nullable(),
  database_size: z.string(),
  connection_pool_size: z.number(),
  query_timeout: z.number(),
});

export const IntegrationSettingsSchema = z.object({
  api_enabled: z.boolean(),
  webhook_url: z.string().nullable(),
  external_services: z.array(z.string()),
  sync_interval: z.number(),
});

export const PerformanceSettingsSchema = z.object({
  cache_enabled: z.boolean(),
  cache_size: z.number(),
  max_concurrent_tasks: z.number(),
  memory_limit: z.number(),
  cpu_limit: z.number(),
});

export const BackupSettingsSchema = z.object({
  auto_backup: z.boolean(),
  backup_location: z.string(),
  encryption_enabled: z.boolean(),
  compression_level: z.number(),
  include_attachments: z.boolean(),
});

export const DiagnosticSettingsSchema = z.object({
  logging_level: z.string(),
  performance_monitoring: z.boolean(),
  error_reporting: z.boolean(),
  health_checks_enabled: z.boolean(),
  metrics_collection: z.boolean(),
});

export const AppSettingsSchema = z.object({
  general: GeneralSettingsSchema,
  security: SecuritySettingsSchema,
  notifications: NotificationSettingsSchema,
  appearance: AppearanceSettingsSchema,
  data_management: DataManagementSettingsSchema,
});

export const SystemConfigurationSchema = z.object({
  database: DatabaseSettingsSchema,
  integrations: IntegrationSettingsSchema,
  performance: PerformanceSettingsSchema,
  backup: BackupSettingsSchema,
  diagnostics: DiagnosticSettingsSchema,
});

// Common schemas
export const FilmTypeSchema = z.enum(['standard', 'premium', 'matte', 'colored']);

export const GpsLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
});

export const LightingConditionSchema = z.enum(['natural', 'artificial', 'mixed']);

export const WeatherConditionSchema = z.enum(['sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'other']);

export const WorkLocationSchema = z.enum(['indoor', 'outdoor', 'semi_covered']);

// Sync schemas (corrected)
export const EntityTypeSchema = z.enum(['task', 'client', 'intervention', 'step', 'photo', 'user']);

export const OperationTypeSchema = z.enum(['create', 'update', 'delete']);

export const SyncStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'abandoned']);

export const SyncOperationSchema = z.object({
  id: z.number().nullable(),
  operation_type: OperationTypeSchema,
  entity_type: EntityTypeSchema,
  entity_id: z.string(),
  dependencies: z.array(z.string()),
  timestamp_utc: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  retry_count: z.number(),
  max_retries: z.number(),
  last_error: z.string().nullable(),
  status: SyncStatusSchema,
  created_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
});

export const SyncQueueMetricsSchema = z.object({
  pending_operations: z.number(),
  processing_operations: z.number(),
  completed_operations: z.number(),
  failed_operations: z.number(),
  abandoned_operations: z.number(),
  oldest_pending_age_seconds: z.number().nullable(),
  average_retry_count: z.number(),
});

// Response schemas for IPC calls
export const StartInterventionResponseSchema = z.object({
  type: z.literal("Started"),
  intervention: InterventionSchema,
  steps: z.array(InterventionStepSchema)
});
export const AdvanceStepResponseSchema = z.object({
  step: InterventionStepSchema,
  next_step: InterventionStepSchema.nullable(),
  progress_percentage: z.number()
});
export const FinalizeInterventionMetricsSchema = z.object({
  total_duration_minutes: z.number().nullable(),
  efficiency_score: z.number().nullable(),
  quality_score: z.number().nullable(),
  certificates_generated: z.boolean().nullable()
});
export const FinalizeInterventionResponseSchema = z.object({
  intervention: InterventionSchema,
  metrics: FinalizeInterventionMetricsSchema
});
export const GetProgressResponseSchema = z.object({
  steps: z.array(InterventionStepSchema),
  progress_percentage: z.number()
});

/**
 * Type guard functions
 * These functions validate runtime data against the schemas
 */
export function isTask(data: unknown): data is Task {
  try {
    TaskSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isClient(data: unknown): data is Client {
  try {
    ClientSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isUserAccount(data: unknown): data is UserAccount {
  try {
    UserAccountSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Array type guards
 */
export function isTaskArray(data: unknown): data is Task[] {
  try {
    z.array(TaskSchema).parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isClientArray(data: unknown): data is Client[] {
  try {
    z.array(ClientSchema).parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validation helper functions
 */
export function validateTask(data: unknown): Task {
  return TaskSchema.parse(data);
}

export function validateClient(data: unknown): Client {
  return ClientSchema.parse(data);
}

export function validateUserAccount(data: unknown): UserAccount {
  return UserAccountSchema.parse(data);
}

export function validateUserSession(data: unknown): UserSession {
  return UserSessionSchema.parse(data);
}

/**
 * Safe validation functions that return null on failure
 */
export function safeValidateTask(data: unknown): Task | null {
  try {
    return TaskSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateClient(data: unknown): Client | null {
  try {
    return ClientSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateUserAccount(data: unknown): UserAccount | null {
  try {
    return UserAccountSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateUserSession(data: unknown): UserSession | null {
  try {
    return UserSessionSchema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Validation result types
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Advanced validation functions with detailed error reporting
 */
export function validateTaskDetailed(data: unknown): ValidationResult<Task> {
  try {
    const result = TaskSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'Task validation failed',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.code === 'invalid_type' ? data : undefined
        }))
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

export function validateClientDetailed(data: unknown): ValidationResult<Client> {
  try {
    const result = ClientSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'Client validation failed',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.code === 'invalid_type' ? data : undefined
        }))
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

export function validateUserAccountDetailed(data: unknown): ValidationResult<UserAccount> {
  try {
    const result = UserAccountSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: 'UserAccount validation failed',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.code === 'invalid_type' ? data : undefined
        }))
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Type assertion functions (throw on failure)
 */
export function assertIsTask(data: unknown): asserts data is Task {
  const result = validateTaskDetailed(data);
  if (!result.success) {
    throw new Error(`Type assertion failed: ${result.error}`);
  }
}

export function assertIsClient(data: unknown): asserts data is Client {
  const result = validateClientDetailed(data);
  if (!result.success) {
    throw new Error(`Type assertion failed: ${result.error}`);
  }
}

export function assertIsUserAccount(data: unknown): asserts data is UserAccount {
  const result = validateUserAccountDetailed(data);
  if (!result.success) {
    throw new Error(`Type assertion failed: ${result.error}`);
  }
}

/**
 * Utility functions for common validation patterns
 */
export function validateRequiredString(value: unknown, fieldName: string): ValidationResult<string> {
  if (typeof value !== 'string') {
    return {
      success: false,
      error: `${fieldName} must be a string`,
      details: [{ field: fieldName, message: 'Must be a string', value }]
    };
  }

  if (value.trim().length === 0) {
    return {
      success: false,
      error: `${fieldName} cannot be empty`,
      details: [{ field: fieldName, message: 'Cannot be empty', value }]
    };
  }

  return { success: true, data: value.trim() };
}

export function validateOptionalString(value: unknown, fieldName: string): ValidationResult<string | null> {
  if (value === null || value === undefined) {
    return { success: true, data: null };
  }

  if (typeof value !== 'string') {
    return {
      success: false,
      error: `${fieldName} must be a string or null`,
      details: [{ field: fieldName, message: 'Must be a string or null', value }]
    };
  }

  return { success: true, data: value.trim() };
}

export function validateEmail(value: unknown, fieldName: string): ValidationResult<string> {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.success) {
    return stringResult;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(stringResult.data!)) {
    return {
      success: false,
      error: `${fieldName} must be a valid email address`,
      details: [{ field: fieldName, message: 'Must be a valid email address', value: stringResult.data }]
    };
  }

  return { success: true, data: stringResult.data! };
}

export function validateEnum<T extends Record<string, string | number>>(
  value: unknown,
  enumObject: T,
  fieldName: string
): ValidationResult<T[keyof T]> {
  const validValues = Object.values(enumObject);

  if (!validValues.includes(value as T[keyof T])) {
    return {
      success: false,
      error: `${fieldName} must be one of: ${validValues.join(', ')}`,
      details: [{
        field: fieldName,
        message: `Must be one of: ${validValues.join(', ')}`,
        value
      }]
    };
  }

  return { success: true, data: value as T[keyof T] };
}

/**
 * Batch validation utilities
 */
export function validateMultiple<T>(
  items: unknown[],
  validator: (item: unknown) => ValidationResult<T>
): ValidationResult<T[]> {
  const results: T[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i]);
    if (result.success && result.data !== undefined) {
      results.push(result.data);
    } else {
      errors.push(...(result.details || []).map(error => ({
        ...error,
        field: `[${i}].${error.field}`
      })));
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed for ${errors.length} item(s)`,
      details: errors
    };
  }

  return { success: true, data: results };
}

/**
 * IPC-specific validation helpers
 */
// Validation functions for new schemas
export function validateIntervention<T = Intervention>(data: unknown): T {
  return InterventionSchema.parse(data) as T;
}

export function validateInterventionStep<T = InterventionStep>(data: unknown): T {
  return InterventionStepSchema.parse(data) as T;
}

export function validateNotificationTemplate(data: unknown): unknown {
  return NotificationTemplateSchema.parse(data);
}

export function validateNotificationMessage(data: unknown): unknown {
  return NotificationMessageSchema.parse(data);
}

export function validateNotificationConfig(data: unknown): unknown {
  return NotificationConfigSchema.parse(data);
}

export function validateAppSettings(data: unknown): unknown {
  return AppSettingsSchema.parse(data);
}

export function validateSystemConfiguration(data: unknown): unknown {
  return SystemConfigurationSchema.parse(data);
}

export function validateGpsLocation(data: unknown): unknown {
  return GpsLocationSchema.parse(data);
}

export function validateSyncOperation(data: unknown): unknown {
  return SyncOperationSchema.parse(data);
}

export function validateSyncQueueMetrics(data: unknown): unknown {
  return SyncQueueMetricsSchema.parse(data);
}

// Safe validation functions
export function safeValidateIntervention(data: unknown): unknown | null {
  try {
    return InterventionSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateInterventionStep(data: unknown): unknown | null {
  try {
    return InterventionStepSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateNotificationTemplate(data: unknown): unknown | null {
  try {
    return NotificationTemplateSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateNotificationMessage(data: unknown): unknown | null {
  try {
    return NotificationMessageSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateNotificationConfig(data: unknown): unknown | null {
  try {
    return NotificationConfigSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateAppSettings(data: unknown): unknown | null {
  try {
    return AppSettingsSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateSystemConfiguration(data: unknown): unknown | null {
  try {
    return SystemConfigurationSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateGpsLocation(data: unknown): unknown | null {
  try {
    return GpsLocationSchema.parse(data);
  } catch {
    return null;
  }
}

export function validateFinalizeInterventionResponse(data: unknown): z.infer<typeof FinalizeInterventionResponseSchema> {
  return FinalizeInterventionResponseSchema.parse(data);
}

export function validateGetProgressResponse(data: unknown): z.infer<typeof GetProgressResponseSchema> {
  return GetProgressResponseSchema.parse(data);
}

export function validateStartInterventionResponse(data: unknown): z.infer<typeof StartInterventionResponseSchema> {
  return StartInterventionResponseSchema.parse(data);
}

export function safeValidateStartInterventionResponse(data: unknown): z.infer<typeof StartInterventionResponseSchema> {
  try {
    return StartInterventionResponseSchema.parse(data);
  } catch (error) {
    console.error('StartInterventionResponse validation failed:', error);
    throw new Error(`Invalid start intervention response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function safeValidateAdvanceStepResponse(data: unknown): z.infer<typeof AdvanceStepResponseSchema> {
  try {
    return AdvanceStepResponseSchema.parse(data);
  } catch (error) {
    console.error('AdvanceStepResponse validation failed:', error);
    throw new Error(`Invalid advance step response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function safeValidateFinalizeInterventionResponse(data: unknown): z.infer<typeof FinalizeInterventionResponseSchema> {
  try {
    return FinalizeInterventionResponseSchema.parse(data);
  } catch (error) {
    console.error('FinalizeInterventionResponse validation failed:', error);
    throw new Error(`Invalid finalize intervention response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function safeValidateGetProgressResponse(data: unknown): z.infer<typeof GetProgressResponseSchema> {
  try {
    return GetProgressResponseSchema.parse(data);
  } catch (error) {
    console.error('GetProgressResponse validation failed:', error);
    throw new Error(`Invalid get progress response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateIpcResponse<T>(
  response: unknown,
  typeGuard: (data: unknown) => data is T
): ValidationResult<T> {
  // Check if it's a valid IPC response structure
  if (!response || typeof response !== 'object') {
    return {
      success: false,
      error: 'Invalid IPC response structure',
      details: [{ field: 'response', message: 'Must be an object', value: response }]
    };
  }

  const resp = response as Record<string, unknown>;

  // Check for ApiResponse structure
  if (typeof resp.success === 'boolean') {
    if (!resp.success) {
      const errorMessage = typeof resp.error === 'string' ? resp.error : 'IPC call failed';
      return {
        success: false,
        error: errorMessage,
        details: typeof resp.error === 'string' ? [{ field: 'error', message: resp.error }] : undefined
      };
    }

    if (!typeGuard(resp.data)) {
      return {
        success: false,
        error: 'Response data does not match expected type',
        details: [{ field: 'data', message: 'Type validation failed', value: resp.data }]
      };
    }

    return { success: true, data: resp.data };
  }

  // Check for tagged union response (like ClientResponse)
  if (resp.type && typeof resp.type === 'string') {
    const successTypes = ['Created', 'Found', 'Updated', 'List', 'SearchResults', 'Stats'];
    if (successTypes.includes(resp.type)) {
      const { type, ...data } = resp;
      if (!typeGuard(data)) {
        return {
          success: false,
          error: `Response data does not match expected type for ${type}`,
          details: [{ field: 'data', message: 'Type validation failed', value: data }]
        };
      }
      return { success: true, data };
    } else if (resp.type === 'NotFound') {
      return {
        success: false,
        error: 'Not found',
        details: [{ field: 'type', message: 'Resource not found' }]
      };
    }
  }

  return {
    success: false,
    error: 'Unknown IPC response format',
    details: [{ field: 'response', message: 'Unrecognized response structure', value: response }]
  };
}

// Additional validation functions for IPC responses
export function validateClientWithTasks(data: unknown): data is import('@/lib/backend').ClientWithTasks {
  return ClientWithTasksSchema.safeParse(data).success;
}

export function validateClientListResponse(data: unknown): data is import('@/lib/backend').ClientListResponse {
  return ClientListResponseSchema.safeParse(data).success;
}

export function validateClientWithTasksList(data: unknown): data is Array<import('@/lib/backend').ClientWithTasks> {
  return z.array(ClientWithTasksSchema).safeParse(data).success;
}

export function parseClientStatistics(data: unknown): import('@/lib/backend').ClientStatistics {
  return ClientStatisticsSchema.parse(data);
}

export function validateClientStatistics(data: unknown): data is import('@/lib/backend').ClientStatistics {
  return ClientStatisticsSchema.safeParse(data).success;
}

export function validateTaskListResponse(data: unknown): data is import('@/lib/backend').TaskListResponse {
  return TaskListResponseSchema.safeParse(data).success;
}
