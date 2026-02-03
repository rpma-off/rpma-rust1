# API Documentation

## Overview

The RPMA PPF Intervention application uses **Tauri IPC (Inter-Process Communication)** for communication between Rust backend and Next.js frontend. All API calls are made through Tauri's `invoke` function, which provides type-safe, asynchronous communication.

### Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │
│   (TypeScript)      │
└──────────┬──────────┘
           │ Tauri IPC
           │ invoke()
           ▼
┌─────────────────────┐
│   Rust Backend      │
│   (Tauri Commands)  │
└─────────────────────┘
```

### Authentication

Most endpoints require authentication via JWT tokens. The authentication flow:

1. **Login**: Call `auth_login` to obtain access and refresh tokens
2. **Include Token**: Token is stored in session and automatically included in subsequent requests
3. **Validation**: Middleware validates token on each request
4. **Refresh**: Use `auth_refresh_token` when access token expires

### Error Handling

All commands return a `Result<T, AppError>` where:
- **Success**: Returns expected data type
- **Error**: Returns structured error with code and message

**Error Types**:
```typescript
type AppError = {
  code: string;
  message: string;
  details?: any;
}
```

## Complete IPC Command Catalog (215 Commands)

### 1. Authentication Commands (10 commands)

#### `auth_login`
Authenticate user with email and password.

**Request**:
```typescript
{
  email: string;
  password: string;
  two_factor_code?: string;
  ip_address?: string;
}
```

**Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'technician' | 'supervisor' | 'viewer';
    is_active: boolean;
  };
  token: string;
  refresh_token: string;
  expires_at: string;
}
```

**Errors**:
- `INVALID_CREDENTIALS`: Invalid email or password
- `2FA_REQUIRED`: 2FA code required
- `INVALID_2FA_CODE`: Invalid 2FA code
- `ACCOUNT_DISABLED`: User account is disabled

---

#### `auth_create_account`
Create a new user account (admin only).

**Request**:
```typescript
{
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'technician' | 'supervisor' | 'viewer';
}
```

**Response**: `UserAccount`

**Errors**:
- `USER_EXISTS`: Email or username already exists
- `INVALID_ROLE`: Invalid role specified
- `WEAK_PASSWORD`: Password doesn't meet requirements

---

#### `auth_logout`
Logout user and invalidate session.

**Request**:
```typescript
{
  token: string;
}
```

**Response**: `Success`

---

#### `auth_refresh_token`
Refresh access token using refresh token.

**Request**:
```typescript
{
  refresh_token: string;
}
```

**Response**:
```typescript
{
  token: string;
  expires_at: string;
}
```

---

#### `auth_validate_session`
Validate session token and check if still valid.

**Request**:
```typescript
{
  token: string;
}
```

**Response**: `UserSession`

---

#### `enable_2fa`
Enable two-factor authentication for user.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}
```

---

#### `verify_2fa_setup`
Verify 2FA setup with verification code.

**Request**:
```typescript
{
  verification_code: string;
  backup_codes: string[];
  session_token: string;
}
```

**Response**: `Success`

---

#### `disable_2fa`
Disable 2FA with password verification.

**Request**:
```typescript
{
  password: string;
  session_token: string;
}
```

**Response**: `Success`

---

#### `is_2fa_enabled`
Check if 2FA is enabled for user.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  enabled: boolean;
}
```

---

#### `regenerate_backup_codes`
Generate new 2FA backup codes.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  backup_codes: string[];
}
```

---

#### `verify_2fa_code`
Verify TOTP code for 2FA.

**Request**:
```typescript
{
  code: string;
  session_token: string;
}
```

**Response**: `Valid` or `Invalid`

---

### 2. User Management Commands (6 commands)

#### `create_user`
Create a new user (admin function).

**Request**:
```typescript
{
  user_data: CreateUserRequest;
  session_token: string;
}
```

**Response**: `UserAccount`

---

#### `delete_user`
Delete a user (admin function).

**Request**:
```typescript
{
  user_id: string;
  session_token: string;
}
```

**Response**: `Success`

---

#### `update_user`
Update user information.

**Request**:
```typescript
{
  user_id: string;
  user_data: UpdateUserRequest;
  session_token: string;
}
```

**Response**: `UserAccount`

---

#### `update_user_status`
Activate or deactivate user.

**Request**:
```typescript
{
  user_id: string;
  is_active: boolean;
  session_token: string;
}
```

**Response**: `Success`

---

#### `get_users`
Get paginated list of users.

**Request**:
```typescript
{
  page: number;
  page_size: number;
  search?: string;
  role?: string;
  session_token: string;
}
```

**Response**:
```typescript
{
  data: UserAccount[];
  total: number;
  page: number;
  page_size: number;
}
```

---

#### `bootstrap_first_admin`
Create first admin account (only if no admins exist).

**Request**:
```typescript
{
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
}
```

**Response**: `UserAccount`

---

#### `has_admins`
Check if any admin accounts exist.

**Response**: `boolean`

---

#### `user_crud`
Facade for user CRUD operations.

**Request**:
```typescript
UserAction:
  | { action: "Create", data: CreateUserRequest }
  | { action: "Get", id: string }
  | { action: "Update", id: string, data: UpdateUserRequest }
  | { action: "Delete", id: string }
  | { action: "List", limit?: number, offset?: number }
  | { action: "ChangePassword", id: string, new_password: string }
  | { action: "ChangeRole", id: string, new_role: UserRole }
  | { action: "Ban", id: string }
  | { action: "Unban", id: string }
```

**Response**: Varies based on action

---

### 3. Task Management Commands (9 commands)

#### `task_crud`
Facade for task CRUD operations.

**Request**:
```typescript
TaskCrudRequest:
  | { action: "Create", data: TaskData }
  | { action: "Get", id: string }
  | { action: "Update", id: string, data: Partial<TaskData> }
  | { action: "Delete", id: string }
  | { action: "List", filters?: TaskFilters }
```

**Response**: Varies based on action

---

#### `edit_task`
Edit an existing task.

**Request**:
```typescript
EditTaskRequest {
  task_id: string;
  updates: Partial<TaskData>;
}
```

**Response**: `Task`

---

#### `delay_task`
Delay a task to a new date.

**Request**:
```typescript
DelayTaskRequest {
  task_id: string;
  new_date: string;
  reason?: string;
}
```

**Response**: `Task`

---

#### `export_tasks_csv`
Export tasks to CSV format.

**Request**:
```typescript
ExportTasksCsvRequest {
  filters?: TaskFilters;
  date_range?: DateRange;
}
```

**Response**:
```typescript
{
  file_path: string;
  file_name: string;
  rows_exported: number;
}
```

---

#### `import_tasks_bulk`
Bulk import tasks from CSV.

**Request**:
```typescript
ImportTasksBulkRequest {
  csv_data: string;
  validate_only?: boolean;
}
```

**Response**:
```typescript
{
  imported: number;
  failed: number;
  errors: ImportError[];
}
```

---

#### `check_task_assignment`
Check if task can be assigned to technician.

**Request**:
```typescript
CheckTaskAssignmentRequest {
  task_id: string;
  technician_id: string;
}
```

**Response**:
```typescript
{
  can_assign: boolean;
  conflicts: Conflict[];
  warnings: string[];
}
```

---

#### `check_task_availability`
Check if task slot is available.

**Request**:
```typescript
CheckTaskAvailabilityRequest {
  date: string;
  technician_id?: string;
  duration: number;
}
```

**Response**:
```typescript
{
  available: boolean;
  available_slots: TimeSlot[];
}
```

---

### 4. Client Management Commands (1 command)

#### `client_crud`
Facade for client CRUD operations.

**Request**:
```typescript
ClientCrudRequest:
  | { action: "Create", data: ClientData }
  | { action: "Get", id: string }
  | { action: "Update", id: string, data: Partial<ClientData> }
  | { action: "Delete", id: string }
  | { action: "List", filters?: ClientFilters }
  | { action: "Search", query: string, limit?: number }
  | { action: "GetStatistics", client_id: string }
```

**Response**: Varies based on action

---

### 5. Intervention Management Commands (11 commands)

#### `intervention_start`
Start a new intervention workflow.

**Request**:
```typescript
StartInterventionRequest {
  task_id: string;
  vehicle_data: VehicleData;
  ppf_config: PPFConfig;
}
```

**Response**: `Intervention`

---

#### `intervention_get`
Get intervention by ID.

**Request**:
```typescript
{
  id: string;
  session_token: string;
}
```

**Response**: `Intervention`

---

#### `intervention_get_active_by_task`
Get active intervention for a task.

**Request**:
```typescript
{
  task_id: string;
  session_token: string;
}
```

**Response**: `Intervention | null`

---

#### `intervention_get_latest_by_task`
Get most recent intervention for a task.

**Request**:
```typescript
{
  task_id: string;
  session_token: string;
}
```

**Response**: `Intervention`

---

#### `intervention_get_step`
Get specific step from intervention.

**Request**:
```typescript
{
  intervention_id: string;
  step_id: string;
  session_token: string;
}
```

**Response**: `InterventionStep`

---

#### `intervention_advance_step`
Advance to next workflow step.

**Request**:
```typescript
{
  intervention_id: string;
  step_id: string;
  notes?: string;
  session_token: string;
}
```

**Response**: `InterventionStep`

---

#### `intervention_get_progress`
Get intervention progress.

**Request**:
```typescript
{
  intervention_id: string;
  session_token: string;
}
```

**Response**:
```typescript
{
  current_step: number;
  total_steps: number;
  completion_percentage: number;
  steps: InterventionStep[];
}
```

---

#### `intervention_progress`
Handle intervention progress actions.

**Request**:
```typescript
InterventionProgressAction:
  | { action: "Pause", intervention_id: string }
  | { action: "Resume", intervention_id: string }
  | { action: "SkipStep", intervention_id: string, step_id: string }
  | { action: "ReturnToStep", intervention_id: string, step_number: number }
```

**Response**: `Intervention`

---

#### `intervention_save_step_progress`
Save progress data for current step.

**Request**:
```typescript
{
  intervention_id: string;
  step_id: string;
  progress_data: any;
  session_token: string;
}
```

**Response**: `Success`

---

#### `intervention_finalize`
Finalize intervention with completion data.

**Request**:
```typescript
FinalizeInterventionRequest {
  intervention_id: string;
  quality_score: number;
  customer_satisfaction: number;
  final_observations: string;
  customer_signature: string;
  photos: Photo[];
}
```

**Response**: `Intervention`

---

#### `intervention_update`
Update intervention data.

**Request**:
```typescript
{
  id: string;
  data: Partial<Intervention>;
  session_token: string;
}
```

**Response**: `Intervention`

---

#### `intervention_delete`
Delete intervention.

**Request**:
```typescript
{
  id: string;
  session_token: string;
}
```

**Response**: `Success`

---

#### `intervention_management`
Facade for intervention management operations.

**Request**:
```typescript
InterventionManagementAction:
  | { action: "Create", task_id: string }
  | { action: "Get", id: string }
  | { action: "List", filters: InterventionFilters }
  | { action: "Update", id: string, data: Partial<Intervention> }
  | { action: "Delete", id: string }
```

**Response**: Varies based on action

---

#### `intervention_workflow`
Handle workflow operations.

**Request**:
```typescript
InterventionWorkflowAction:
  | { action: "Start", intervention_id: string }
  | { action: "Pause", intervention_id: string }
  | { action: "Resume", intervention_id: string }
  | { action: "Cancel", intervention_id: string, reason: string }
  | { action: "GetState", intervention_id: string }
```

**Response**: Varies based on action

---

### 6. Material Management Commands (24 commands)

#### Inventory Commands

##### `inventory_get_stats`
Get inventory statistics.

**Response**:
```typescript
{
  total_materials: number;
  low_stock_items: number;
  total_value: number;
  categories: InventoryStatsByCategory[];
}
```

---

##### `inventory_get_movement_summary`
Get material movement summary.

**Request**:
```typescript
{
  material_id?: string;
  date_from?: string;
  date_to?: string;
}
```

**Response**:
```typescript
{
  movements: MaterialMovement[];
  summary: {
    in: number;
    out: number;
    adjustments: number;
  };
}
```

---

##### `inventory_transaction_create`
Create inventory transaction.

**Request**:
```typescript
{
  request: CreateInventoryTransactionRequest;
  user_id: string;
}
```

**Response**: `InventoryTransaction`

---

##### `inventory_transaction_list_by_material`
List transactions for a material.

**Request**:
```typescript
{
  material_id: string;
  transaction_type?: 'in' | 'out' | 'adjustment';
  limit?: number;
  offset?: number;
}
```

**Response**: `InventoryTransaction[]`

---

##### `inventory_transaction_list_recent`
List recent transactions.

**Request**:
```typescript
{
  limit?: number;
}
```

**Response**: `InventoryTransaction[]`

---

#### Material Commands

##### `material_create`
Create new material.

**Request**:
```typescript
{
  request: CreateMaterialRequest;
  user_id: string;
}
```

**Response**: `Material`

---

##### `material_get`
Get material by ID.

**Response**: `Material`

---

##### `material_get_by_sku`
Get material by SKU.

**Request**:
```typescript
{
  sku: string;
}
```

**Response**: `Material`

---

##### `material_list`
List materials with filters.

**Request**:
```typescript
{
  material_type?: string;
  category?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}
```

**Response**:
```typescript
{
  materials: Material[];
  total: number;
}
```

---

##### `material_update`
Update material.

**Request**:
```typescript
{
  id: string;
  request: CreateMaterialRequest;
  user_id: string;
}
```

**Response**: `Material`

---

##### `material_update_stock`
Update material stock level.

**Request**:
```typescript
{
  request: UpdateStockRequest;
}
```

**Response**: `Material`

---

##### `material_get_expired`
Get expired or expiring materials.

**Response**:
```typescript
{
  expired: Material[];
  expiring_soon: Material[];
}
```

---

##### `material_get_low_stock`
Get materials below minimum stock.

**Response**: `Material[]`

---

##### `material_get_stats`
Get material statistics.

**Response**:
```typescript
{
  total_materials: number;
  total_value: number;
  low_stock_count: number;
  by_type: StatsByType[];
  by_category: StatsByCategory[];
}
```

---

##### `material_record_consumption`
Record material consumption for intervention.

**Request**:
```typescript
{
  request: RecordConsumptionRequest;
}
```

**Response**: `MaterialConsumption`

---

##### `material_get_intervention_consumption`
Get consumption for intervention.

**Request**:
```typescript
{
  intervention_id: string;
}
```

**Response**: `MaterialConsumption[]`

---

##### `material_get_intervention_summary`
Get intervention material summary.

**Request**:
```typescript
{
  intervention_id: string;
}
```

**Response**:
```typescript
{
  total_cost: number;
  materials_consumed: MaterialSummary[];
  waste_percentage: number;
}
```

---

#### Material Category Commands

##### `material_category_create`
Create material category.

**Request**:
```typescript
{
  request: CreateMaterialCategoryRequest;
  user_id: string;
}
```

**Response**: `MaterialCategory`

---

##### `material_category_get`
Get category by ID.

**Response**: `MaterialCategory`

---

##### `material_category_list`
List categories.

**Request**:
```typescript
{
  active_only?: boolean;
  limit?: number;
  offset?: number;
}
```

**Response**: `MaterialCategory[]`

---

##### `material_category_update`
Update category.

**Request**:
```typescript
{
  id: string;
  request: CreateMaterialCategoryRequest;
  user_id: string;
}
```

**Response**: `MaterialCategory`

---

#### Supplier Commands

##### `supplier_create`
Create supplier.

**Request**:
```typescript
{
  request: CreateSupplierRequest;
  user_id: string;
}
```

**Response**: `Supplier`

---

##### `supplier_get`
Get supplier by ID.

**Response**: `Supplier`

---

##### `supplier_list`
List suppliers.

**Request**:
```typescript
{
  active_only?: boolean;
  preferred_only?: boolean;
  limit?: number;
  offset?: number;
}
```

**Response**: `Supplier[]`

---

##### `supplier_update`
Update supplier.

**Request**:
```typescript
{
  id: string;
  request: CreateSupplierRequest;
  user_id: string;
}
```

**Response**: `Supplier`

---

### 7. Calendar Management Commands (9 commands)

#### `create_event`
Create calendar event.

**Request**:
```typescript
CreateEventRequest {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
  timezone?: string;
  event_type?: EventType;
  category?: string;
  task_id?: string;
  client_id?: string;
  technician_id?: string;
  location?: string;
  meeting_link?: string;
  is_virtual?: boolean;
  participants?: EventParticipant[];
  reminders?: number[];
  color?: string;
  tags?: string[];
  notes?: string;
}
```

**Response**: `CalendarEvent`

---

#### `get_event_by_id`
Get event by ID.

**Request**:
```typescript
GetEventByIdRequest {
  id: string;
}
```

**Response**: `CalendarEvent`

---

#### `get_events`
Get events in date range.

**Request**:
```typescript
{
  start_date: string;
  end_date: string;
  technician_id?: string;
  session_token: string;
}
```

**Response**: `CalendarEvent[]`

---

#### `update_event`
Update calendar event.

**Request**:
```typescript
UpdateEventRequest {
  id: string;
  title?: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  all_day?: boolean;
  timezone?: string;
  event_type?: EventType;
  category?: string;
  task_id?: string;
  client_id?: string;
  technician_id?: string;
  location?: string;
  meeting_link?: string;
  is_virtual?: boolean;
  participants?: EventParticipant[];
  status?: EventStatus;
  reminders?: number[];
  color?: string;
  tags?: string[];
  notes?: string;
}
```

**Response**: `CalendarEvent`

---

#### `delete_event`
Delete calendar event.

**Request**:
```typescript
DeleteEventRequest {
  id: string;
}
```

**Response**: `Success`

---

#### `calendar_check_conflicts`
Check for scheduling conflicts.

**Request**:
```typescript
CheckConflictsRequest {
  technician_id: string;
  start_datetime: string;
  end_datetime: string;
  exclude_event_id?: string;
}
```

**Response**:
```typescript
{
  has_conflicts: boolean;
  conflicts: Conflict[];
}
```

---

#### `calendar_get_tasks`
Get tasks for calendar view.

**Request**:
```typescript
GetCalendarTasksRequest {
  start_date: string;
  end_date: string;
  technician_id?: string;
  status?: string[];
}
```

**Response**: `Task[]`

---

#### `get_events_for_task`
Get all events linked to a task.

**Request**:
```typescript
GetEventsForTaskRequest {
  task_id: string;
}
```

**Response**: `CalendarEvent[]`

---

#### `get_events_for_technician`
Get events for a technician.

**Request**:
```typescript
GetEventsForTechnicianRequest {
  technician_id: string;
  start_date?: string;
  end_date?: string;
}
```

**Response**: `CalendarEvent[]`

---

### 8. Analytics Commands (10 commands)

#### `analytics_get_summary`
Get analytics summary.

**Response**:
```typescript
{
  total_interventions: number;
  completed_interventions: number;
  average_duration: number;
  quality_score: number;
  customer_satisfaction: number;
}
```

---

#### `analytics_get_kpis`
Get all KPIs.

**Response**: `KPI[]`

---

#### `analytics_get_kpi`
Get specific KPI.

**Request**:
```typescript
{
  kpi_id: string;
}
```

**Response**: `KPI`

---

#### `analytics_calculate_kpi`
Calculate KPI on demand.

**Request**:
```typescript
{
  kpi_id: string;
}
```

**Response**: `KPIValue`

---

#### `analytics_calculate_kpis`
Calculate all KPIs.

**Response**: `KPIValue[]`

---

#### `analytics_get_time_series`
Get time series data.

**Request**:
```typescript
{
  metric_name: string;
  days?: number;
}
```

**Response**:
```typescript
{
  metric_name: string;
  data_points: TimeSeriesPoint[];
  period: string;
}
```

---

#### `analytics_get_dashboard`
Get dashboard configuration.

**Request**:
```typescript
{
  dashboard_id: string;
}
```

**Response**: `Dashboard`

---

#### `analytics_get_dashboard_data`
Get dashboard data.

**Request**:
```typescript
{
  dashboard_id: string;
}
```

**Response**: `DashboardData`

---

#### `analytics_create_default_dashboard`
Create default dashboard.

**Request**:
```typescript
{
  user_id: string;
}
```

**Response**: `Dashboard`

---

### 9. Reporting Commands (30 commands)

#### Report Core Commands (10 commands)

##### `get_available_report_types`
Get all available report types.

**Response**:
```typescript
ReportType[]:
  'overview' | 'tasks' | 'technicians' | 'clients' | 'quality' |
  'materials' | 'geographic' | 'seasonal' | 'operational_intelligence' | 'data_explorer'
```

---

##### `get_overview_report`
Get overview report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `OverviewReport`

---

##### `get_task_completion_report`
Get task completion report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `TaskCompletionReport`

---

##### `get_technician_performance_report`
Get technician performance report.

**Request**:
```typescript
{
  technician_id?: string;
  date_range: DateRange;
  session_token: string;
}
```

**Response**: `TechnicianPerformanceReport`

---

##### `get_client_analytics_report`
Get client analytics report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `ClientAnalyticsReport`

---

##### `get_quality_compliance_report`
Get quality compliance report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `QualityComplianceReport`

---

##### `get_material_usage_report`
Get material usage report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `MaterialUsageReport`

---

##### `get_geographic_report`
Get geographic report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `GeographicReport`

---

##### `get_seasonal_report`
Get seasonal trends report.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `SeasonalReport`

---

##### `get_operational_intelligence_report`
Get operational intelligence.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `OperationalIntelligenceReport`

---

#### Report Export Commands (3 commands)

##### `export_report_data`
Export report data.

**Request**:
```typescript
{
  report_type: ReportType;
  format: ExportFormat; // 'pdf' | 'csv' | 'excel'
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `ExportResult`

---

##### `export_intervention_report`
Export specific intervention report.

**Request**:
```typescript
{
  intervention_id: string;
  session_token: string;
}
```

**Response**: `ExportResult`

---

##### `save_intervention_report`
Save intervention report to file.

**Request**:
```typescript
{
  intervention_id: string;
  file_path: string;
  session_token: string;
}
```

**Response**: `Success`

---

#### Report Generation Commands (6 commands)

##### `submit_report_job`
Submit report for background generation.

**Request**:
```typescript
{
  report_type: ReportType;
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**:
```typescript
{
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

---

##### `submit_task_completion_report_job`
Submit task completion report job.

**Request**:
```typescript
{
  date_range: DateRange;
  filters: ReportFilters;
  session_token: string;
}
```

**Response**: `ReportJob`

---

##### `get_report_job_status`
Get report generation status.

**Request**:
```typescript
{
  job_id: string;
  session_token: string;
}
```

**Response**: `ReportJobStatus`

---

##### `get_report_job_result`
Get completed report result.

**Request**:
```typescript
{
  job_id: string;
  session_token: string;
}
```

**Response**: `ReportResult`

---

##### `cancel_report_job`
Cancel report generation.

**Request**:
```typescript
{
  job_id: string;
  session_token: string;
}
```

**Response**: `Success`

---

##### `get_entity_counts`
Get entity counts for reports.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  tasks: number;
  interventions: number;
  clients: number;
  technicians: number;
  materials: number;
}
```

---

#### PDF Generation Commands (2 commands)

##### `generate_intervention_pdf_report`
Generate PDF for intervention.

**Request**:
```typescript
{
  intervention_id: string;
  output_path?: string;
  session_token: string;
}
```

**Response**:
```typescript
{
  file_path: string;
  file_size: number;
  generated_at: string;
}
```

---

##### `test_pdf_generation`
Test PDF generation.

**Request**:
```typescript
{
  output_path: string;
}
```

**Response**: `Success`

---

#### Report Search Commands (4 commands)

##### `search_records`
Search across all record types.

**Request**:
```typescript
{
  query: string;
  entity_type?: string;
  date_range?: DateRange;
  filters?: SearchFilters;
  limit: number;
  offset: number;
  session_token: string;
}
```

**Response**: `SearchResponse`

---

##### `search_tasks`
Search tasks.

**Request**:
```typescript
{
  query: string;
  filters: SearchFilters;
  limit?: number;
  session_token: string;
}
```

**Response**: `Task[]`

---

##### `search_clients`
Search clients.

**Request**:
```typescript
{
  query: string;
  filters: SearchFilters;
  limit?: number;
  session_token: string;
}
```

**Response**: `Client[]`

---

##### `search_interventions`
Search interventions.

**Request**:
```typescript
{
  query: string;
  filters: SearchFilters;
  limit?: number;
  session_token: string;
}
```

**Response**: `Intervention[]`

---

### 10. Security Commands (12 commands)

#### `get_security_alerts`
Get security alerts.

**Request**:
```typescript
GetSecurityAlertsRequest {
  user_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  limit?: number;
  offset?: number;
}
```

**Response**: `SecurityAlert[]`

---

#### `acknowledge_security_alert`
Acknowledge security alert.

**Request**:
```typescript
AcknowledgeSecurityAlertRequest {
  alert_id: number;
  acknowledged_by: string;
  notes?: string;
}
```

**Response**: `Success`

---

#### `resolve_security_alert`
Resolve security alert.

**Request**:
```typescript
ResolveSecurityAlertRequest {
  alert_id: number;
  resolved_by: string;
  resolution: string;
  notes?: string;
}
```

**Response**: `Success`

---

#### `get_security_events`
Get security events.

**Request**:
```typescript
GetSecurityEventsRequest {
  user_id?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
```

**Response**: `SecurityEvent[]`

---

#### `cleanup_security_events`
Clean up old security events.

**Request**:
```typescript
CleanupSecurityEventsRequest {
  days_to_keep: number;
}
```

**Response**:
```typescript
{
  deleted_count: number;
}
```

---

#### `get_security_metrics`
Get security metrics.

**Request**:
```typescript
GetSecurityMetricsRequest {
  period?: '24h' | '7d' | '30d' | '90d';
}
```

**Response**:
```typescript
{
  total_alerts: number;
  resolved_alerts: number;
  critical_alerts: number;
  login_attempts: number;
  failed_logins: number;
  unique_logins: number;
}
```

---

#### `get_active_sessions`
Get all active sessions.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**: `UserSession[]`

---

#### `revoke_session`
Revoke specific session.

**Request**:
```typescript
{
  session_id: string;
  session_token: string;
}
```

**Response**: `Success`

---

#### `revoke_all_sessions_except_current`
Revoke all sessions except current.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  revoked_count: number;
}
```

---

#### `get_session_timeout_config`
Get session timeout configuration.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  timeout_minutes: number;
}
```

---

#### `update_session_timeout`
Update session timeout.

**Request**:
```typescript
{
  timeout_minutes: number;
  session_token: string;
}
```

**Response**: `Success`

---

### 11. Settings Commands (13 commands)

#### Profile Settings (6 commands)

##### `get_user_settings`
Get all user settings.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**: `UserSettings`

---

##### `update_user_profile`
Update user profile.

**Request**:
```typescript
UpdateUserProfileRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}
```

**Response**: `Success`

---

##### `change_user_password`
Change user password.

**Request**:
```typescript
ChangeUserPasswordRequest {
  current_password: string;
  new_password: string;
}
```

**Response**: `Success`

---

##### `upload_user_avatar`
Upload user avatar.

**Request**:
```typescript
UploadUserAvatarRequest {
  file_path: string;
  file_name: string;
}
```

**Response**:
```typescript
{
  avatar_url: string;
}
```

---

##### `export_user_data`
Export user data (GDPR).

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  file_path: string;
  file_size: number;
  exported_at: string;
}
```

---

##### `delete_user_account`
Delete user account.

**Request**:
```typescript
DeleteUserAccountRequest {
  password: string;
  confirmation: string;
}
```

**Response**: `Success`

---

#### Preferences Settings (4 commands)

##### `update_user_preferences`
Update user preferences.

**Request**:
```typescript
UpdateUserPreferencesRequest {
  email_notifications?: boolean;
  push_notifications?: boolean;
  theme?: string;
  language?: string;
  date_format?: string;
  time_format?: string;
}
```

**Response**: `Success`

---

##### `update_appearance_settings`
Update appearance settings.

**Request**:
```typescript
UpdateAppearanceSettingsRequest {
  dark_mode?: boolean;
  primary_color?: string;
  font_size?: string;
  compact_view?: boolean;
}
```

**Response**: `Success`

---

##### `update_general_settings`
Update general settings.

**Request**:
```typescript
UpdateGeneralSettingsRequest {
  auto_save?: boolean;
  language?: string;
  timezone?: string;
}
```

**Response**: `Success`

---

##### `update_user_performance`
Update performance settings.

**Request**:
```typescript
UserPerformanceSettings {
  cache_enabled?: boolean;
  cache_size?: number;
  offline_mode?: boolean;
  sync_on_startup?: boolean;
  background_sync?: boolean;
}
```

**Response**: `Success`

---

#### Accessibility Settings (1 command)

##### `update_user_accessibility`
Update accessibility settings.

**Request**:
```typescript
UpdateUserAccessibilityRequest {
  high_contrast?: boolean;
  large_text?: boolean;
  reduce_motion?: boolean;
  screen_reader?: boolean;
  focus_indicators?: boolean;
  keyboard_navigation?: boolean;
  font_size?: number;
}
```

**Response**: `Success`

---

#### Notification Settings (2 commands)

##### `update_user_notifications`
Update notification settings.

**Request**:
```typescript
UpdateUserNotificationsRequest {
  task_assigned?: boolean;
  task_updated?: boolean;
  task_completed?: boolean;
  task_overdue?: boolean;
  system_alerts?: boolean;
  maintenance?: boolean;
  security_alerts?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
```

**Response**: `Success`

---

##### `update_notification_settings`
Update notification configuration.

**Request**:
```typescript
UpdateNotificationSettingsRequest {
  email_provider?: string;
  email_api_key?: string;
  sms_provider?: string;
  sms_api_key?: string;
  push_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
```

**Response**: `Success`

---

#### Security Settings (2 commands)

##### `update_user_security`
Update user security settings.

**Request**:
```typescript
UpdateUserSecurityRequest {
  two_factor_enabled?: boolean;
  session_timeout?: number;
}
```

**Response**: `Success`

---

##### `get_admin_app_settings`
Get admin-level app settings.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**: `AdminSettings`

---

#### Audit Settings (2 commands)

##### `get_data_consent`
Get user data consent status.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**: `DataConsent`

---

##### `update_data_consent`
Update data consent.

**Request**:
```typescript
UpdateDataConsentRequest {
  consent_given: boolean;
  consent_type: string;
}
```

**Response**: `Success`

---

### 12. Notification Commands (3 commands)

#### `get_notification_status`
Get notification service status.

**Request**:
```typescript
{
  session_token: string;
}
```

**Response**:
```typescript
{
  enabled: boolean;
  providers: NotificationProvider[];
  last_sent: string;
  queue_size: number;
}
```

---

#### `initialize_notification_service`
Initialize notification service.

**Request**:
```typescript
UpdateNotificationConfigRequest {
  email_provider?: string;
  email_api_key?: string;
  sms_provider?: string;
  sms_api_key?: string;
  push_enabled?: boolean;
}
```

**Response**: `Success`

---

#### `send_notification`
Send notification.

**Request**:
```typescript
SendNotificationRequest {
  user_id: string;
  notification_type: NotificationType;
  recipient: string;
  variables: TemplateVariables;
}
```

**Response**: `Success`

---

#### `test_notification_config`
Test notification configuration.

**Request**:
```typescript
{
  recipient: string;
  channel: NotificationChannel;
  session_token: string;
}
```

**Response**: `TestResult`

---

### 13. Performance Commands (6 commands)

#### `get_performance_stats`
Get performance statistics.

**Response**:
```typescript
{
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  cache_hit_rate: number;
  avg_response_time: number;
}
```

---

#### `get_performance_metrics`
Get detailed performance metrics.

**Request**:
```typescript
{
  limit?: number;
}
```

**Response**: `PerformanceMetric[]`

---

#### `get_cache_statistics`
Get cache statistics.

**Response**:
```typescript
{
  total_entries: number;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
  memory_used: number;
  memory_limit: number;
}
```

---

#### `configure_cache_settings`
Configure cache.

**Request**:
```typescript
CacheConfigRequest {
  max_size?: number;
  ttl?: number;
  enabled?: boolean;
}
```

**Response**: `Success`

---

#### `clear_application_cache`
Clear application cache.

**Request**:
```typescript
CacheClearRequest {
  cache_type?: 'all' | 'memory' | 'disk' | 'repository';
}
```

**Response**:
```typescript
{
  cleared_entries: number;
  freed_memory: number;
}
```

---

#### `cleanup_performance_metrics`
Clean up old performance metrics.

**Response**: `Success`

---

### 14. Status Commands (2 commands)

#### `task_get_status_distribution`
Get task status distribution.

**Response**:
```typescript
StatusDistribution {
  quote: number;
  scheduled: number;
  in_progress: number;
  paused: number;
  completed: number;
  cancelled: number;
}
```

---

#### `task_transition_status`
Transition task to new status.

**Request**:
```typescript
StatusTransitionRequest {
  task_id: string;
  new_status: string;
  reason?: string;
}
```

**Response**: `Task`

---

### 15. Sync Commands (5 commands)

#### `sync_now`
Trigger immediate sync.

**Response**:
```typescript
{
  status: 'syncing' | 'completed';
  operations_processed: number;
  operations_failed: number;
}
```

---

#### `sync_get_status`
Get current sync status.

**Response**:
```typescript
{
  status: 'idle' | 'syncing' | 'error';
  last_sync_at: string;
  pending_operations: number;
}
```

---

#### `sync_start_background_service`
Start background sync service.

**Response**: `Success`

---

#### `sync_stop_background_service`
Stop background sync service.

**Response**: `Success`

---

#### `sync_get_operations_for_entity`
Get sync operations for specific entity.

**Request**:
```typescript
{
  entity_id: string;
  entity_type: string;
}
```

**Response**: `SyncOperation[]`

---

### 16. Queue Commands (7 commands)

#### `sync_enqueue`
Enqueue sync operation.

**Request**:
```typescript
{
  operation: SyncOperation;
}
```

**Response**: `number` (operation ID)

---

#### `sync_dequeue_batch`
Dequeue batch of operations.

**Request**:
```typescript
{
  limit: number;
}
```

**Response**: `SyncOperation[]`

---

#### `sync_get_operation`
Get specific sync operation.

**Request**:
```typescript
{
  operation_id: number;
}
```

**Response**: `SyncOperation`

---

#### `sync_mark_completed`
Mark operation as completed.

**Request**:
```typescript
{
  operation_id: number;
}
```

**Response**: `Success`

---

#### `sync_mark_failed`
Mark operation as failed.

**Request**:
```typescript
{
  operation_id: number;
  error: string;
}
```

**Response**: `Success`

---

#### `sync_get_metrics`
Get sync queue metrics.

**Response**:
```typescript
SyncQueueMetrics {
  pending_operations: bigint;
  processing_operations: bigint;
  completed_operations: bigint;
  failed_operations: bigint;
  abandoned_operations: bigint;
  oldest_pending_age_seconds: bigint | null;
  average_retry_count: number;
}
```

---

#### `sync_cleanup_old_operations`
Clean up old operations.

**Request**:
```typescript
{
  days_old: number;
}
```

**Response**: `Success`

---

### 17. System Commands (5 commands)

#### `health_check`
Perform health check.

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
}
```

---

#### `get_app_info`
Get application information.

**Response**:
```typescript
{
  name: string;
  version: string;
  build_date: string;
  environment: string;
}
```

---

#### `get_device_info`
Get device information.

**Response**: `DeviceInfo`

---

#### `get_database_stats`
Get database statistics.

**Response**:
```typescript
{
  size: number;
  page_count: number;
  table_count: number;
  index_count: number;
  wal_size: number;
}
```

---

#### `force_wal_checkpoint`
Force WAL checkpoint.

**Response**: `Success`

---

#### `diagnose_database`
Diagnose database issues.

**Response**:
```typescript
{
  issues: DatabaseIssue[];
  recommendations: string[];
}
```

---

#### `get_database_status`
Get database connection status.

**Response**:
```typescript
{
  status: 'connected' | 'disconnected' | 'error';
  pool_size: number;
  active_connections: number;
}
```

---

#### `get_database_pool_health`
Get database pool health.

**Response**: `PoolHealth`

---

#### `get_database_pool_stats`
Get database pool statistics.

**Response**: `PoolStats`

---

#### `vacuum_database`
Vacuum database.

**Response**: `Success`

---

#### `get_large_test_data`
Get large test data set (for testing).

**Response**: `TestData`

---

### 18. UI Commands (9 commands)

#### `dashboard_get_stats`
Get dashboard statistics.

**Request**:
```typescript
{
  time_range?: string;
}
```

**Response**: `DashboardStats`

---

#### `get_recent_activities`
Get recent activities.

**Request**:
```typescript
{
  session_token: string;
  limit?: number;
}
```

**Response**: `Activity[]`

---

#### `ui_gps_get_current_position`
Get current GPS position.

**Response**:
```typescript
{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
```

---

#### `ui_initiate_customer_call`
Initiate customer phone call.

**Request**:
```typescript
{
  phone_number: string;
}
```

**Response**: `Success`

---

#### `ui_shell_open_url`
Open URL in external browser.

**Request**:
```typescript
{
  url: string;
}
```

**Response**: `Success`

---

#### `ui_window_close`
Close application window.

**Request**:
```typescript
{
  window: Window;
}
```

**Response**: `Success`

---

#### `ui_window_minimize`
Minimize window.

**Request**:
```typescript
{
  window: Window;
}
```

**Response**: `Success`

---

#### `ui_window_maximize`
Maximize window.

**Request**:
```typescript
{
  window: Window;
}
```

**Response**: `Success`

---

#### `ui_window_get_state`
Get window state.

**Request**:
```typescript
{
  window: Window;
}
```

**Response**: `WindowState`

---

#### `ui_window_set_always_on_top`
Set always on top.

**Request**:
```typescript
{
  window: Window;
  always_on_top: boolean;
}
```

**Response**: `Success`

---

### 19. Navigation Commands (7 commands)

#### `navigation_get_current`
Get current navigation state.

**Response**: `NavigationState`

---

#### `navigation_update`
Update navigation state.

**Request**:
```typescript
{
  path: string;
  options?: any;
}
```

**Response**: `Success`

---

#### `navigation_go_back`
Navigate back.

**Response**: `Success`

---

#### `navigation_go_forward`
Navigate forward.

**Response**: `Success`

---

#### `navigation_refresh`
Refresh current route.

**Response**: `Success`

---

#### `navigation_add_to_history`
Add to navigation history.

**Request**:
```typescript
{
  path: string;
}
```

**Response**: `Success`

---

#### `shortcuts_register`
Register keyboard shortcuts.

**Request**:
```typescript
{
  shortcuts: any;
}
```

**Response**: `Success`

---

### 20. Message Commands (6 commands)

#### `message_get_list`
Get messages.

**Request**:
```typescript
MessageQuery {
  message_type?: string;
  sender_id?: string;
  recipient_id?: string;
  task_id?: string;
  client_id?: string;
  status?: string;
  priority?: string;
  date_from?: bigint;
  date_to?: bigint;
  limit?: number;
  offset?: number;
}
```

**Response**: `MessageListResponse`

---

#### `message_send`
Send message.

**Request**:
```typescript
SendMessageRequest {
  message_type: string;
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  body: string;
  template_id?: string;
  task_id?: string;
  client_id?: string;
  priority?: string;
  scheduled_at?: bigint;
}
```

**Response**: `Message`

---

#### `message_mark_read`
Mark message as read.

**Request**:
```typescript
{
  message_id: string;
}
```

**Response**: `Success`

---

#### `message_get_preferences`
Get message preferences.

**Request**:
```typescript
{
  user_id: string;
}
```

**Response**: `NotificationPreferences`

---

#### `message_update_preferences`
Update message preferences.

**Request**:
```typescript
UpdateNotificationPreferencesRequest {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  in_app_enabled?: boolean;
  task_assigned?: boolean;
  task_updated?: boolean;
  task_completed?: boolean;
  task_overdue?: boolean;
  client_created?: boolean;
  client_updated?: boolean;
  system_alerts?: boolean;
  maintenance_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  email_frequency?: string;
  email_digest_time?: string;
}
```

**Response**: `Success`

---

#### `message_get_templates`
Get message templates.

**Request**:
```typescript
{
  category?: string;
  message_type?: string;
}
```

**Response**: `MessageTemplate[]`

---

### 21. Log Commands (3 commands)

#### `log_client_creation_debug`
Log client creation debug info.

**Request**:
```typescript
LogClientCreationDebugRequest {
  client_data: any;
  timing: TimingInfo;
}
```

**Response**: `Success`

---

#### `log_task_creation_debug`
Log task creation debug info.

**Request**:
```typescript
LogTaskCreationDebugRequest {
  task_data: any;
  timing: TimingInfo;
}
```

**Response**: `Success`

---

#### `send_log_to_frontend`
Send log message to frontend.

**Request**:
```typescript
LogMessage {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: number;
  context?: any;
}
```

**Response**: `Success`

---

### 22. IPC Optimization Commands (6 commands)

#### `compress_data_for_ipc`
Compress data for IPC.

**Request**:
```typescript
CompressDataRequest {
  data: string | object;
  compression_level?: number;
}
```

**Response**:
```typescript
{
  compressed: string;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
}
```

---

#### `decompress_data_from_ipc`
Decompress IPC data.

**Request**:
```typescript
DecompressDataRequest {
  compressed: string;
}
```

**Response**:
```typescript
{
  data: any;
  original_size: number;
  decompressed_size: number;
}
```

---

#### `get_ipc_stats`
Get IPC statistics.

**Response**:
```typescript
{
  total_calls: number;
  average_response_time: number;
  compression_ratio: number;
  errors: number;
}
```

---

#### `start_stream_transfer`
Start streaming transfer.

**Request**:
```typescript
StartStreamRequest {
  data_size: number;
  chunk_size?: number;
}
```

**Response**:
```typescript
{
  stream_id: string;
  expected_chunks: number;
}
```

---

#### `send_stream_chunk`
Send stream chunk.

**Request**:
```typescript
SendStreamChunkRequest {
  stream_id: string;
  chunk_index: number;
  chunk_data: string;
  checksum?: string;
}
```

**Response**: `Success`

---

#### `get_stream_data`
Get stream data.

**Request**:
```typescript
GetStreamDataRequest {
  stream_id: string;
  chunk_range?: [number, number];
}
```

**Response**: `StreamData`

---

### 23. WebSocket Commands (9 commands)

#### `init_websocket_server`
Initialize WebSocket server.

**Request**:
```typescript
InitWebSocketServerRequest {
  host?: string;
  port?: number;
  max_connections?: number;
}
```

**Response**: `Success`

---

#### `shutdown_websocket_server`
Shutdown WebSocket server.

**Response**: `Success`

---

#### `get_websocket_stats`
Get WebSocket statistics.

**Response**:
```typescript
{
  connected_clients: number;
  total_connections: number;
  messages_sent: number;
  messages_received: number;
  bytes_transferred: number;
}
```

---

#### `send_websocket_message_to_client`
Send message to specific client.

**Request**:
```typescript
SendWSMessageRequest {
  client_id: string;
  message: WSMessage;
}
```

**Response**: `Success`

---

#### `broadcast_websocket_message`
Broadcast message to all clients.

**Request**:
```typescript
BroadcastWSMessageRequest {
  message: WSMessage;
  exclude_client_id?: string;
}
```

**Response**: `Success`

---

#### `broadcast_task_update`
Broadcast task update.

**Request**:
```typescript
{
  task_id: string;
  update_type: string;
  data: any;
}
```

**Response**: `Success`

---

#### `broadcast_intervention_update`
Broadcast intervention update.

**Request**:
```typescript
{
  intervention_id: string;
  update_type: string;
  data: any;
}
```

**Response**: `Success`

---

#### `broadcast_client_update`
Broadcast client update.

**Request**:
```typescript
{
  client_id: string;
  update_type: string;
  data: any;
}
```

**Response**: `Success`

---

#### `broadcast_system_notification`
Broadcast system notification.

**Request**:
```typescript
{
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}
```

**Response**: `Success`

---

## Summary

| Category | Commands | Count |
|----------|----------|-------|
| Authentication | 10 commands | 10 |
| User Management | 6 commands | 6 |
| Task Management | 9 commands | 9 |
| Client Management | 1 command | 1 |
| Intervention | 11 commands | 11 |
| Material | 24 commands | 24 |
| Calendar | 9 commands | 9 |
| Analytics | 10 commands | 10 |
| Reports | 30 commands | 30 |
| Security | 12 commands | 12 |
| Settings | 13 commands | 13 |
| Notification | 3 commands | 3 |
| Performance | 6 commands | 6 |
| Status | 2 commands | 2 |
| Sync | 5 commands | 5 |
| Queue | 7 commands | 7 |
| System | 10 commands | 10 |
| UI | 9 commands | 9 |
| Navigation | 7 commands | 7 |
| Message | 6 commands | 6 |
| Log | 3 commands | 3 |
| IPC Optimization | 6 commands | 6 |
| WebSocket | 9 commands | 9 |
| **TOTAL** | **215 commands** | **215** |

---

**Document Version**: 2.0
**Last Updated**: 2026-02-03
**Maintained By**: RPMA Team
