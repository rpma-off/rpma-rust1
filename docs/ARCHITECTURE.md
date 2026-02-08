# RPMA v2 - Architecture Documentation

## Table of Contents

- [Introduction](#introduction)
- [Overall Architecture](#overall-architecture)
- [Folder Structure](#folder-structure)
- [Architectural Patterns](#architectural-patterns)
- [Application Layers](#application-layers)
- [Data Flows](#data-flows)
- [Component Communication](#component-communication)
- [State Management](#state-management)
- [Module Dependencies](#module-dependencies)

## Introduction

RPMA v2 is a **hybrid desktop application** built with **Next.js** for the frontend and **Rust/Tauri** for the backend. This document describes the overall architecture, design patterns, data flows, and module dependencies.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                         │
│                   (Next.js / React)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │     Hooks    │  │     State    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Communication   │
                    │     Layer        │
                    │   (Tauri IPC)     │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      Application Layer                         │
│                       (Rust Backend)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Commands   │  │   Services   │  │  Validation  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Repositories │  │     Cache    │  │   Models     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    SQLite Database  │
│                     + 20+ Tables       │
└─────────────────────────────────────────────────────────────────┘
```

## Overall Architecture

### Layered Architecture

RPMA v2 follows a **layered architecture** pattern:

1. **Presentation Layer**: Next.js + React frontend
2. **Communication Layer**: Tauri IPC (WebSockets)
3. **Application Layer**: Rust backend with business logic
4. **Data Layer**: SQLite database with repositories and caching

### Architectural Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Type** | Hybrid desktop/web application |
| **Pattern** | Layered architecture with clean separation |
| **Communication** | Tauri IPC (JSON over WebSockets) |
| **State Management** | Zustand for global state, React Query for server state |
| **Type Safety** | Full TypeScript coverage with Rust type synchronization |
| **Data Flow** | Unidirectional data flow (React) with command pattern (Rust) |
| **Offline-First** | Persistent sync queue for offline operation |
| **Caching** | Multi-layer caching (memory, disk, LRU) |

## Folder Structure

### Complete Directory Tree

```
rpma-rust/
├── frontend/                      # Next.js frontend application
│   ├── src/
│   │   ├── app/                   # Next.js App Router (36 pages)
│   │   │   ├── (auth)/           # Auth pages
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/      # Dashboard pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── tasks/
│   │   │   │   ├── clients/
│   │   │   │   ├── schedule/
│   │   │   │   ├── interventions/
│   │   │   │   ├── inventory/
│   │   │   │   ├── reports/
│   │   │   │   └── analytics/
│   │   │   ├── admin/            # Admin pages
│   │   │   ├── api/             # API routes (70+ endpoints)
│   │   │   │   ├── auth/
│   │   │   │   ├── tasks/
│   │   │   │   ├── clients/
│   │   │   │   └── ...
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Home page
│   │   │
│   │   ├── components/            # React components (190+ files)
│   │   │   ├── ui/              # shadcn/ui components (65 files)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/           # Layout components
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── ...
│   │   │   ├── dashboard/        # Dashboard widgets (30+)
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── StatsGrid.tsx
│   │   │   │   └── ...
│   │   │   ├── tasks/            # Task components (40+)
│   │   │   │   ├── TaskManager.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── ...
│   │   │   ├── calendar/         # Calendar components (15+)
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   └── ...
│   │   │   ├── workflow/         # Workflow components (20+)
│   │   │   │   ├── PPFWorkflowHeader.tsx
│   │   │   │   └── ...
│   │   │   ├── analytics/        # Analytics components (8)
│   │   │   ├── inventory/        # Inventory components (6)
│   │   │   ├── settings/         # Settings components (6)
│   │   │   └── auth/            # Auth components (4)
│   │   │
│   │   ├── hooks/                # Custom React hooks (60+)
│   │   │   ├── useTasks.ts
│   │   │   ├── useClients.ts
│   │   │   ├── useInterventionWorkflow.ts
│   │   │   ├── useCalendar.ts
│   │   │   └── ...
│   │   │
│   │   ├── lib/                  # Utilities and libraries
│   │   │   ├── ipc/             # IPC communication
│   │   │   │   ├── client.ts    # IPC client (1300+ lines)
│   │   │   │   └── commands.ts  # Command registry (159 commands)
│   │   │   ├── backend.ts       # Auto-generated types (850+ lines)
│   │   │   ├── services/        # Frontend services
│   │   │   ├── validation/      # Zod schemas
│   │   │   └── utils/           # Utility functions
│   │   │
│   │   ├── stores/               # Zustand stores (2)
│   │   │   ├── layoutStore.ts   # UI layout state
│   │   │   └── calendarStore.ts # Calendar state
│   │   │
│   │   ├── types/                # TypeScript types
│   │   │   ├── auth.types.ts
│   │   │   ├── task.types.ts
│   │   │   ├── client.types.ts
│   │   │   └── ...
│   │   │
│   │   └── constants/            # Application constants
│   │
│   ├── public/                   # Static assets
│   ├── tailwind.config.ts         # Tailwind configuration
│   ├── next.config.js            # Next.js configuration
│   └── package.json              # Frontend dependencies
│
├── src-tauri/                    # Rust backend application
│   ├── src/
│   │   ├── commands/             # Tauri IPC handlers (80+ commands)
│   │   │   ├── auth.rs
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── intervention/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── ...
│   │   │
│   │   ├── models/                # Domain models & DTOs (19 files)
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── user.rs
│   │   │   ├── intervention.rs
│   │   │   ├── photo.rs
│   │   │   └── ...
│   │   │
│   │   ├── repositories/          # Data access layer (15 repositories)
│   │   │   ├── task_repository.rs
│   │   │   ├── client_repository.rs
│   │   │   ├── user_repository.rs
│   │   │   ├── photo_repository.rs
│   │   │   └── ...
│   │   │
│   │   ├── services/              # Business logic layer (50+ services)
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── auth.rs
│   │   │   ├── intervention.rs
│   │   │   ├── reports/
│   │   │   ├── photo/
│   │   │   └── ...
│   │   │
│   │   ├── db/                    # Database management
│   │   │   ├── connection.rs      # SQLite connection pooling
│   │   │   ├── migrations.rs      # Migration runner
│   │   │   ├── queries.rs
│   │   │   └── utils.rs
│   │   │
│   │   ├── logging/               # Logging infrastructure
│   │   │   ├── logger.rs
│   │   │   └── request_logger.rs
│   │   │
│   │   ├── sync/                  # Sync engine
│   │   │   ├── queue.rs
│   │   │   └── service.rs
│   │   │
│   │   ├── menu/                  # Application menus
│   │   │   ├── menu.rs
│   │   │   └── events.rs
│   │   │
│   │   ├── bin/                   # CLI executables
│   │   │   ├── export-types.rs    # TypeScript type generator
│   │   │   └── backfill_client_stats.rs
│   │   │
│   │   ├── main.rs                # Application entry point (418 lines)
│   │   └── lib.rs                 # Library root
│   │
│   ├── migrations/                # Database migrations (27 files)
│   │   ├── 002_rename_ppf_zone.sql
│   │   ├── 003_add_client_stats_triggers.sql
│   │   └── ...
│   │
│   ├── benches/                   # Performance benchmarks
│   ├── tests/                     # Integration tests
│   ├── Cargo.toml                 # Rust dependencies
│   └── tauri.conf.json            # Tauri configuration
│
├── scripts/                       # Build & validation scripts (12 scripts)
│   ├── write-types.js             # Type synchronization
│   ├── validate-types.js          # Type validation
│   ├── check_db.js                # Database inspection
│   └── ...
│
├── docs/                          # Documentation
│   ├── MIGRATION_SYSTEM_GUIDE.md  # Database migration docs
│   └── SCRIPTS_DOCUMENTATION.md   # Scripts reference
│
├── .github/                       # GitHub configuration
│   └── workflows/
│       └── ci.yml                # CI/CD pipeline
│
├── .env                           # Environment variables
├── package.json                   # Root package.json (monorepo)
├── Cargo.toml                     # Workspace configuration
├── tsconfig.json                  # TypeScript configuration
└── AGENTS.md                      # Project structure documentation
```

## Architectural Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access logic.

**Implementation**:
```rust
// src-tauri/src/repositories/task_repository.rs
pub struct TaskRepository {
    db: Arc<AsyncDatabase>,
}

impl TaskRepository {
    pub async fn find_by_id(&self, id: &str) -> RepoResult<Option<Task>> {
        let query = "SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL";
        self.db.fetch_one(query, &[id]).await
    }

    pub async fn save(&self, task: &Task) -> RepoResult<Task> {
        let query = r#"
            INSERT OR REPLACE INTO tasks (
                id, title, status, priority, client_id, technician_id, ...
            ) VALUES (?, ?, ?, ?, ?, ?, ...)
        "#;
        self.db.execute(query, params).await?;
        self.find_by_id(&task.id).await
    }
}
```

**Benefits**:
- Consistent data access interface
- Easy to mock for testing
- Database-agnostic business logic
- Centralized query optimization

### 2. Service Facade Pattern

**Purpose**: Orchestrate business logic across multiple sub-services.

**Implementation**:
```rust
// src-tauri/src/services/task.rs
pub struct TaskService {
    crud_service: Arc<TaskCrudService>,
    validation_service: Arc<TaskValidationService>,
    statistics_service: Arc<TaskStatisticsService>,
}

impl TaskService {
    pub async fn create_task(&self, request: CreateTaskRequest) -> Result<Task, AppError> {
        // Validate
        self.validation_service.validate_create(&request)?;

        // Create
        let task = self.crud_service.create(request).await?;

        // Update statistics
        self.statistics_service.update_cache().await;

        Ok(task)
    }
}
```

**Benefits**:
- Clear separation of concerns
- Easy to extend with new features
- Testable components
- Single entry point for complex operations

### 3. Builder Pattern

**Purpose**: Initialize complex services with dependencies.

**Implementation**:
```rust
// src-tauri/src/service_builder.rs
pub struct ServiceBuilder;

impl ServiceBuilder {
    pub async fn build() -> Result<AppStateType, AppError> {
        // Create database connection
        let db = Arc::new(AsyncDatabase::new("rpma.db").await?);

        // Create repositories
        let task_repo = Arc::new(TaskRepository::new(db.clone()));
        let client_repo = Arc::new(ClientRepository::new(db.clone()));

        // Create services
        let task_service = Arc::new(TaskService::new(task_repo.clone()));
        let client_service = Arc::new(ClientService::new(client_repo.clone()));

        // Return app state
        Ok(AppStateType {
            task_service,
            client_service,
            db,
        })
    }
}
```

**Benefits**:
- Centralized initialization
- Dependency injection
- Easy to manage complex dependencies
- Testable with mocked dependencies

### 4. Strategy Pattern

**Purpose**: Different implementations for workflows.

**Implementation**:
```rust
// src-tauri/src/services/workflow_strategy.rs
pub trait WorkflowStrategy {
    async fn get_steps(&self) -> Result<Vec<WorkflowStep>, AppError>;
    async fn validate_step(&self, step: &WorkflowStep) -> Result<(), AppError>;
}

pub struct PPFWorkflowStrategy;

impl WorkflowStrategy for PPFWorkflowStrategy {
    async fn get_steps(&self) -> Result<Vec<WorkflowStep>, AppError> {
        Ok(vec![
            WorkflowStep::Preparation,
            WorkflowStep::Inspection,
            WorkflowStep::Installation,
            WorkflowStep::Finalization,
        ])
    }
}

pub struct CeramicWorkflowStrategy;

impl WorkflowStrategy for CeramicWorkflowStrategy {
    async fn get_steps(&self) -> Result<Vec<WorkflowStep>, AppError> {
        Ok(vec![
            WorkflowStep::Preparation,
            WorkflowStep::Application,
            WorkflowStep::Curing,
            WorkflowStep::Finalization,
        ])
    }
}
```

**Benefits**:
- Flexible workflow implementations
- Easy to add new workflow types
- Runtime strategy selection
- Testable strategies

### 5. Query Pattern

**Purpose**: Build dynamic queries with filters.

**Implementation**:
```rust
// src-tauri/src/repositories/base_repository.rs
pub trait QueryBuilder {
    fn build_where_clause(&self) -> String;
    fn build_order_by_clause(&self) -> String;
    fn build_limit_offset(&self) -> (Option<String>, Option<Vec<Box<dyn ToSql>>>);
}

pub struct TaskQuery {
    status: Option<Vec<TaskStatus>>,
    technician_id: Option<String>,
    client_id: Option<String>,
    date_range: Option<(String, String)>,
}

impl QueryBuilder for TaskQuery {
    fn build_where_clause(&self) -> String {
        let mut conditions = vec![];

        if let Some(statuses) = &self.status {
            let placeholders = statuses.iter().map(|_| "?").join(", ");
            conditions.push(format!("status IN ({})", placeholders));
        }

        if let Some(tech_id) = &self.technician_id {
            conditions.push("technician_id = ?".to_string());
        }

        // ...

        if conditions.is_empty() {
            "1=1".to_string()
        } else {
            conditions.join(" AND ")
        }
    }
}
```

**Benefits**:
- Type-safe query building
- Reusable query components
- Easy to add new filters
- SQL injection prevention

### 6. Event Bus Pattern

**Purpose**: Publish-subscribe for real-time updates.

**Implementation**:
```rust
// src-tauri/src/sync/event_bus.rs
pub enum EventBusEvent {
    TaskCreated(Task),
    TaskUpdated(String, Task),
    TaskDeleted(String),
    InterventionStarted(Intervention),
    InterventionCompleted(Intervention),
}

pub struct EventBus {
    subscribers: Arc<RwLock<HashMap<String, Vec<Box<dyn EventHandler>>>>,
}

impl EventBus {
    pub fn subscribe<F>(&self, event_type: &str, handler: F)
    where F: Fn(EventBusEvent) + Send + Sync + 'static,
    {
        // Subscribe handler to event type
    }

    pub fn publish(&self, event: EventBusEvent) {
        // Notify all subscribers
    }
}
```

**Benefits**:
- Decoupled components
- Real-time updates
- Easy to add new event types
- Testable event handling

### 7. Async/Await Pattern

**Purpose**: Non-blocking operations.

**Implementation**:
```rust
// src-tauri/src/db/connection.rs
pub struct AsyncDatabase {
    pool: Arc<Pool<SqliteConnection>>,
}

impl AsyncDatabase {
    pub async fn execute(&self, query: &str, params: &[&dyn ToSql]) -> RepoResult<()> {
        let pool = self.pool.clone();
        let query = query.to_string();
        let params: Vec<Box<dyn ToSql>> = params.iter().map(|p| Box::new(*p) as Box<dyn ToSql>).collect();

        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            conn.execute(&query, &params)?;
            Ok(())
        })
        .await?
    }
}
```

**Benefits**:
- Non-blocking database operations
- Better concurrency
- Responsive UI
- Efficient resource usage

### 8. Soft Delete Pattern

**Purpose**: Preserve audit trail.

**Implementation**:
```rust
// Queries include soft delete check
pub async fn find_by_id(&self, id: &str) -> RepoResult<Option<Task>> {
    let query = "SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL";
    // ...
}

pub async fn soft_delete(&self, id: &str, user_id: &str) -> RepoResult<bool> {
    let query = "UPDATE tasks SET deleted_at = ?, deleted_by = ? WHERE id = ?";
    let timestamp = chrono::Utc::now().timestamp_millis();
    self.execute(query, &[&timestamp.to_string(), user_id, id]).await
}
```

**Benefits**:
- Preserves data for audit
- Can recover deleted records
- Comprehensive history
- Regulatory compliance

### 9. Offline-First Pattern

**Purpose**: Works offline with sync queue.

**Implementation**:
```rust
// src-tauri/src/sync/queue.rs
pub struct SyncQueue {
    db: Arc<AsyncDatabase>,
}

impl SyncQueue {
    pub async fn enqueue(&self, operation: SyncOperation) -> RepoResult<i64> {
        let query = r#"
            INSERT INTO sync_queue (
                operation_type, entity_type, entity_id, data, timestamp_utc, status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
        "#;
        self.execute(query, &[
            &operation.operation_type.to_string(),
            &operation.entity_type.to_string(),
            &operation.entity_id,
            &serde_json::to_string(&operation.data)?,
            &operation.timestamp_utc.to_string(),
        ]).await
    }

    pub async fn process_queue(&self) -> Result<Vec<SyncResult>, AppError> {
        // Get pending operations
        let operations = self.dequeue_batch(100).await?;

        // Process each operation
        let mut results = vec![];
        for operation in operations {
            match self.process_operation(&operation).await {
                Ok(result) => {
                    self.mark_completed(operation.id).await?;
                    results.push(result);
                }
                Err(e) => {
                    self.mark_failed(operation.id, &e.to_string()).await?;
                }
            }
        }

        Ok(results)
    }
}
```

**Benefits**:
- Works 100% offline
- Seamless sync when online
- Operation dependencies
- Retry with exponential backoff

### 10. Type Synchronization Pattern

**Purpose**: Auto-sync Rust types to TypeScript.

**Implementation**:
```rust
// src-tauri/src/bin/export-types.rs
fn main() -> Result<()> {
    let mut type_defs = String::new();

    // Generate types from Rust structs
    type_defs.push_str("// Auto-generated from Rust models\n\n");
    type_defs.push_str("export type Task = {\n");
    // ... generate type definitions ...

    // Write to frontend
    let output_path = "frontend/src/lib/backend.ts";
    fs::write(output_path, type_defs)?;

    Ok(())
}
```

**Benefits**:
- Single source of truth
- Type safety across languages
- Automated synchronization
- Prevents type drift

## Application Layers

### Presentation Layer (Frontend)

**Technology**: Next.js 14.2 + React 18.3.1

**Components**:
- **Pages**: 36 routes in Next.js App Router
- **Components**: 190+ React components
- **Hooks**: 60+ custom React hooks
- **State**: Zustand stores for global state
- **Types**: TypeScript type definitions

**Responsibilities**:
- UI rendering and interaction
- Form handling and validation
- API client calls via Tauri IPC
- State management and caching
- Error handling and user feedback

**Key Features**:
- Server-side rendering (SSR) via Next.js
- Client-side navigation
- Code splitting and lazy loading
- SEO-friendly routing

### Communication Layer (Tauri IPC)

**Technology**: Tauri 2.1 + WebSockets

**Components**:
- **IPC Client**: Frontend wrapper for Tauri invoke
- **Command Registry**: 159 registered commands
- **Error Handler**: Centralized error handling
- **Compression**: Automatic Gzip compression

**Responsibilities**:
- Serialize/deserialize requests
- Transport data between frontend/backend
- Handle compression and streaming
- Manage connection lifecycle

**Key Features**:
- Bidirectional communication
- Automatic compression for large payloads
- Chunked streaming for very large data
- MessagePack support for efficiency

### Application Layer (Backend)

**Technology**: Rust 1.77+

**Components**:
- **Commands**: 80+ Tauri IPC command handlers
- **Services**: 50+ business logic modules
- **Validation**: Input validation and sanitization
- **Models**: 19 domain models and DTOs

**Responsibilities**:
- Execute business logic
- Validate inputs
- Enforce authorization
- Coordinate operations
- Generate responses

**Key Features**:
- Type-safe command handlers
- Comprehensive validation
- Role-based access control
- Async/await for non-blocking operations

### Data Layer (Database)

**Technology**: SQLite with WAL mode

**Components**:
- **Repositories**: 15 data access modules
- **Connection Pool**: r2d2 connection pooling
- **Migrations**: 27 versioned migrations
- **Cache**: Multi-layer caching (memory, disk, LRU)

**Responsibilities**:
- Persist data
- Execute queries
- Manage transactions
- Optimize performance

**Key Features**:
- Connection pooling
- Prepared statement caching
- WAL mode for concurrency
- Periodic checkpointing

## Data Flows

### 1. Task Creation Flow

```
User → Frontend (TaskForm component)
    ↓
Form validation (Zod schemas)
    ↓
IPC Client → Tauri IPC
    ↓
Backend Command (task_crud)
    ↓
Service Layer (TaskService)
    ↓
    Validation Service (TaskValidationService)
    ↓
    Repository (TaskRepository)
    ↓
    Database (SQLite)
    ↓
    Response → Frontend → User
```

### 2. Intervention Workflow Flow

```
Technician → Frontend (InterventionWorkflow component)
    ↓
Start intervention
    ↓
IPC Client → intervention_start command
    ↓
InterventionService
    ↓
    Check: No active intervention exists
    ↓
    Create intervention in database
    ↓
    Initialize workflow steps
    ↓
    Response with intervention and steps
    ↓
Frontend displays workflow steps
    ↓
Technician advances through steps
    ↓
Each step: intervention_advance_step command
    ↓
Update step status, intervention progress
    ↓
Finalize: intervention_finalize command
    ↓
    Complete intervention, update task status
```

### 3. Photo Upload Flow

```
Technician → Frontend (PhotoUpload component)
    ↓
Select photo file
    ↓
    Validate: file size, dimensions, MIME type
    ↓
    Compress image (optional)
    ↓
    Upload via IPC: photo_upload command
    ↓
PhotoService
    ↓
    Save to local filesystem
    ↓
    Generate thumbnail
    ↓
    Save metadata to database
    ↓
    Queue for cloud backup (if enabled)
    ↓
    Response with photo URL
    ↓
Frontend displays photo in gallery
```

### 4. Synchronization Flow

```
Background Sync Service
    ↓
Check for internet connection
    ↓
    Get pending operations from sync_queue
    ↓
    Process operations in dependency order
    ↓
For each operation:
    ↓
    Send to remote server (via HTTP)
    ↓
    If successful:
        ↓
        Mark operation as completed
        ↓
    If failed:
        ↓
        Increment retry count
        ↓
        If max retries reached:
            ↓
            Mark as failed
        Else:
            ↓
            Keep in queue (will retry next cycle)
```

### 5. Authentication Flow

```
User → Login Form
    ↓
Enter email/password
    ↓
Frontend validation
    ↓
IPC: auth_login command
    ↓
AuthService
    ↓
    Find user by email
    ↓
    Verify password hash (Argon2)
    ↓
    If valid:
        ↓
        Generate session token (JWT)
        ↓
        Generate refresh token
        ↓
        Create session record
        ↓
        Update last login timestamp
        ↓
        Return UserSession
        ↓
    Frontend stores tokens
    ↓
    Redirect to dashboard
```

## Component Communication

### Frontend Communication

**IPC Client** (`frontend/src/lib/ipc/client.ts`):

```typescript
export const ipcClient = {
  tasks: {
    async get(id: string, sessionToken: string): Promise<Task> {
      return invoke('task_crud', {
        action: 'Get',
        id,
        session_token: sessionToken,
      });
    },
    async create(data: CreateTaskRequest, sessionToken: string): Promise<Task> {
      return invoke('task_crud', {
        action: 'Create',
        data,
        session_token: sessionToken,
      });
    },
    // ... more methods
  },
  clients: { /* ... */ },
  interventions: { /* ... */ },
  // ... more modules
};
```

**Usage in Components**:

```typescript
import { ipcClient } from '@/lib/ipc/client';

const TaskDetail = ({ taskId, sessionToken }: Props) => {
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    ipcClient.tasks.get(taskId, sessionToken).then(setTask);
  }, [taskId, sessionToken]);

  if (!task) return <Loading />;

  return <div>{task.title}</div>;
};
```

### Backend Communication

**Command Handler** (`src-tauri/src/commands/task.rs`):

```rust
#[tauri::command]
async fn task_crud(
    action: TaskAction,
    session_token: String,
    app_state: State<'_, AppStateType>,
) -> Result<TaskResponse, String> {
    // Validate session
    let session = validate_session(&app_state, &session_token)?;

    // Route to sub-service
    match action {
        TaskAction::Create { data } => {
            let result = app_state.task_service.create(data, session.user_id).await?;
            Ok(TaskResponse::Task(result))
        },
        TaskAction::Get { id } => {
            let result = app_state.task_service.get(id).await?;
            Ok(TaskResponse::Task(result))
        },
        // ... more actions
    }
}
```

### WebSocket Communication

**WebSocket Client**:

```typescript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'task_updated') {
    // Update task in UI
    updateTaskState(message.data);
  }
};
```

**WebSocket Handler** (`src-tauri/src/sync/websocket.rs`):

```rust
pub fn broadcast_task_update(task: Task) {
    let message = json!({
        "type": "task_updated",
        "data": task
    });
    // Broadcast to all connected clients
    websocket_server.broadcast(message);
}
```

## State Management

### Global State (Zustand)

**Layout Store** (`frontend/src/stores/layoutStore.ts`):

```typescript
interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isContextualSidebarOpen: boolean;
  activeModule: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setContextualSidebarOpen: (open: boolean) => void;
  setActiveModule: (module: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isContextualSidebarOpen: false,
  activeModule: 'dashboard',

  toggleSidebar: () => set((state) => ({
    isSidebarCollapsed: !state.isSidebarCollapsed
  })),
  // ... more actions
}));
```

**Calendar Store** (`frontend/src/stores/calendarStore.ts`):

```typescript
interface CalendarState {
  currentView: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  selectedDate: Date | null;
  filters: CalendarFilters;

  setCurrentView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setFilters: (filters: CalendarFilters) => void;
  resetFilters: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  currentView: 'month',
  currentDate: new Date(),
  selectedDate: null,
  filters: { technicianId: null, statuses: [], priorities: [] },

  setCurrentView: (view) => set({ currentView: view }),
  // ... more actions
}));
```

### Server State (React Query)

**Custom Hook** (`frontend/src/hooks/useTasks.ts`):

```typescript
export function useTasks(filters?: TaskFilters, sessionToken?: string) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => ipcClient.tasks.list({ filters, sessionToken }),
    enabled: !!sessionToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Usage**:

```typescript
const TaskList = ({ sessionToken }: Props) => {
  const { data: tasks, isLoading, error } = useTasks(
    { status: ['scheduled', 'in_progress'] },
    sessionToken
  );

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {tasks?.map(task => <TaskCard key={task.id} task={task} />)}
    </ul>
  );
};
```

## Module Dependencies

### Frontend Dependency Graph

```
frontend/src/
├── app/
│   ├── dashboard/      → components/dashboard/
│   ├── tasks/          → components/tasks/
│   ├── clients/        → components/tasks/ (shared)
│   ├── interventions/ → components/workflow/
│   └── api/           → lib/ipc/
│
├── components/
│   ├── ui/            → No dependencies (atomic)
│   ├── layout/        → ui/ (reusable components)
│   ├── dashboard/     → ui/
│   ├── tasks/         → ui/, hooks/useTasks.ts
│   ├── workflow/      → ui/, hooks/useInterventionWorkflow.ts
│   └── ...
│
├── hooks/
│   ├── useTasks.ts     → lib/ipc/client.ts
│   ├── useClients.ts   → lib/ipc/client.ts
│   ├── useCalendar.ts  → stores/calendarStore.ts
│   └── ...
│
├── lib/
│   ├── ipc/
│   │   ├── client.ts      → lib/backend.ts (types)
│   │   └── commands.ts   → lib/backend.ts (types)
│   ├── services/       → lib/ipc/client.ts
│   └── backend.ts      ← Generated from Rust models
│
└── stores/
    ├── layoutStore.ts  → No dependencies
    └── calendarStore.ts → No dependencies
```

### Backend Dependency Graph

```
src-tauri/src/
├── main.rs
│   → services/
│   → commands/
│   → db/
│   └── models/
│
├── commands/
│   ├── auth.rs       → services/auth.rs
│   ├── task.rs       → services/task.rs
│   ├── client.rs     → services/client.rs
│   ├── intervention/ → services/intervention.rs
│   ├── reports/      → services/reports/
│   └── ...
│
├── services/
│   ├── task.rs       → repositories/task_repository.rs
│   │                 → models/task.rs
│   │                 → services/validation.rs
│   ├── client.rs     → repositories/client_repository.rs
│   ├── auth.rs       → repositories/user_repository.rs
│   ├── intervention.rs → repositories/intervention_repository.rs
│   ├── reports/
│   │   └── task.rs  → repositories/task_repository.rs
│   ├── cache.rs       → No dependencies (standalone)
│   └── validation.rs  → No dependencies (standalone)
│
├── repositories/
│   ├── task_repository.rs       → models/task.rs
│   ├── client_repository.rs     → models/client.rs
│   ├── user_repository.rs       → models/user.rs
│   └── ...                     → db/connection.rs
│                                 → models/
│
├── models/
│   ├── task.rs       ← No dependencies
│   ├── client.rs     ← No dependencies
│   ├── user.rs       ← No dependencies
│   └── ...
│
└── db/
    ├── connection.rs  ← No dependencies
    ├── migrations.rs  ← No dependencies
    └── queries.rs     ← models/
```

### Cross-Language Dependencies

```
Rust Models (src-tauri/src/models/*.rs)
    ↓
ts-rs code generation
    ↓
TypeScript Types (frontend/src/lib/backend.ts)
    ↓
Frontend Components
```

## Performance Optimization

### Multi-Layer Caching Strategy

RPMA v2 implements a comprehensive caching system to ensure optimal performance:

#### 1. Memory Cache (L1)
```rust
// src-tauri/src/services/cache.rs
pub struct MemoryCache {
    cache: Arc<RwLock<LruCache<String, CachedData>>>,
    ttl: Duration,
}

impl MemoryCache {
    pub async fn get<T>(&self, key: &str) -> Option<T>
    where
        T: DeserializeOwned,
    {
        let cache = self.cache.read().await;
        if let Some(data) = cache.get(key) {
            if !data.is_expired() {
                return serde_json::from_str::<T>(&data.value).ok();
            }
        }
        None
    }
}
```

#### 2. Disk Cache (L2)
```rust
// Persistent cache for large datasets
pub struct DiskCache {
    base_path: PathBuf,
    max_size: u64,
}

impl DiskCache {
    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let path = self.base_path.join(format!("{}.cache", key));
        match tokio::fs::read(&path).await {
            Ok(data) => Some(data),
            Err(_) => None,
        }
    }
}
```

#### 3. Database Query Cache
```sql
-- Prepared statement caching
CREATE TABLE cached_queries (
    query_hash TEXT PRIMARY KEY,
    result TEXT,
    expires_at INTEGER,
    created_at INTEGER
);

-- Index for efficient expiration cleanup
CREATE INDEX idx_cached_queries_expires ON cached_queries(expires_at);
```

### Database Optimization

#### Connection Pooling
- **Max Connections**: 100 (configurable)
- **Min Idle**: 1
- **Connection Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff

#### WAL Mode Configuration
```sql
PRAGMA journal_mode = WAL;          -- Concurrent reads/writes
PRAGMA synchronous = NORMAL;         -- Balance safety/performance
PRAGMA cache_size = -64000;          -- 64MB cache
PRAGMA temp_store = MEMORY;          -- Store temp tables in memory
PRAGMA mmap_size = 30000000000;      -- 30GB memory-mapped I/O
PRAGMA wal_autocheckpoint = 1000;    -- Checkpoint every 1000 pages
```

#### Query Optimization
```rust
// src-tauri/src/repositories/base_repository.rs
pub trait OptimizedRepository {
    // Batch operations for reduced round trips
    async fn batch_insert<T>(&self, items: Vec<T>) -> Result<Vec<T>>;
    
    // Streaming for large datasets
    async fn stream_query<'a>(
        &'a self,
        query: &'a str,
        params: &'a [&'a dyn ToSql],
    ) -> Pin<Box<dyn Stream<Item = Result<Row>> + Send + 'a>>;
    
    // Prepared statement caching
    async fn execute_prepared(
        &self,
        statement_id: &str,
        params: &[&dyn ToSql],
    ) -> Result<Statement>;
}
```

### Frontend Performance

#### Virtual Scrolling
```typescript
// frontend/src/components/ui/VirtualList.tsx
import { FixedSizeList as List } from 'react-window';

export const VirtualizedTaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TaskCard task={tasks[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={tasks.length}
      itemSize={80}
      itemData={tasks}
    >
      {Row}
    </List>
  );
};
```

#### Code Splitting
```typescript
// frontend/src/app/dashboard/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/AnalyticsChart'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false // Client-side only for complex charts
  }
);
```

#### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@shadcn/ui', 'lucide-react']
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    };
    return config;
  },
};
```

## Security Architecture

### Authentication & Authorization

#### JWT Implementation
```rust
// src-tauri/src/services/auth.rs
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn generate_tokens(&self, user: &User) -> Result<TokenPair> {
        let now = chrono::Utc::now().timestamp_millis();
        
        // Access token (8 hours)
        let access_claims = Claims {
            sub: user.id.clone(),
            role: user.role.clone(),
            exp: now + (8 * 60 * 60 * 1000), // 8 hours
            iat: now,
        };
        
        // Refresh token (30 days)
        let refresh_claims = Claims {
            sub: user.id.clone(),
            role: user.role.clone(),
            exp: now + (30 * 24 * 60 * 60 * 1000), // 30 days
            iat: now,
        };
        
        Ok(TokenPair {
            access_token: encode(&Header::default(), &access_claims, &self.encoding_key)?,
            refresh_token: encode(&Header::default(), &refresh_claims, &self.encoding_key)?,
        })
    }
}
```

#### Password Security
```rust
// Argon2id configuration
const ARGON_CONFIG: argon2::Config = argon2::Config {
    variant: argon2::Variant::Argon2id,
    version: argon2::Version::Version13,
    mem_cost: 32768,        // 32 MB
    time_cost: 3,            // 3 iterations
    lanes: 4,               // 4 threads
    secret: &[],
    ad: &[],
    hash_length: 32,
};

pub fn hash_password(password: &str) -> Result<String> {
    let salt = generate_salt();
    let hash = argon2::hash_encoded(password.as_bytes(), &salt, &ARGON_CONFIG)?;
    Ok(hash)
}
```

#### 2FA Implementation
```rust
// src-tauri/src/services/two_factor.rs
use totp_rs::{Algorithm, TOTP, Secret};

pub struct TwoFactorService {
    issuer: String,
}

impl TwoFactorService {
    pub fn generate_secret(&self) -> Secret {
        Secret::generate_secret()
    }
    
    pub fn generate_qr_code(&self, secret: &Secret, user_id: &str) -> Result<String> {
        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.to_string().as_str(),
            Some(self.issuer.as_str()),
            user_id,
        )?;
        
        let url = totp.get_url();
        let qr_code = qrcode::QrCode::new(&url)?
            .render::<svg::Color>()
            .build();
        
        Ok(qr_code)
    }
}
```

### Data Protection

#### Input Sanitization
```rust
// src-tauri/src/services/validation.rs
pub struct InputSanitizer;

impl InputSanitizer {
    pub fn sanitize_text(input: &str, max_length: usize) -> String {
        input
            .chars()
            .filter(|c| !c.is_control() && *c != '\0')
            .take(max_length)
            .collect::<String>()
            .trim()
            .to_string()
    }
    
    pub fn sanitize_html(input: &str) -> String {
        ammonia::clean(input)
    }
    
    pub fn validate_email(email: &str) -> Result<()> {
        if !email_regex().is_match(email) {
            return Err("Invalid email format".into());
        }
        
        if email.len() > 254 {
            return Err("Email too long".into());
        }
        
        Ok(())
    }
}
```

#### SQL Injection Prevention
```rust
// src-tauri/src/repositories/base_repository.rs
impl SafeRepository for Database {
    async fn safe_query<T>(
        &self,
        query_template: &str,
        params: &[&dyn ToSql],
    ) -> Result<Vec<T>> {
        // Always use prepared statements
        let mut stmt = self.prepare(query_template)?;
        
        // Bind parameters safely
        for (i, param) in params.iter().enumerate() {
            stmt.raw_bind_parameter(i + 1, *param)?;
        }
        
        // Execute and map results
        let rows = stmt.query_map(params, |row| {
            // Safe row mapping with type checking
            serde_json::from_value(row.get::<_, Value>(0)?)
        })?;
        
        Ok(rows.collect::<Result<Vec<_>>>()?)
    }
}
```

#### Encryption at Rest
```rust
// src-tauri/src/services/encryption.rs
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::password_hash::{PasswordHasher, SaltString};

pub struct EncryptionService {
    key: Key<Aes256Gcm>,
}

impl EncryptionService {
    pub fn encrypt(&self, data: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        let cipher = Aes256Gcm::new(&self.key);
        let nonce = Aes256Gcm::generate_nonce(&cipher);
        let ciphertext = cipher.encrypt(&nonce, data)?;
        
        Ok((ciphertext.to_vec(), nonce.to_vec()))
    }
    
    pub fn decrypt(&self, ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>> {
        let cipher = Aes256Gcm::new(&self.key);
        let nonce = Nonce::from_slice(nonce)?;
        
        Ok(cipher.decrypt(&nonce, ciphertext)?.to_vec())
    }
}
```

### Security Headers & Policies

#### Content Security Policy
```typescript
// frontend/src/pages/_document.tsx
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval';
            style-src 'self' 'unsafe-inline';
            img-src 'self' data: blob:;
            font-src 'self';
            connect-src 'self' ws:;
            frame-ancestors 'none';
            base-uri 'self';
            form-action 'self';
          `.replace(/\s+/g, ' ').trim()}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Event Bus System

### Architecture Overview

RPMA v2 implements a publish-subscribe event bus for real-time updates and loose coupling:

```rust
// src-tauri/src/sync/event_bus.rs
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::broadcast;

pub enum EventBusEvent {
    TaskCreated(Task),
    TaskUpdated { id: String, changes: Partial<Task> },
    TaskDeleted(String),
    InterventionStarted(Intervention),
    InterventionAdvanced { 
        intervention_id: String, 
        step_number: u32, 
        step_data: Value 
    },
    InterventionCompleted(Intervention),
    MaterialUpdated(Material),
    CalendarEventUpdated(CalendarEvent),
    UserSessionExpired(String),
    SyncStatusChanged(SyncStatus),
}

pub type EventHandler = Box<dyn Fn(EventBusEvent) + Send + Sync>;

pub struct EventBus {
    subscribers: Arc<RwLock<HashMap<String, Vec<EventHandler>>>>,
    broadcast_channel: broadcast::Sender<EventBusEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        Self {
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            broadcast_channel: tx,
        }
    }
    
    pub fn subscribe<F>(&self, event_type: &str, handler: F)
    where
        F: Fn(EventBusEvent) + Send + Sync + 'static,
    {
        let mut subscribers = self.subscribers.write();
        subscribers
            .entry(event_type.to_string())
            .or_insert_with(Vec::new)
            .push(Box::new(handler));
    }
    
    pub fn publish(&self, event: EventBusEvent) {
        // Store event for audit
        self.audit_event(&event);
        
        // Notify subscribers
        let event_type = self.get_event_type(&event);
        if let Some(handlers) = self.subscribers.read().get(&event_type) {
            for handler in handlers {
                handler(event.clone());
            }
        }
        
        // Broadcast via WebSocket
        let _ = self.broadcast_channel.send(event);
    }
    
    fn get_event_type(&self, event: &EventBusEvent) -> String {
        match event {
            EventBusEvent::TaskCreated(_) => "task.created".to_string(),
            EventBusEvent::TaskUpdated { .. } => "task.updated".to_string(),
            EventBusEvent::InterventionStarted(_) => "intervention.started".to_string(),
            EventBusEvent::MaterialUpdated(_) => "material.updated".to_string(),
            // ... more events
        }
    }
}
```

### WebSocket Integration

```rust
// src-tauri/src/sync/websocket.rs
use tokio::sync::broadcast;
use warp::ws::{Message, WebSocket};

pub struct WebSocketManager {
    subscribers: Arc<RwLock<HashMap<String, Vec<WebSocket>>>>,
    event_rx: broadcast::Receiver<EventBusEvent>,
}

impl WebSocketManager {
    pub async fn handle_connection(
        &self,
        ws: WebSocket,
        user_id: String,
    ) {
        let (ws_tx, ws_rx) = ws.split();
        let event_rx = self.event_rx.resubscribe();
        
        // Subscribe to WebSocket manager
        {
            let mut subscribers = self.subscribers.write();
            subscribers
                .entry(user_id.clone())
                .or_insert_with(Vec::new)
                .push(ws_tx.clone());
        }
        
        // Forward events to WebSocket
        tokio::spawn(async move {
            while let Ok(event) = event_rx.recv().await {
                if self.should_send_to_user(&event, &user_id) {
                    let message = serde_json::to_string(&event).unwrap();
                    let _ = ws_tx.send(Message::text(message)).await;
                }
            }
        });
        
        // Handle WebSocket messages
        while let Some(msg) = ws_rx.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(cmd) = serde_json::from_str::<ClientCommand>(&text) {
                        self.handle_client_command(cmd, &user_id).await;
                    }
                }
                Ok(Message::Close(_)) => break,
                Err(e) => {
                    eprintln!("WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }
        
        // Cleanup on disconnect
        self.remove_subscriber(&user_id, &ws_tx);
    }
    
    fn should_send_to_user(&self, event: &EventBusEvent, user_id: &str) -> bool {
        match event {
            EventBusEvent::TaskUpdated { id, .. } => {
                // Check if user has access to this task
                self.user_has_task_access(user_id, id)
            }
            EventBusEvent::InterventionAdvanced { intervention_id, .. } => {
                // Check if user is assigned to this intervention
                self.user_has_intervention_access(user_id, intervention_id)
            }
            _ => true, // Send all other events
        }
    }
}
```

### Frontend Event Handling

```typescript
// frontend/src/hooks/useEventBus.ts
import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

type EventHandler = (event: EventBusEvent) => void;

export const useEventBus = (eventType: string, handler: EventHandler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  
  useEffect(() => {
    // Subscribe to WebSocket events
    const unsubscribe = invoke('subscribe_to_events', {
      eventType,
    }).then((unsubFn) => unsubFn as () => void);
    
    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [eventType]);
};

// Usage in components
const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEventBus('task.updated', (event) => {
    if (event.type === 'task.updated') {
      setTasks(prev => 
        prev.map(t => 
          t.id === event.data.id 
            ? { ...t, ...event.data.changes }
            : t
        )
      );
    }
  });
  
  useEventBus('task.created', (event) => {
    if (event.type === 'task.created') {
      setTasks(prev => [...prev, event.data]);
    }
  });
  
  // ... rest of component
};
```

## Real-Time Features

### Live Updates
- Task status changes
- Intervention progress updates
- Material stock level alerts
- Calendar event changes
- System notifications

### Conflict Resolution
```rust
// src-tauri/src/services/conflict_resolution.rs
pub struct ConflictResolver;

impl ConflictResolver {
    pub async fn resolve_task_update_conflict(
        &self,
        local_task: Task,
        remote_task: Task,
    ) -> Result<Task> {
        // Use last-write-wins with field-level merging
        Ok(Task {
            id: local_task.id,
            title: if remote_task.updated_at > local_task.updated_at {
                remote_task.title
            } else {
                local_task.title
            },
            // Merge other fields intelligently
            ..local_task
        })
    }
}
```

### Performance Monitoring
```rust
// src-tauri/src/services/performance_monitor.rs
pub struct PerformanceMonitor {
    metrics: Arc<RwLock<PerformanceMetrics>>,
}

#[derive(Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: u64,
    pub database_queries: u64,
    pub avg_response_time: f64,
    pub active_connections: u32,
}

impl PerformanceMonitor {
    pub async fn collect_metrics(&self) -> PerformanceMetrics {
        // System metrics
        let cpu_usage = self.get_cpu_usage().await;
        let memory_usage = self.get_memory_usage().await;
        
        // Database metrics
        let db_metrics = self.collect_database_metrics().await;
        
        // WebSocket metrics
        let ws_metrics = self.collect_websocket_metrics().await;
        
        PerformanceMetrics {
            cpu_usage,
            memory_usage,
            database_queries: db_metrics.queries_per_second,
            avg_response_time: db_metrics.avg_response_time,
            active_connections: ws_metrics.active_connections,
        }
    }
}
```

---

**Document Version**: 2.0
**Last Updated**: Based on comprehensive codebase analysis
