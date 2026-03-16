// We only compile this file for the export-types binary, not the main app

// Note: serde_json::Value is handled via #[ts(type = "JsonValue")] attributes in the model definitions
use ts_rs::TS;

// Import models from canonical domain paths
use rpma_ppf_intervention::domains::calendar::models::{
    CalendarDateRange, CalendarFilter, CalendarTask, CalendarTaskPriority, CalendarTaskStatus,
    CalendarEvent, CreateEventInput, EventParticipant, EventStatus, EventType, ParticipantStatus,
    UpdateEventInput, ConflictDetection,
};
use rpma_ppf_intervention::domains::clients::client_handler::{
    Client, ClientListResponse, ClientQuery, ClientStatistics, ClientWithTasks,
    CreateClientRequest, CustomerType, UpdateClientRequest,
};
use rpma_ppf_intervention::domains::documents::models::{
    InterventionReport, InterventionReportResult, Photo, PhotoCategory, PhotoType, ReportCapabilities,
};
use rpma_ppf_intervention::domains::interventions::domain::models::intervention::{
    BulkUpdateInterventionRequest, Intervention, InterventionFilter, InterventionProgress,
    InterventionStatus, InterventionType,
};
use rpma_ppf_intervention::domains::interventions::domain::models::step::{
    InterventionStep, StepStatus, StepType,
};
use rpma_ppf_intervention::domains::inventory::domain::models::material::{
    InterventionMaterialSummary, InventoryDashboardData, InventoryMovementSummary, InventoryStats,
    InventoryTransaction, InventoryTransactionType, LowStockMaterial, LowStockMaterialsResponse,
    Material, MaterialCategory, MaterialConsumption, MaterialConsumptionSummary, MaterialStats,
    MaterialType, Supplier, UnitOfMeasure,
};
use rpma_ppf_intervention::domains::inventory::domain::models::material_ts::{
    InventoryTransactionTS, MaterialConsumptionTS, MaterialTS,
};
use rpma_ppf_intervention::domains::notifications::models::{
    Message, MessageListResponse, MessagePriority, MessageQuery, MessageStatus, MessageTemplate,
    MessageTemplateRequest, MessageType, NotificationPreferences, SendMessageRequest,
    UpdateNotificationPreferencesRequest,
    Notification, NotificationChannel, NotificationConfig, NotificationMessage,
    NotificationPriority, NotificationStatus, NotificationTemplate, NotificationType,
    TemplateVariables,
};
use rpma_ppf_intervention::domains::quotes::domain::models::quote::{
    AttachmentType, ConvertQuoteToTaskResponse, CreateQuoteAttachmentRequest,
    CreateQuoteItemRequest, CreateQuoteRequest, Quote, QuoteAcceptResponse, QuoteAttachment,
    QuoteExportResponse, QuoteItem, QuoteItemKind, QuoteListResponse, QuoteQuery, QuoteStatus,
    TaskCreatedInfo, UpdateQuoteAttachmentRequest, UpdateQuoteItemRequest, UpdateQuoteRequest,
};
use rpma_ppf_intervention::domains::settings::{
    AppSettings, AppearanceSettings, BackupSettings, DataManagementSettings, DatabaseSettings,
    DiagnosticSettings, GeneralSettings, IntegrationSettings, NotificationSettings,
    PerformanceSettings, SecuritySettings, StorageSettings, SystemConfiguration,
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings, UserPreferences,
    UserProfileSettings, UserSecuritySettings, UserSettings,
    CreateOrganizationRequest, OnboardingData, OnboardingStatus, Organization, OrganizationSetting,
    UpdateOrganizationRequest, UpdateOrganizationSettingsRequest,
};
use rpma_ppf_intervention::shared::contracts::sync::{
    EntityType, OperationType, SyncOperation, SyncQueueMetrics, SyncStatus,
};
use rpma_ppf_intervention::domains::tasks::domain::models::status::{
    StatusDistribution, StatusTransitionRequest,
};
use rpma_ppf_intervention::domains::tasks::domain::models::task::{
    AssignmentCheckResponse, AssignmentStatus, AvailabilityCheckResponse, AvailabilityStatus,
    BulkImportResponse, CreateTaskRequest, DeleteTaskRequest, PaginationInfo, SortOrder, Task,
    TaskHistory, TaskListResponse, TaskPhoto, TaskPriority, TaskQuery, TaskStatistics, TaskStatus,
    TaskWithDetails, UpdateTaskRequest,
};
use rpma_ppf_intervention::shared::contracts::auth::{UserAccount, UserRole, UserSession};
use rpma_ppf_intervention::shared::contracts::common::{
    FilmType, GpsLocation, LightingCondition, TimestampString, WeatherCondition, WorkLocation,
};
use rpma_ppf_intervention::shared::contracts::prediction::CompletionTimePrediction;

use rpma_ppf_intervention::shared::repositories::{base::PaginatedResult, cache::CacheStats};

// Import service request types from canonical domain paths
use rpma_ppf_intervention::domains::interventions::{
    AdvanceStepRequest, FinalizeInterventionRequest, GpsCoordinates, SaveStepProgressRequest,
    StartInterventionRequest,
};
use rpma_ppf_intervention::domains::interventions::{
    AdvanceStepResponse, FinalizeInterventionResponse, InterventionMetrics,
    InterventionStepWithPhotos, InterventionWithDetails, SaveStepProgressResponse,
    StartInterventionResponse, StepRequirement,
};

// Import command request types
use rpma_ppf_intervention::commands::UserAction;
use rpma_ppf_intervention::domains::notifications::SendNotificationRequest;
use rpma_ppf_intervention::domains::notifications::UpdateNotificationConfigRequest;
use rpma_ppf_intervention::domains::users::CreateUserRequest;
use rpma_ppf_intervention::domains::users::UpdateUserRequest;
use rpma_ppf_intervention::domains::users::UserListResponse;
use rpma_ppf_intervention::domains::users::UserResponse;
use rpma_ppf_intervention::shared::ipc::response::{ApiError, ApiResponse};

// Import intervention IPC response types
use rpma_ppf_intervention::domains::interventions::{
    InterventionManagementResponse, InterventionProgressResponse, InterventionStats,
    TechnicianInterventionStats,
};

fn main() {
    use std::fs;
    use std::path::PathBuf;

    let output_path = PathBuf::from("../frontend/src/lib/backend.ts");

    // Ensure the directory exists
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).expect("Failed to create directories");
    }

    // Generate TypeScript definitions
    let mut type_definitions = String::new();

    // Domain: common (shared types used across domains)
    type_definitions.push_str("// @domain:common\n");
    // Add header comment
    type_definitions.push_str("// Auto-generated TypeScript types from Rust backend\n");
    type_definitions.push_str("// Do not edit manually - generated by export-types.rs\n\n");
    type_definitions.push_str("// JSON value helpers (mirrors Rust serde_json::Value)\n");
    type_definitions.push_str("export type JsonPrimitive = string | number | boolean | null;\n");
    type_definitions.push_str("export type JsonValue = JsonPrimitive | JsonObject | JsonArray;\n");
    type_definitions.push_str("export type JsonObject = { [key: string]: JsonValue };\n");
    type_definitions.push_str("export type JsonArray = JsonValue[];\n\n");

    // Error types (ts-rs exports)
    type_definitions.push_str("// Error types\n");
    type_definitions
        .push_str(&ApiError::export_to_string().expect("Failed to export ApiError type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ApiResponse::<serde_json::Value>::export_to_string()
            .expect("Failed to export ApiResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str("\n\n");

    // Domain: auth
    type_definitions.push_str("// @domain:auth\n");
    // Auth types (ts-rs exports)
    type_definitions.push_str("// Auth types\n");
    type_definitions
        .push_str(&UserAccount::export_to_string().expect("Failed to export UserAccount type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UserRole::export_to_string().expect("Failed to export UserRole type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UserSession::export_to_string().expect("Failed to export UserSession type"));
    type_definitions.push_str("\n\n");

    // Domain: calendar
    type_definitions.push_str("// @domain:calendar\n");
    // Event types
    type_definitions.push_str("// Event types\n");
    type_definitions
        .push_str(&EventType::export_to_string().expect("Failed to export EventType type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &EventParticipant::export_to_string().expect("Failed to export EventParticipant type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ParticipantStatus::export_to_string().expect("Failed to export ParticipantStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&EventStatus::export_to_string().expect("Failed to export EventStatus type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateEventInput::export_to_string().expect("Failed to export CreateEventInput type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateEventInput::export_to_string().expect("Failed to export UpdateEventInput type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str("\n\n");

    // Calendar additional types
    type_definitions.push_str("// Calendar additional types\n");
    type_definitions
        .push_str(&CalendarEvent::export_to_string().expect("Failed to export CalendarEvent type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&CalendarTask::export_to_string().expect("Failed to export CalendarTask type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CalendarTaskStatus::export_to_string().expect("Failed to export CalendarTaskStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CalendarTaskPriority::export_to_string()
            .expect("Failed to export CalendarTaskPriority type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CalendarFilter::export_to_string().expect("Failed to export CalendarFilter type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ConflictDetection::export_to_string().expect("Failed to export ConflictDetection type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CalendarDateRange::export_to_string().expect("Failed to export CalendarDateRange type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: clients
    type_definitions.push_str("// @domain:clients\n");
    // Client types
    type_definitions.push_str("// Client types\n");
    type_definitions.push_str(&Client::export_to_string().expect("Failed to export Client type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ClientWithTasks::export_to_string().expect("Failed to export ClientWithTasks type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&ClientQuery::export_to_string().expect("Failed to export ClientQuery type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&CustomerType::export_to_string().expect("Failed to export CustomerType type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateClientRequest::export_to_string()
            .expect("Failed to export CreateClientRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateClientRequest::export_to_string()
            .expect("Failed to export UpdateClientRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ClientListResponse::export_to_string().expect("Failed to export ClientListResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ClientStatistics::export_to_string().expect("Failed to export ClientStatistics type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: inventory
    type_definitions.push_str("// @domain:inventory\n");
    // Material types
    type_definitions.push_str("// Material types\n");
    type_definitions
        .push_str(&MaterialType::export_to_string().expect("Failed to export MaterialType type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UnitOfMeasure::export_to_string().expect("Failed to export UnitOfMeasure type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&Material::export_to_string().expect("Failed to export Material type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&MaterialTS::export_to_string().expect("Failed to export MaterialTS type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MaterialConsumption::export_to_string()
            .expect("Failed to export MaterialConsumption type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MaterialConsumptionTS::export_to_string()
            .expect("Failed to export MaterialConsumptionTS type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&MaterialStats::export_to_string().expect("Failed to export MaterialStats type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryStats::export_to_string().expect("Failed to export InventoryStats type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryTransaction::export_to_string()
            .expect("Failed to export InventoryTransaction type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryTransactionTS::export_to_string()
            .expect("Failed to export InventoryTransactionTS type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryTransactionType::export_to_string()
            .expect("Failed to export InventoryTransactionType type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&Supplier::export_to_string().expect("Failed to export Supplier type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MaterialCategory::export_to_string().expect("Failed to export MaterialCategory type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionMaterialSummary::export_to_string()
            .expect("Failed to export InterventionMaterialSummary type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MaterialConsumptionSummary::export_to_string()
            .expect("Failed to export MaterialConsumptionSummary type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryMovementSummary::export_to_string()
            .expect("Failed to export InventoryMovementSummary type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &LowStockMaterial::export_to_string().expect("Failed to export LowStockMaterial type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &LowStockMaterialsResponse::export_to_string()
            .expect("Failed to export LowStockMaterialsResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InventoryDashboardData::export_to_string()
            .expect("Failed to export InventoryDashboardData type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: tasks
    type_definitions.push_str("// @domain:tasks\n");
    // Task types
    type_definitions.push_str("// Task types\n");
    type_definitions.push_str(&Task::export_to_string().expect("Failed to export Task type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&TaskStatus::export_to_string().expect("Failed to export TaskStatus type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&TaskPriority::export_to_string().expect("Failed to export TaskPriority type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&TaskHistory::export_to_string().expect("Failed to export TaskHistory type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AssignmentStatus::export_to_string().expect("Failed to export AssignmentStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AvailabilityStatus::export_to_string().expect("Failed to export AvailabilityStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AssignmentCheckResponse::export_to_string()
            .expect("Failed to export AssignmentCheckResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AvailabilityCheckResponse::export_to_string()
            .expect("Failed to export AvailabilityCheckResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateTaskRequest::export_to_string().expect("Failed to export CreateTaskRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateTaskRequest::export_to_string().expect("Failed to export UpdateTaskRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&TaskQuery::export_to_string().expect("Failed to export TaskQuery type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&TaskPhoto::export_to_string().expect("Failed to export TaskPhoto type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&SortOrder::export_to_string().expect("Failed to export SortOrder type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TaskWithDetails::export_to_string().expect("Failed to export TaskWithDetails type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &DeleteTaskRequest::export_to_string().expect("Failed to export DeleteTaskRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TaskListResponse::export_to_string().expect("Failed to export TaskListResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &PaginationInfo::export_to_string().expect("Failed to export PaginationInfo type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TaskStatistics::export_to_string().expect("Failed to export TaskStatistics type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &BulkImportResponse::export_to_string().expect("Failed to export BulkImportResponse type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: common (repository types)
    type_definitions.push_str("// @domain:common\n");
    // Repository types
    type_definitions.push_str("// Repository types\n");
    type_definitions.push_str(
        &PaginatedResult::<Task>::export_to_string()
            .expect("Failed to export PaginatedResult type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&CacheStats::export_to_string().expect("Failed to export CacheStats type"));
    type_definitions.push_str("\n\n");

    // Domain: documents
    type_definitions.push_str("// @domain:documents\n");
    // Photo types
    type_definitions.push_str("// Photo types\n");
    type_definitions.push_str(&Photo::export_to_string().expect("Failed to export Photo type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&PhotoType::export_to_string().expect("Failed to export PhotoType type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&PhotoCategory::export_to_string().expect("Failed to export PhotoCategory type"));
    type_definitions.push_str("\n\n");

    // Domain: quotes
    type_definitions.push_str("// @domain:quotes\n");
    // Quote types
    type_definitions.push_str("// Quote types\n");
    type_definitions
        .push_str(&QuoteStatus::export_to_string().expect("Failed to export QuoteStatus type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&QuoteItemKind::export_to_string().expect("Failed to export QuoteItemKind type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(&Quote::export_to_string().expect("Failed to export Quote type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&QuoteItem::export_to_string().expect("Failed to export QuoteItem type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&QuoteQuery::export_to_string().expect("Failed to export QuoteQuery type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &QuoteListResponse::export_to_string().expect("Failed to export QuoteListResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateQuoteRequest::export_to_string().expect("Failed to export CreateQuoteRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateQuoteRequest::export_to_string().expect("Failed to export UpdateQuoteRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateQuoteItemRequest::export_to_string()
            .expect("Failed to export CreateQuoteItemRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateQuoteItemRequest::export_to_string()
            .expect("Failed to export UpdateQuoteItemRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &QuoteAcceptResponse::export_to_string()
            .expect("Failed to export QuoteAcceptResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TaskCreatedInfo::export_to_string().expect("Failed to export TaskCreatedInfo type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &QuoteExportResponse::export_to_string()
            .expect("Failed to export QuoteExportResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AttachmentType::export_to_string().expect("Failed to export AttachmentType type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &QuoteAttachment::export_to_string().expect("Failed to export QuoteAttachment type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateQuoteAttachmentRequest::export_to_string()
            .expect("Failed to export CreateQuoteAttachmentRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateQuoteAttachmentRequest::export_to_string()
            .expect("Failed to export UpdateQuoteAttachmentRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &ConvertQuoteToTaskResponse::export_to_string()
            .expect("Failed to export ConvertQuoteToTaskResponse type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: interventions
    type_definitions.push_str("// @domain:interventions\n");
    // Intervention types
    type_definitions.push_str("// Intervention types\n");
    type_definitions
        .push_str(&Intervention::export_to_string().expect("Failed to export Intervention type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionStatus::export_to_string().expect("Failed to export InterventionStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionType::export_to_string().expect("Failed to export InterventionType type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionFilter::export_to_string().expect("Failed to export InterventionFilter type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &BulkUpdateInterventionRequest::export_to_string()
            .expect("Failed to export BulkUpdateInterventionRequest type"),
    );
    type_definitions.push_str("\n");
    // Switch to common domain for shared contract types
    type_definitions.push_str("// @domain:common\n");
    type_definitions
        .push_str(&GpsLocation::export_to_string().expect("Failed to export GpsLocation type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&FilmType::export_to_string().expect("Failed to export FilmType type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &WeatherCondition::export_to_string().expect("Failed to export WeatherCondition type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &LightingCondition::export_to_string().expect("Failed to export LightingCondition type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&WorkLocation::export_to_string().expect("Failed to export WorkLocation type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TimestampString::export_to_string().expect("Failed to export TimestampString type"),
    );
    type_definitions.push_str("\n");
    // Switch back to interventions domain
    type_definitions.push_str("// @domain:interventions\n");
    type_definitions.push_str(
        &GpsCoordinates::export_to_string().expect("Failed to export GpsCoordinates type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionStep::export_to_string().expect("Failed to export InterventionStep type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&StepType::export_to_string().expect("Failed to export StepType type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &StartInterventionRequest::export_to_string()
            .expect("Failed to export StartInterventionRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AdvanceStepRequest::export_to_string().expect("Failed to export AdvanceStepRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SaveStepProgressRequest::export_to_string()
            .expect("Failed to export SaveStepProgressRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &FinalizeInterventionRequest::export_to_string()
            .expect("Failed to export FinalizeInterventionRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &StartInterventionResponse::export_to_string()
            .expect("Failed to export StartInterventionResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AdvanceStepResponse::export_to_string()
            .expect("Failed to export AdvanceStepResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SaveStepProgressResponse::export_to_string()
            .expect("Failed to export SaveStepProgressResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &FinalizeInterventionResponse::export_to_string()
            .expect("Failed to export FinalizeInterventionResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &StepRequirement::export_to_string().expect("Failed to export StepRequirement type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionStepWithPhotos::export_to_string()
            .expect("Failed to export InterventionStepWithPhotos type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionWithDetails::export_to_string()
            .expect("Failed to export InterventionWithDetails type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionProgress::export_to_string()
            .expect("Failed to export InterventionProgress type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionMetrics::export_to_string()
            .expect("Failed to export InterventionMetrics type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&StepStatus::export_to_string().expect("Failed to export StepStatus type"));
    type_definitions.push_str("\n");
    // IPC response types for intervention management and progress
    type_definitions.push_str("// Intervention IPC response types\n");
    type_definitions.push_str(
        &TechnicianInterventionStats::export_to_string()
            .expect("Failed to export TechnicianInterventionStats type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&InterventionStats::export_to_string().expect("Failed to export InterventionStats type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionManagementResponse::export_to_string()
            .expect("Failed to export InterventionManagementResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionProgressResponse::export_to_string()
            .expect("Failed to export InterventionProgressResponse type"),
    );
    type_definitions.push_str("\n");
    // Domain: notifications
    type_definitions.push_str("// @domain:notifications\n");
    type_definitions
        .push_str(&Notification::export_to_string().expect("Failed to export Notification type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationChannel::export_to_string()
            .expect("Failed to export NotificationChannel type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationType::export_to_string().expect("Failed to export NotificationType type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationTemplate::export_to_string()
            .expect("Failed to export NotificationTemplate type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationMessage::export_to_string()
            .expect("Failed to export NotificationMessage type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationPriority::export_to_string()
            .expect("Failed to export NotificationPriority type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationStatus::export_to_string().expect("Failed to export NotificationStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &TemplateVariables::export_to_string().expect("Failed to export TemplateVariables type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationConfig::export_to_string().expect("Failed to export NotificationConfig type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateNotificationConfigRequest::export_to_string()
            .expect("Failed to export UpdateNotificationConfigRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SendNotificationRequest::export_to_string()
            .expect("Failed to export SendNotificationRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(&Message::export_to_string().expect("Failed to export Message type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&MessageType::export_to_string().expect("Failed to export MessageType type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&MessageStatus::export_to_string().expect("Failed to export MessageStatus type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MessagePriority::export_to_string().expect("Failed to export MessagePriority type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&MessageQuery::export_to_string().expect("Failed to export MessageQuery type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MessageListResponse::export_to_string()
            .expect("Failed to export MessageListResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MessageTemplate::export_to_string().expect("Failed to export MessageTemplate type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &MessageTemplateRequest::export_to_string()
            .expect("Failed to export MessageTemplateRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SendMessageRequest::export_to_string().expect("Failed to export SendMessageRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationPreferences::export_to_string()
            .expect("Failed to export NotificationPreferences type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateNotificationPreferencesRequest::export_to_string()
            .expect("Failed to export UpdateNotificationPreferencesRequest type"),
    );
    type_definitions.push_str("\n");
    // Domain: auth (user command types)
    type_definitions.push_str("// @domain:auth\n");
    type_definitions.push_str(
        &CreateUserRequest::export_to_string().expect("Failed to export CreateUserRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateUserRequest::export_to_string().expect("Failed to export UpdateUserRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UserAction::export_to_string().expect("Failed to export UserAction type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserListResponse::export_to_string().expect("Failed to export UserListResponse type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UserResponse::export_to_string().expect("Failed to export UserResponse type"));
    type_definitions.push_str("\n\n");

    // Domain: tasks (status types)
    type_definitions.push_str("// @domain:tasks\n");
    // Status types
    type_definitions.push_str("// Status types\n");
    type_definitions.push_str(
        &StatusDistribution::export_to_string().expect("Failed to export StatusDistribution type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &StatusTransitionRequest::export_to_string()
            .expect("Failed to export StatusTransitionRequest type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: sync
    type_definitions.push_str("// @domain:sync\n");
    // Sync types
    type_definitions.push_str("// Sync types\n");
    type_definitions
        .push_str(&EntityType::export_to_string().expect("Failed to export EntityType type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&SyncOperation::export_to_string().expect("Failed to export SyncOperation type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&SyncStatus::export_to_string().expect("Failed to export SyncStatus type"));
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&OperationType::export_to_string().expect("Failed to export OperationType type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SyncQueueMetrics::export_to_string().expect("Failed to export SyncQueueMetrics type"),
    );
    type_definitions.push_str("\n\n");

    // Domain: reports
    type_definitions.push_str("// @domain:reports\n");
    // Reports types
    type_definitions.push_str("// Reports types\n");
    type_definitions.push_str(
        &ReportCapabilities::export_to_string().expect("Failed to export ReportCapabilities type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionReport::export_to_string().expect("Failed to export InterventionReport type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &InterventionReportResult::export_to_string()
            .expect("Failed to export InterventionReportResult type"),
    );
    type_definitions.push_str("\n\n");
    type_definitions.push_str(
        &CompletionTimePrediction::export_to_string()
            .expect("Failed to export CompletionTimePrediction type"),
    );
    type_definitions.push_str("\n");
    // Domain: settings
    type_definitions.push_str("// @domain:settings\n");
    // Settings types
    type_definitions.push_str("// Settings types\n");
    type_definitions
        .push_str(&AppSettings::export_to_string().expect("Failed to export AppSettings type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &GeneralSettings::export_to_string().expect("Failed to export GeneralSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SecuritySettings::export_to_string().expect("Failed to export SecuritySettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &NotificationSettings::export_to_string()
            .expect("Failed to export NotificationSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &AppearanceSettings::export_to_string().expect("Failed to export AppearanceSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &DataManagementSettings::export_to_string()
            .expect("Failed to export DataManagementSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &DatabaseSettings::export_to_string().expect("Failed to export DatabaseSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &IntegrationSettings::export_to_string()
            .expect("Failed to export IntegrationSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &PerformanceSettings::export_to_string()
            .expect("Failed to export PerformanceSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &BackupSettings::export_to_string().expect("Failed to export BackupSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &DiagnosticSettings::export_to_string().expect("Failed to export DiagnosticSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &SystemConfiguration::export_to_string()
            .expect("Failed to export SystemConfiguration type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &StorageSettings::export_to_string().expect("Failed to export StorageSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserProfileSettings::export_to_string()
            .expect("Failed to export UserProfileSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserPreferences::export_to_string().expect("Failed to export UserPreferences type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserSecuritySettings::export_to_string()
            .expect("Failed to export UserSecuritySettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserPerformanceSettings::export_to_string()
            .expect("Failed to export UserPerformanceSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserAccessibilitySettings::export_to_string()
            .expect("Failed to export UserAccessibilitySettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UserNotificationSettings::export_to_string()
            .expect("Failed to export UserNotificationSettings type"),
    );
    type_definitions.push_str("\n");
    type_definitions
        .push_str(&UserSettings::export_to_string().expect("Failed to export UserSettings type"));
    type_definitions.push_str("\n\n");

    // Domain: organizations
    type_definitions.push_str("// @domain:organizations\n");
    type_definitions.push_str("// Organization types\n");
    type_definitions
        .push_str(&Organization::export_to_string().expect("Failed to export Organization type"));
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &CreateOrganizationRequest::export_to_string()
            .expect("Failed to export CreateOrganizationRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateOrganizationRequest::export_to_string()
            .expect("Failed to export UpdateOrganizationRequest type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &OnboardingStatus::export_to_string().expect("Failed to export OnboardingStatus type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &OnboardingData::export_to_string().expect("Failed to export OnboardingData type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &OrganizationSetting::export_to_string()
            .expect("Failed to export OrganizationSetting type"),
    );
    type_definitions.push_str("\n");
    type_definitions.push_str(
        &UpdateOrganizationSettingsRequest::export_to_string()
            .expect("Failed to export UpdateOrganizationSettingsRequest type"),
    );
    type_definitions.push_str("\n\n");

    // List of all types we're exporting to filter out invalid imports
    let exported_types = vec![
        "ApiError",
        "UserAccount",
        "UserRole",
        "UserSession",
        "CalendarEvent",
        "CalendarTask",
        "CalendarTaskStatus",
        "CalendarTaskPriority",
        "CalendarFilter",
        "ConflictDetection",
        "CalendarDateRange",
        "CreateEventInput",
        "UpdateEventInput",
        "ParticipantStatus",
        "Client",
        "ClientWithTasks",
        "ClientQuery",
        "CustomerType",
        "CreateClientRequest",
        "UpdateClientRequest",
        "ClientListResponse",
        "ClientStatistics",
        "Task",
        "TaskStatus",
        "TaskPriority",
        "TaskHistory",
        "AssignmentStatus",
        "AvailabilityStatus",
        "AssignmentCheckResponse",
        "AvailabilityCheckResponse",
        "CreateTaskRequest",
        "UpdateTaskRequest",
        "TaskQuery",
        "TaskPhoto",
        "SortOrder",
        "TaskWithDetails",
        "DeleteTaskRequest",
        "TaskListResponse",
        "PaginationInfo",
        "PaginatedResult",
        "CacheStats",
        "TaskStatistics",
        "BulkImportResponse",
        "Photo",
        "PhotoType",
        "PhotoCategory",
        "AttachmentType",
        "QuoteAttachment",
        "CreateQuoteAttachmentRequest",
        "UpdateQuoteAttachmentRequest",
        "ConvertQuoteToTaskResponse",
        "Intervention",
        "InterventionStatus",
        "InterventionType",
        "InterventionFilter",
        "BulkUpdateInterventionRequest",
        "InterventionStep",
        "StepType",
        "InterventionProgress",
        "InterventionMetrics",
        "StepStatus",
        "StartInterventionRequest",
        "AdvanceStepRequest",
        "SaveStepProgressRequest",
        "FinalizeInterventionRequest",
        "StartInterventionResponse",
        "AdvanceStepResponse",
        "SaveStepProgressResponse",
        "FinalizeInterventionResponse",
        "StepRequirement",
        "InterventionStepWithPhotos",
        "InterventionWithDetails",
        "NotificationChannel",
        "NotificationType",
        "NotificationTemplate",
        "NotificationMessage",
        "NotificationPriority",
        "NotificationStatus",
        "TemplateVariables",
        "NotificationConfig",
        "UpdateNotificationConfigRequest",
        "SendNotificationRequest",
        "Message",
        "MessageType",
        "MessageStatus",
        "MessagePriority",
        "MessageQuery",
        "MessageListResponse",
        "MessageTemplate",
        "MessageTemplateRequest",
        "SendMessageRequest",
        "NotificationPreferences",
        "UpdateNotificationPreferencesRequest",
        "CreateUserRequest",
        "UpdateUserRequest",
        "UserAction",
        "UserListResponse",
        "UserResponse",
        "StatusDistribution",
        "StatusTransitionRequest",
        "UserSettings",
        "EntityType",
        "SyncOperation",
        "SyncStatus",
        "OperationType",
        "SyncQueueMetrics",
        "AppSettings",
        "GeneralSettings",
        "SecuritySettings",
        "NotificationSettings",
        "AppearanceSettings",
        "DataManagementSettings",
        "DatabaseSettings",
        "IntegrationSettings",
        "PerformanceSettings",
        "BackupSettings",
        "DiagnosticSettings",
        "SystemConfiguration",
        "UserProfileSettings",
        "UserPreferences",
        "UserSecuritySettings",
        "UserPerformanceSettings",
        "UserAccessibilitySettings",
        "UserNotificationSettings",
        "UserSettings",
        "GpsLocation",
        "FilmType",
        "LightingCondition",
        "WeatherCondition",
        "WorkLocation",
        "TimestampString",
        "GpsCoordinates",
        // Reports types
        "ReportCapabilities",
        "InterventionReport",
        "InterventionReportResult",
        "CompletionTimePrediction",
        "InventoryTransactionTS",
        "LowStockMaterial",
        "LowStockMaterialsResponse",
        "InventoryDashboardData",
        // Organization types
        "Organization",
        "CreateOrganizationRequest",
        "UpdateOrganizationRequest",
        "OnboardingStatus",
        "OnboardingData",
        "OrganizationSetting",
        "UpdateOrganizationSettingsRequest",
        // Intervention IPC response types
        "TechnicianInterventionStats",
        "InterventionStats",
        "InterventionManagementResponse",
        "InterventionProgressResponse",
        // Shared IPC envelope
        "ApiResponse",
    ];

    // Post-process: remove all relative `import type` statements.
    // This is a single-file bundle — every type is defined here, so no
    // cross-file imports are needed (and they would break because the
    // individual `.ts` files don't exist alongside backend.ts).
    let _ = exported_types; // keep the list for documentation; no longer used in matching
    let mut processed_definitions = String::new();

    for line in type_definitions.lines() {
        // Drop any line that is a relative ts-rs import: `import type { X } from "./X"`
        let is_relative_import = line.starts_with("import type") && line.contains("from \"./");
        if !is_relative_import {
            processed_definitions.push_str(line);
            processed_definitions.push('\n');
        }
    }

    // Output to stdout for npm script to handle file writing
    println!("{}", processed_definitions);

    eprintln!(
        "✅ Successfully exported Rust types to TypeScript at {}",
        output_path.display()
    );
}
