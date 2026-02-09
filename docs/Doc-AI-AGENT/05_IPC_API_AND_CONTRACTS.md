# RPMA v2 IPC API and Contracts

## IPC Contract Rules

### Authentication Pattern
All protected commands require a `session_token` parameter for authentication:

```typescript
// Frontend call
const result = await ipcClient.invoke('some_command', {
  // command-specific parameters
  sessionToken: 'user-session-token-here'
});

// Backend command signature
#[tauri::command]
async fn some_command(
  param1: String,
  param2: i32,
  session_token: String,
  app_state: State<'_, Arc<AppState>>,
) -> Result<ResponseType, AppError> {
  // Authentication happens first
  let user = authenticate(&session_token, &app_state.db)?;
  // ... rest of implementation
}
```

### Response Envelope
All responses follow a consistent structure:

```typescript
// Success response
{
  success: true,
  data: T,          // The actual response data
  message?: string  // Optional success message
}

// Error response
{
  success: false,
  error: {
    code: string,      // Error code (e.g., "VALIDATION_ERROR")
    message: string,   // Human-readable error message
    details?: any      // Optional error details
  }
}
```

### Correlation IDs
All requests and responses include correlation IDs for tracing:

```typescript
// Frontend automatically adds correlation ID
const requestId = generateRequestId();
const response = await ipcClient.invoke('command', {
  ...params,
  _requestId: requestId
});

// Backend logs include the correlation ID
info!("[{}] Processing request", request_id);
```

## Top 30 Most Important Commands

### Authentication Commands

#### 1. login
**Purpose**: Authenticate user with email/password
**Parameters**: 
- `email: string`
- `password: string`
- `remember_me?: boolean`
**Permissions**: Public
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

#### 2. login_with_2fa
**Purpose**: Complete authentication with 2FA code
**Parameters**:
- `session_token: string` (from initial login)
- `code: string`
**Permissions**: Public
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

#### 3. logout
**Purpose**: Terminate user session
**Parameters**:
- `session_token: string`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

#### 4. refresh_token
**Purpose**: Refresh expired access token
**Parameters**:
- `refresh_token: string`
**Permissions**: Valid refresh token
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

### Task Management Commands

#### 5. create_task
**Purpose**: Create a new task/work request
**Parameters**:
- `title: string`
- `description?: string`
- `client_id: string`
- `vehicle_plate: string`
- `vehicle_make: string`
- `vehicle_model: string`
- `vehicle_year?: number`
- `ppf_zones?: string[]`
- `priority: 'low' | 'medium' | 'high' | 'urgent'`
- `scheduled_date?: string` (ISO 8601)
**Permissions**: Technician+
**Implemented**: `src-tauri/src/commands/task/create_task.rs`
**Consumed**: `frontend/src/lib/ipc/domains/tasks.ts`

#### 6. get_task
**Purpose**: Retrieve task details
**Parameters**:
- `task_id: string`
**Permissions**: Assigned user or Admin/Supervisor
**Implemented**: `src-tauri/src/commands/task/get_task.rs`
**Consumed**: `frontend/src/lib/ipc/domains/tasks.ts`

#### 7. list_tasks
**Purpose**: List tasks with filtering
**Parameters**:
- `filters?: {
    status?: string[]
    priority?: string[]
    technician_id?: string
    client_id?: string
    date_from?: string
    date_to?: string
    search?: string
    limit?: number
    offset?: number
  }`
**Permissions**: Authenticated user (filtered by role)
**Implemented**: `src-tauri/src/commands/task/list_tasks.rs`
**Consumed**: `frontend/src/lib/ipc/domains/tasks.ts`

#### 8. update_task_status
**Purpose**: Change task status
**Parameters**:
- `task_id: string`
- `status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'`
- `notes?: string`
**Permissions**: Assigned user or Admin/Supervisor
**Implemented**: `src-tauri/src/commands/task/update_task.rs`
**Consumed**: `frontend/src/lib/ipc/domains/tasks.ts`

#### 9. assign_task
**Purpose**: Assign task to technician
**Parameters**:
- `task_id: string`
- `technician_id: string`
**Permissions**: Admin/Supervisor
**Implemented**: `src-tauri/src/commands/task/assign_task.rs`
**Consumed**: `frontend/src/lib/ipc/domains/tasks.ts`

### Intervention Workflow Commands

#### 10. start_intervention
**Purpose**: Convert task to active intervention
**Parameters**:
- `task_id: string`
- `environmental_conditions?: {
    weather: string
    lighting: string
    temperature: number
    humidity: number
  }`
**Permissions**: Assigned technician
**Implemented**: `src-tauri/src/commands/intervention/start_intervention.rs`
**Consumed**: `frontend/src/lib/ipc/domains/interventions.ts`

#### 11. get_intervention
**Purpose**: Retrieve intervention details
**Parameters**:
- `intervention_id: string`
**Permissions**: Assigned user or Admin/Supervisor
**Implemented**: `src-tauri/src/commands/intervention/get_intervention.rs`
**Consumed**: `frontend/src/lib/ipc/domains/interventions.ts`

#### 12. start_step
**Purpose**: Begin a workflow step
**Parameters**:
- `intervention_id: string`
- `step_id: string`
- `location?: {
    latitude: number
    longitude: number
    accuracy: number
  }`
**Permissions**: Assigned technician
**Implemented**: `src-tauri/src/commands/intervention/start_step.rs`
**Consumed**: `frontend/src/lib/ipc/domains/interventions.ts`

#### 13. complete_step
**Purpose**: Complete a workflow step
**Parameters**:
- `intervention_id: string`
- `step_id: string`
- `notes?: string`
- `photo_ids: string[]`
- `location?: {
    latitude: number
    longitude: number
    accuracy: number
  }`
**Permissions**: Assigned technician
**Implemented**: `src-tauri/src/commands/intervention/complete_step.rs`
**Consumed**: `frontend/src/lib/ipc/domains/interventions.ts`

#### 14. upload_photo
**Purpose**: Upload photo for intervention step
**Parameters**:
- `intervention_id: string`
- `step_id?: string`
- `file_path: string`
- `classification: 'before' | 'during' | 'after'`
- `metadata?: {
    gps_coordinates?: { lat: number, lng: number }
    exif_data?: any
  }`
**Permissions**: Assigned technician
**Implemented**: `src-tauri/src/commands/intervention/upload_photo.rs`
**Consumed**: `frontend/src/lib/ipc/domains/interventions.ts`

### Client Management Commands

#### 15. create_client
**Purpose**: Add new client
**Parameters**:
- `client_type: 'individual' | 'business'`
- `first_name?: string`
- `last_name?: string`
- `company_name?: string`
- `email: string`
- `phone: string`
- `address: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }`
**Permissions**: All authenticated users
**Implemented**: `src-tauri/src/commands/client.rs`
**Consumed**: `frontend/src/lib/ipc/domains/clients.ts`

#### 16. get_client
**Purpose**: Retrieve client details
**Parameters**:
- `client_id: string`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/client.rs`
**Consumed**: `frontend/src/lib/ipc/domains/clients.ts`

#### 17. list_clients
**Purpose**: Search and list clients
**Parameters**:
- `search?: string`
- `client_type?: 'individual' | 'business'`
- `limit?: number`
- `offset?: number`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/client.rs`
**Consumed**: `frontend/src/lib/ipc/domains/clients.ts`

### Inventory Management Commands

#### 18. list_materials
**Purpose**: Get material inventory
**Parameters**:
- `category_id?: string`
- `include_out_of_stock?: boolean`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/material.rs`
**Consumed**: `frontend/src/lib/ipc/domains/inventory.ts`

#### 19. consume_material
**Purpose**: Record material usage
**Parameters**:
- `material_id: string`
- `quantity: number`
- `intervention_id?: string`
- `notes?: string`
**Permissions**: Technician+
**Implemented**: `src-tauri/src/commands/material.rs`
**Consumed**: `frontend/src/lib/ipc/domains/inventory.ts`

#### 20. adjust_inventory
**Purpose**: Adjust inventory counts
**Parameters**:
- `material_id: string`
- `new_quantity: number`
- `reason: string`
**Permissions**: Admin/Supervisor
**Implemented**: `src-tauri/src/commands/material.rs`
**Consumed**: `frontend/src/lib/ipc/domains/inventory.ts`

### Reporting Commands

#### 21. generate_completion_report
**Purpose**: Generate intervention completion report
**Parameters**:
- `date_from: string` (ISO 8601)
- `date_to: string` (ISO 8601)
- `technician_id?: string`
- `format: 'pdf' | 'excel'`
**Permissions**: Admin/Supervisor/Technician (own reports)
**Implemented**: `src-tauri/src/commands/reports/generate_completion_report.rs`
**Consumed**: `frontend/src/lib/ipc/domains/reports.ts`

#### 22. get_performance_metrics
**Purpose**: Get performance analytics
**Parameters**:
- `period: 'week' | 'month' | 'quarter' | 'year'`
- `technician_id?: string`
**Permissions**: Admin/Supervisor
**Implemented**: `src-tauri/src/commands/reports/performance.rs`
**Consumed`: `frontend/src/lib/ipc/domains/reports.ts`

### User Management Commands

#### 23. get_user_profile
**Purpose**: Get current user profile
**Parameters**: None (uses session token)
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

#### 24. update_user_profile
**Purpose**: Update user profile
**Parameters**:
- `first_name?: string`
- `last_name?: string`
- `phone?: string`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

#### 25. change_password
**Purpose**: Change user password
**Parameters**:
- `current_password: string`
- `new_password: string`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/auth.rs`
**Consumed**: `frontend/src/lib/ipc/domains/auth.ts`

### Settings Commands

#### 26. get_settings
**Purpose**: Get application settings
**Parameters**: None (uses session)
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/settings.rs`
**Consumed**: `frontend/src/lib/ipc/domains/settings.ts`

#### 27. update_settings
**Purpose**: Update user settings
**Parameters**:
- `theme?: 'light' | 'dark' | 'auto'`
- `language?: string`
- `notifications?: {
    email: boolean
    push: boolean
  }`
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/settings.rs`
**Consumed**: `frontend/src/lib/ipc/domains/settings.ts`

### System Commands

#### 28. sync_data
**Purpose**: Trigger manual data synchronization
**Parameters**: None
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/sync.rs`
**Consumed**: `frontend/src/lib/ipc/domains/sync.ts`

#### 29. get_sync_status
**Purpose**: Get synchronization status
**Parameters**: None
**Permissions**: Authenticated user
**Implemented**: `src-tauri/src/commands/sync.rs`
**Consumed**: `frontend/src/lib/ipc/domains/sync.ts`

#### 30. health_check
**Purpose**: Check system health
**Parameters**: None
**Permissions**: Public
**Implemented**: `src-tauri/src/commands/system.rs`
**Consumed**: `frontend/src/lib/ipc/domains/system.ts`

## Type Synchronization Approach

### Rust-to-TypeScript Generation
Types are automatically generated from Rust models using the `ts-rs` crate:

```rust
// In Rust model
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum TaskStatus {
    Draft,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    OnHold,
}
```

### Generated TypeScript Types
The generated types are placed in `frontend/src/lib/backend.ts`:

```typescript
// Generated TypeScript
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

export enum TaskStatus {
  Draft = "Draft",
  Scheduled = "Scheduled",
  InProgress = "InProgress",
  Completed = "Completed",
  Cancelled = "Cancelled",
  OnHold = "OnHold",
}
```

### Type Sync Command
```bash
# Generate TypeScript types from Rust models
npm run types:sync

# Validate types are in sync
npm run types:validate

# Check for drift between Rust and TS
npm run types:drift-check
```

### Custom Frontend Types
Additional frontend-specific types should be placed in separate files:

```typescript
// frontend/src/types/ui.ts
export interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
}

// Not generated from Rust - frontend only
export interface TaskFiltersState {
  search: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  dateRange: [Date, Date] | null;
}
```

## IPC Client Implementation

### Base Client
```typescript
// frontend/src/lib/ipc/client.ts
import { invoke } from '@tauri-apps/api/core';
import { ApiResponse } from './types';

class IpcClient {
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  async invoke<T>(command: string, payload: any = {}): Promise<T> {
    const requestId = this.generateRequestId();
    const correlationId = this.generateCorrelationId();
    
    // Add request metadata
    const request = {
      ...payload,
      _requestId: requestId,
      _correlationId: correlationId,
      _timestamp: new Date().toISOString(),
    };

    // Track request for timeout
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(requestId);
      throw new Error(`Request ${command} timed out`);
    }, 30000);

    const promise = new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });
    });

    try {
      const response = await invoke<ApiResponse<T>>(command, request);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error.message);
      }
    } finally {
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }
}

export const ipcClient = new IpcClient();
```

### Domain Wrapper Pattern
```typescript
// frontend/src/lib/ipc/domains/tasks.ts
import { ipcClient } from '../client';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskFilters } from '../../../lib/backend';

export const tasksApi = {
  async get(taskId: string): Promise<Task> {
    return ipcClient.invoke('get_task', { taskId });
  },

  async list(filters: TaskFilters = {}): Promise<Task[]> {
    return ipcClient.invoke('list_tasks', { filters });
  },

  async create(data: CreateTaskRequest): Promise<Task> {
    return ipcClient.invoke('create_task', data);
  },

  async updateStatus(taskId: string, status: Task['status'], notes?: string): Promise<Task> {
    return ipcClient.invoke('update_task_status', { taskId, status, notes });
  },

  async assign(taskId: string, technicianId: string): Promise<Task> {
    return ipcClient.invoke('assign_task', { taskId, technicianId });
  },
};
```

## Error Handling Across IPC Boundary

### Error Mapping
Backend errors are mapped to appropriate frontend error types:

```rust
// Backend error mapping
impl From<AppError> for ApiResponse<serde_json::Value> {
    fn from(err: AppError) -> Self {
        ApiResponse {
            success: false,
            data: serde_json::Value::Null,
            error: Some(ErrorInfo {
                code: err.error_type().to_string(),
                message: err.to_string(),
                details: None,
            }),
        }
    }
}
```

```typescript
// Frontend error handling
class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// In IPC client
if (!response.success) {
  throw new ApiError(
    response.error.message,
    response.error.code,
    response.error.details
  );
}
```

## Performance Optimization

### Batch Operations
For operations that might involve multiple commands, batch commands are available:

```typescript
// Batch task updates
const updates = [
  { taskId: '1', status: 'completed' },
  { taskId: '2', status: 'cancelled' }
];

await ipcClient.invoke('batch_update_tasks', { updates });
```

### Streaming for Large Datasets
For reports or large data exports:

```typescript
// Stream report generation
const stream = await ipcClient.invoke('generate_report_stream', {
  type: 'completions',
  filters: { dateRange: [from, to] }
});

for await (const chunk of stream) {
  // Process chunk
  updateProgress(chunk.progress);
}
```