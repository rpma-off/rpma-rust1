# API Documentation

## Overview

The RPMA PPF Intervention application uses **Tauri IPC (Inter-Process Communication)** for communication between the Rust backend and Next.js frontend. All API calls are made through Tauri's `invoke` function, which provides type-safe, asynchronous communication.

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
- **Success**: Returns the expected data type
- **Error**: Returns structured error with code and message

**Error Types**:
```typescript
type AppError = {
  code: string;
  message: string;
  details?: any;
}
```

## API Endpoints

### Authentication

#### `auth_login`

Authenticate user with email and password.

**Request**:
```typescript
{
  email: string;
  password: string;
  two_factor_code?: string;  // Required if 2FA enabled
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
  expires_at: string;  // ISO 8601 datetime
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
  phone?: string;
}
```

**Response**:
```typescript
{
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: number;  // Unix timestamp (ms)
}
```

**Authentication**: Required (Admin only)

---

#### `auth_logout`

Logout current user and invalidate session.

**Request**: No parameters

**Response**:
```typescript
{
  success: boolean;
}
```

**Authentication**: Required

---

#### `auth_validate_session`

Validate current session token.

**Request**:
```typescript
{
  token: string;
}
```

**Response**:
```typescript
{
  valid: boolean;
  user?: User;
  expires_at?: string;
}
```

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
  refresh_token: string;
  expires_at: string;
}
```

---

### Two-Factor Authentication

#### `enable_2fa`

Enable 2FA for current user.

**Request**: No parameters

**Response**:
```typescript
{
  secret: string;
  qr_code: string;  // Base64 encoded QR code image
  backup_codes: string[];
}
```

**Authentication**: Required

---

#### `verify_2fa_setup`

Verify 2FA setup with code.

**Request**:
```typescript
{
  code: string;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Authentication**: Required

---

#### `disable_2fa`

Disable 2FA for current user.

**Request**:
```typescript
{
  password: string;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Authentication**: Required

---

### User Management

#### `user_crud`

Unified CRUD operations for users.

**Request**:
```typescript
{
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  id?: string;  // Required for read, update, delete
  data?: {
    email?: string;
    username?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    phone?: string;
    is_active?: boolean;
  };
  filters?: {
    role?: string;
    is_active?: boolean;
    search?: string;
  };
  pagination?: {
    page: number;
    page_size: number;
  };
}
```

**Response** (varies by action):
- **create**: User object
- **read**: User object
- **update**: Updated user object
- **delete**: `{ success: boolean }`
- **list**: `{ users: User[], total: number, page: number }`

**Authentication**: Required (Admin for create/update/delete)

---

#### `bootstrap_first_admin`

Create the first admin user (only works if no admins exist).

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

**Response**:
```typescript
{
  user: User;
  token: string;
}
```

**Authentication**: Not required (only works once)

---

#### `has_admins`

Check if any admin users exist.

**Request**: No parameters

**Response**:
```typescript
{
  has_admins: boolean;
}
```

---

### Client Management

#### `client_crud`

Unified CRUD operations for clients.

**Request**:
```typescript
{
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search';
  id?: string;
  data?: {
    name: string;
    email?: string;
    phone?: string;
    customer_type: 'individual' | 'business';
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    address_country?: string;
    company_name?: string;
    tax_id?: string;
    contact_person?: string;
    notes?: string;
    tags?: string[];
  };
  filters?: {
    customer_type?: string;
    search?: string;
  };
  pagination?: {
    page: number;
    page_size: number;
  };
}
```

**Response**:
- **create**: Client object
- **read**: Client object with statistics
- **update**: Updated client object
- **delete**: `{ success: boolean }`
- **list**: `{ clients: Client[], total: number }`
- **search**: `{ clients: Client[], total: number }`

**Authentication**: Required

---

### Task Management

#### `task_crud`

Unified CRUD operations for tasks.

**Request**:
```typescript
{
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  id?: string;
  data?: {
    title: string;
    description?: string;
    vehicle_plate?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_make?: string;
    vin?: string;
    ppf_zones?: string;
    custom_ppf_zones?: string[];
    status?: TaskStatus;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    technician_id?: string;
    scheduled_date?: string;
    start_time?: string;
    end_time?: string;
    client_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_address?: string;
    notes?: string;
    tags?: string[];
    estimated_duration?: number;
  };
  filters?: {
    status?: TaskStatus;
    priority?: string;
    technician_id?: string;
    client_id?: string;
    scheduled_date?: string;
  };
  pagination?: {
    page: number;
    page_size: number;
  };
}
```

**Task Status**: `'draft' | 'scheduled' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'on_hold' | 'pending' | 'failed' | 'overdue' | 'archived'`

**Response**:
- **create**: Task object
- **read**: Task object
- **update**: Updated task object
- **delete**: `{ success: boolean }`
- **list**: `{ tasks: Task[], total: number }`

**Authentication**: Required

---

#### `edit_task`

Update specific task fields.

**Request**:
```typescript
{
  id: string;
  updates: Partial<Task>;
}
```

**Response**: Updated Task object

**Authentication**: Required

---

#### `delay_task`

Delay a task to a new date.

**Request**:
```typescript
{
  task_id: string;
  new_date: string;  // ISO 8601 date
  reason?: string;
}
```

**Response**: Updated Task object

**Authentication**: Required

---

#### `export_tasks_csv`

Export tasks to CSV format.

**Request**:
```typescript
{
  filters?: {
    status?: TaskStatus;
    date_from?: string;
    date_to?: string;
    technician_id?: string;
  };
}
```

**Response**:
```typescript
{
  csv_data: string;
  filename: string;
}
```

**Authentication**: Required

---

#### `import_tasks_bulk`

Import tasks from CSV.

**Request**:
```typescript
{
  csv_data: string;
  validate_only?: boolean;
}
```

**Response**:
```typescript
{
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}
```

**Authentication**: Required (Admin or Supervisor)

---

#### `check_task_assignment`

Check if task can be assigned to technician.

**Request**:
```typescript
{
  task_id: string;
  technician_id: string;
}
```

**Response**:
```typescript
{
  can_assign: boolean;
  reason?: string;
  conflicts?: Array<{ task_id: string; time: string }>;
}
```

**Authentication**: Required

---

#### `check_task_availability`

Check technician availability for date/time.

**Request**:
```typescript
{
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
}
```

**Response**:
```typescript
{
  available: boolean;
  conflicts?: Array<{ task_id: string; title: string; time: string }>;
}
```

**Authentication**: Required

---

### Intervention Management

#### `intervention_start`

Start a new PPF intervention from a task.

**Request**:
```typescript
{
  task_id: string;
  vehicle_plate: string;
  vehicle_model?: string;
  vehicle_make?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_vin?: string;
  ppf_zones_config?: string;
  film_type?: 'standard' | 'premium' | 'matte' | 'colored';
  film_brand?: string;
  film_model?: string;
  weather_condition?: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'windy' | 'other';
  lighting_condition?: 'natural' | 'artificial' | 'mixed';
  work_location?: 'indoor' | 'outdoor' | 'semi_covered';
  temperature_celsius?: number;
  humidity_percentage?: number;
}
```

**Response**:
```typescript
{
  intervention: Intervention;
  steps: InterventionStep[];
  message: string;
}
```

**Authentication**: Required (Technician or higher)

---

#### `intervention_get`

Get intervention by ID.

**Request**:
```typescript
{
  id: string;
}
```

**Response**: Intervention object

**Authentication**: Required

---

#### `intervention_get_active_by_task`

Get active intervention for a task.

**Request**:
```typescript
{
  task_id: string;
}
```

**Response**: Intervention object or null

**Authentication**: Required

---

#### `intervention_advance_step`

Advance to the next workflow step.

**Request**:
```typescript
{
  intervention_id: string;
  step_id: string;
  step_data?: any;
  observations?: string;
  measurements?: any;
  photos?: string[];  // Photo IDs
}
```

**Response**:
```typescript
{
  intervention: Intervention;
  completed_step: InterventionStep;
  next_step?: InterventionStep;
  message: string;
}
```

**Authentication**: Required (Technician or higher)

**Validation**:
- Current step must be completed
- Required photos must be captured
- Quality checkpoints must pass
- Steps must be completed in order

---

#### `intervention_save_step_progress`

Save step progress without advancing.

**Request**:
```typescript
{
  step_id: string;
  step_data?: any;
  observations?: string;
  measurements?: any;
  collected_data?: any;
}
```

**Response**: Updated InterventionStep object

**Authentication**: Required (Technician or higher)

---

#### `intervention_finalize`

Finalize and complete an intervention.

**Request**:
```typescript
{
  intervention_id: string;
  customer_satisfaction: number;  // 1-10
  quality_score: number;  // 0-100
  final_observations?: string;
  customer_signature?: string;  // Base64 image
  customer_comments?: string;
  end_location_lat?: number;
  end_location_lon?: number;
  end_location_accuracy?: number;
}
```

**Response**:
```typescript
{
  intervention: Intervention;
  report_generated: boolean;
  report_path?: string;
  message: string;
}
```

**Authentication**: Required (Technician or higher)

**Validation**:
- All mandatory steps must be completed
- Customer satisfaction required (1-10)
- Quality score required (0-100)

---

#### `intervention_get_progress`

Get intervention progress summary.

**Request**:
```typescript
{
  intervention_id: string;
}
```

**Response**:
```typescript
{
  intervention_id: string;
  current_step: number;
  total_steps: number;
  completion_percentage: number;
  steps_completed: number;
  steps_remaining: number;
  estimated_time_remaining?: number;
  current_step_details?: InterventionStep;
}
```

**Authentication**: Required

---

### Material Management

#### `material_create`

Create a new material.

**Request**:
```typescript
{
  sku: string;
  name: string;
  description?: string;
  category?: string;
  material_type?: string;
  unit_of_measure: string;
  unit_cost: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  supplier_id?: string;
  expiration_date?: string;
}
```

**Response**: Material object

**Authentication**: Required (Admin or Supervisor)

---

#### `material_get`

Get material by ID.

**Request**:
```typescript
{
  id: string;
}
```

**Response**: Material object

**Authentication**: Required

---

#### `material_list`

List all materials.

**Request**:
```typescript
{
  filters?: {
    category?: string;
    low_stock?: boolean;
    expired?: boolean;
  };
  pagination?: {
    page: number;
    page_size: number;
  };
}
```

**Response**:
```typescript
{
  materials: Material[];
  total: number;
}
```

**Authentication**: Required

---

#### `material_update_stock`

Update material stock level.

**Request**:
```typescript
{
  material_id: string;
  quantity_change: number;  // Positive for addition, negative for subtraction
  reason?: string;
}
```

**Response**: Updated Material object

**Authentication**: Required (Admin or Supervisor)

---

#### `material_record_consumption`

Record material consumption for an intervention.

**Request**:
```typescript
{
  intervention_id: string;
  material_id: string;
  quantity_used: number;
  notes?: string;
}
```

**Response**:
```typescript
{
  consumption_id: string;
  material: Material;
  updated_stock: number;
}
```

**Authentication**: Required (Technician or higher)

---

#### `material_get_intervention_consumption`

Get materials consumed in an intervention.

**Request**:
```typescript
{
  intervention_id: string;
}
```

**Response**:
```typescript
{
  intervention_id: string;
  consumptions: Array<{
    material: Material;
    quantity_used: number;
    cost: number;
    timestamp: number;
  }>;
  total_cost: number;
}
```

**Authentication**: Required

---

#### `material_get_low_stock`

Get materials with low stock.

**Request**: No parameters

**Response**:
```typescript
{
  materials: Array<{
    material: Material;
    stock_level: number;
    minimum_stock: number;
    deficit: number;
  }>;
}
```

**Authentication**: Required

---

### Calendar Management

#### `get_events`

Get calendar events for date range.

**Request**:
```typescript
{
  start_date: string;  // ISO 8601
  end_date: string;    // ISO 8601
  event_type?: string;
  technician_id?: string;
}
```

**Response**:
```typescript
{
  events: CalendarEvent[];
}
```

**Authentication**: Required

---

#### `create_event`

Create a new calendar event.

**Request**:
```typescript
{
  title: string;
  description?: string;
  start_time: string;  // ISO 8601
  end_time: string;    // ISO 8601
  all_day: boolean;
  event_type: string;
  task_id?: string;
  technician_id?: string;
  location?: string;
  attendees?: string[];
}
```

**Response**: CalendarEvent object

**Authentication**: Required

---

#### `calendar_check_conflicts`

Check for scheduling conflicts.

**Request**:
```typescript
{
  technician_id: string;
  start_time: string;
  end_time: string;
  exclude_event_id?: string;
}
```

**Response**:
```typescript
{
  has_conflicts: boolean;
  conflicts: CalendarEvent[];
}
```

**Authentication**: Required

---

### Reporting

#### `get_task_completion_report`

Get task completion report.

**Request**:
```typescript
{
  start_date: string;
  end_date: string;
  technician_id?: string;
  status_filter?: TaskStatus[];
}
```

**Response**:
```typescript
{
  period: { start: string; end: string };
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  status_distribution: Record<TaskStatus, number>;
  by_technician: Array<{
    technician_id: string;
    technician_name: string;
    tasks_completed: number;
    completion_rate: number;
  }>;
}
```

**Authentication**: Required

---

#### `get_technician_performance_report`

Get technician performance metrics.

**Request**:
```typescript
{
  start_date: string;
  end_date: string;
  technician_id?: string;
}
```

**Response**:
```typescript
{
  technicians: Array<{
    technician_id: string;
    technician_name: string;
    tasks_completed: number;
    average_completion_time: number;
    quality_score_average: number;
    customer_satisfaction_average: number;
    on_time_completion_rate: number;
  }>;
}
```

**Authentication**: Required (Supervisor or Admin)

---

#### `get_material_usage_report`

Get material usage report.

**Request**:
```typescript
{
  start_date: string;
  end_date: string;
  material_id?: string;
  category?: string;
}
```

**Response**:
```typescript
{
  period: { start: string; end: string };
  materials: Array<{
    material: Material;
    total_consumed: number;
    total_cost: number;
    consumption_by_intervention: number;
    average_per_intervention: number;
  }>;
  total_cost: number;
}
```

**Authentication**: Required (Supervisor or Admin)

---

#### `dashboard_get_stats`

Get dashboard statistics.

**Request**:
```typescript
{
  period?: 'today' | 'week' | 'month' | 'year';
}
```

**Response**:
```typescript
{
  active_interventions: number;
  completed_today: number;
  pending_tasks: number;
  overdue_tasks: number;
  technician_utilization: number;
  average_quality_score: number;
  customer_satisfaction_average: number;
  material_low_stock_count: number;
  revenue_current_period: number;
  revenue_previous_period: number;
  revenue_change_percentage: number;
}
```

**Authentication**: Required

---

### Messaging & Notifications

#### `message_send`

Send a message.

**Request**:
```typescript
{
  recipient_id: string;
  subject: string;
  body: string;
  priority?: 'low' | 'normal' | 'high';
  task_id?: string;
}
```

**Response**: Message object

**Authentication**: Required

---

#### `message_get_list`

Get messages for current user.

**Request**:
```typescript
{
  folder: 'inbox' | 'sent' | 'archived';
  unread_only?: boolean;
  pagination?: {
    page: number;
    page_size: number;
  };
}
```

**Response**:
```typescript
{
  messages: Message[];
  total: number;
  unread_count: number;
}
```

**Authentication**: Required

---

#### `send_notification`

Send a notification.

**Request**:
```typescript
{
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  channels?: Array<'in_app' | 'email' | 'push'>;
}
```

**Response**:
```typescript
{
  notification_id: string;
  sent_channels: string[];
}
```

**Authentication**: Required (Admin or System)

---

### Settings

#### `get_user_settings`

Get current user settings.

**Request**: No parameters

**Response**: UserSettings object

**Authentication**: Required

---

#### `update_user_preferences`

Update user preferences.

**Request**:
```typescript
{
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  date_format?: string;
  time_format?: '12h' | '24h';
  auto_refresh?: boolean;
  refresh_interval?: number;
}
```

**Response**: Updated UserSettings object

**Authentication**: Required

---

#### `update_user_notifications`

Update notification preferences.

**Request**:
```typescript
{
  email_enabled?: boolean;
  push_enabled?: boolean;
  task_assigned?: boolean;
  task_updated?: boolean;
  task_overdue?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
```

**Response**: Updated UserSettings object

**Authentication**: Required

---

### System Administration

#### `health_check`

Check system health.

**Request**: No parameters

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    response_time_ms: number;
  };
  cache: {
    operational: boolean;
    hit_rate: number;
  };
  uptime_seconds: number;
}
```

**Authentication**: Required (Admin)

---

#### `get_database_stats`

Get database statistics.

**Request**: No parameters

**Response**:
```typescript
{
  size_bytes: number;
  table_count: number;
  tables: Array<{
    name: string;
    row_count: number;
    size_bytes: number;
  }>;
  wal_size_bytes: number;
  page_size: number;
  page_count: number;
}
```

**Authentication**: Required (Admin)

---

#### `vacuum_database`

Vacuum database to reclaim space.

**Request**: No parameters

**Response**:
```typescript
{
  success: boolean;
  size_before: number;
  size_after: number;
  space_reclaimed: number;
}
```

**Authentication**: Required (Admin)

---

### WebSocket Real-time Updates

#### `init_websocket_server`

Initialize WebSocket server.

**Request**:
```typescript
{
  port?: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  port: number;
  url: string;
}
```

**Authentication**: Required (Admin)

---

#### `broadcast_task_update`

Broadcast task update to all connected clients.

**Request**:
```typescript
{
  task: Task;
  action: 'created' | 'updated' | 'deleted';
}
```

**Response**:
```typescript
{
  broadcast: boolean;
  recipients: number;
}
```

**Authentication**: Required

---

## Data Models

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'technician' | 'supervisor' | 'viewer';
  phone?: string;
  is_active: boolean;
  last_login_at?: number;
  login_count: number;
  created_at: number;
  updated_at: number;
}
```

### Client

```typescript
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_type: 'individual' | 'business';
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  company_name?: string;
  tax_id?: string;
  contact_person?: string;
  notes?: string;
  tags?: string[];
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  last_task_date?: string;
  created_at: number;
  updated_at: number;
}
```

### Task

```typescript
interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vin?: string;
  ppf_zones?: string;
  custom_ppf_zones?: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  client_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
  tags?: string[];
  estimated_duration?: number;
  actual_duration?: number;
  created_at: number;
  updated_at: number;
}
```

### Intervention

```typescript
interface Intervention {
  id: string;
  task_id: string;
  task_number: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  vehicle_plate: string;
  vehicle_model?: string;
  vehicle_make?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_vin?: string;
  client_id?: string;
  client_name?: string;
  technician_id?: string;
  technician_name?: string;
  intervention_type: 'ppf' | 'ceramic' | 'detailing' | 'other';
  current_step: number;
  completion_percentage: number;
  ppf_zones_config?: string;
  film_type?: 'standard' | 'premium' | 'matte' | 'colored';
  film_brand?: string;
  scheduled_at?: number;
  started_at?: number;
  completed_at?: number;
  customer_satisfaction?: number;
  quality_score?: number;
  customer_signature?: string;
  created_at: number;
  updated_at: number;
}
```

### InterventionStep

```typescript
interface InterventionStep {
  id: string;
  intervention_id: string;
  step_number: number;
  step_name: string;
  step_type: 'inspection' | 'preparation' | 'installation' | 'finalization';
  step_status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'skipped' | 'rework';
  description?: string;
  instructions?: string;
  is_mandatory: boolean;
  requires_photos: boolean;
  min_photos_required: number;
  photo_count: number;
  started_at?: number;
  completed_at?: number;
  duration_seconds?: number;
  observations?: string;
  created_at: number;
  updated_at: number;
}
```

### Material

```typescript
interface Material {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  material_type?: string;
  unit_of_measure: string;
  unit_cost: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  supplier_id?: string;
  expiration_date?: string;
  created_at: number;
  updated_at: number;
}
```

## Rate Limiting

**Not currently implemented** - All endpoints are unlimited. Future implementation planned with:
- Rate limits per user role
- Configurable limits per endpoint
- Token bucket algorithm

## Versioning

**Current Version**: v1 (implicit)

Future versions will use URL-based versioning:
- `/api/v1/...`
- `/api/v2/...`

## Pagination

All list endpoints support pagination:

**Request**:
```typescript
{
  pagination: {
    page: number;      // 1-indexed
    page_size: number; // Default: 50, Max: 1000
  }
}
```

**Response**:
```typescript
{
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

## Filtering & Sorting

List endpoints support filtering and sorting:

**Filters**: Specified in `filters` object
**Sorting**: Specified in `sort` object

```typescript
{
  filters: {
    field: value,
    // ...
  },
  sort: {
    field: 'asc' | 'desc'
  }
}
```

---

**API Version**: 1.0  
**Last Updated**: February 2026  
**Total Endpoints**: 100+
