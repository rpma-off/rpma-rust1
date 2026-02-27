# Architecture Documentation - RPMA v2

## Overview

RPMA v2 follows a **Domain-Driven Design (DDD)** architecture with a **4-layer backend structure** and **20 frontend domains**. The application is built as an offline-first desktop app using Next.js 14 for the frontend and Rust/Tauri for the backend, with SQLite as the local database.

**Architecture Style:** Domain-Driven Design (DDD)
**Frontend:** Next.js 14, React 18, TypeScript
**Backend:** Rust, Tauri
**Database:** SQLite with WAL mode
**Communication:** Tauri IPC

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                      App Router Pages                          │     │
│  │  (34 routes: tasks, clients, interventions, quotes, etc.)     │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                      Domains (20)                             │     │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┤       │
│  │   Auth   │   Tasks  │ Clients  │Inv.     │   ...   │       │
│  │          │          │          │Workflow  │          │       │
│  │──────────│──────────│──────────│──────────│──────────│       │
│  │ • API    │ • API    │ • API    │ • API    │ • API    │       │
│  │ • Hooks  │ • Hooks  │ • Hooks  │ • Hooks  │ • Hooks  │       │
│  │ • Comps  │ • Comps  │ • Comps  │ • Comps  │ • Comps  │       │
│  │ • IPC    │ • IPC    │ • IPC    │ • IPC    │ • IPC    │       │
│  │ • Svcs   │ • Svcs   │ • Svcs   │ • Svcs   │ • Svcs   │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                      IPC Client Layer                          │     │
│  │  • safeInvoke (error handling)                               │     │
│  │  • cachedInvoke (TTL caching)                                │     │
│  │  • invalidatePattern (cache invalidation)                        │     │
│  │  • RBAC permission checks                                     │     │
│  │  • Input sanitization                                         │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                       │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                │ Tauri.invoke()
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (Rust)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                      Commands (14)                              │     │
│  │  • system, performance, ui, navigation, log, websocket         │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                      Domains (15)                              │     │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┤       │
│  │   Auth   │   Tasks  │ Clients  │Inv.     │   ...   │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                    Domain Layer Structure                        │     │
│  │  ┌────────┐  ┌─────────────┐  ┌──────────┐  ┌──────┐ │     │
│  │  │ Facade │──▶│Application │──▶│  Domain  │──▶│Infra │ │     │
│  │  │        │  │  (Contracts)│  │ (Models) │  │ (SQL) │ │     │
│  │  └────────┘  └─────────────┘  └──────────┘  └──────┘ │     │
│  │       │              │               │             │          │     │
│  │       │              │               │             ▼          │     │
│  │       │              │               │     ┌─────────────┐     │     │
│  │       │              │               │     │Repository   │     │     │
│  │       │              │               │     │  Layer      │     │     │
│  │       │              │               │     └─────────────┘     │     │
│  │       │              │               │             │          │     │
│  │       ▼              ▼               ▼             │          │     │
│  │  ┌───────────────────────────────────────┐      │          │     │
│  │  │        Event Bus (Cross-Domain)      │      │          │     │
│  │  └───────────────────────────────────────┘      │          │     │
│  │                                                 │          │     │
│  ▼                                                 ▼          ▼     │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │                    Database (SQLite)                       │        │
│  │                 35 Tables, 200+ Indexes                   │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── app/                    # Next.js App Router (34 routes)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── login/               # Authentication
│   ├── tasks/               # Task management
│   ├── clients/             # Client management
│   ├── interventions/        # PPF interventions
│   ├── inventory/           # Inventory
│   ├── quotes/              # Quotes
│   ├── calendar/            # Calendar
│   ├── reports/             # Reports
│   ├── analytics/           # Analytics
│   ├── settings/            # Settings
│   ├── users/               # User management
│   └── ...
│
├── components/              # Shared React components
│   ├── ui/                 # shadcn/ui components (63+)
│   ├── forms/              # Form components
│   ├── layout/             # Layout components
│   └── navigation/        # Navigation components
│
├── domains/                # 20 Domain-Driven bounded contexts
│   ├── auth/
│   │   ├── api/           # Public API surface
│   │   ├── components/    # Auth-specific components
│   │   ├── hooks/         # Auth hooks (useAuth)
│   │   ├── ipc/           # IPC wrappers
│   │   ├── services/      # Business logic
│   │   └── types.ts       # Auth types
│   ├── tasks/
│   │   ├── api/
│   │   ├── components/    # Task components
│   │   ├── hooks/         # useTasks, useTaskActions
│   │   ├── ipc/           # taskIpc
│   │   └── services/      # taskService
│   └── ...
│
├── hooks/                  # Shared custom hooks (5)
│   ├── useAutoSave.ts
│   ├── useEntityCounts.ts
│   └── ...
│
├── lib/                    # Core libraries
│   ├── ipc/               # IPC client layer
│   │   ├── index.ts       # Main export
│   │   ├── secure-client.ts
│   │   ├── commands.ts    # Command registry (200+)
│   │   ├── cache.ts       # Cache layer
│   │   └── core/         # Core utilities
│   ├── backend/           # Auto-generated types
│   ├── validation/        # Type guards
│   ├── query-keys.ts      # React Query keys
│   └── tauri.ts          # Tauri services
│
├── shared/                 # Shared utilities
│   ├── ui/                # UI primitives
│   ├── hooks/             # Shared hooks (19)
│   └── utils/             # Utilities
│
├── types/                  # Auto-generated from Rust
│   ├── index.ts
│   ├── task.types.ts
│   ├── client.types.ts
│   └── ...
│
└── constants/              # Application constants
```

### Domain Pattern (Frontend)

Each domain follows this consistent pattern:

```
domains/[domain]/
├── api/
│   └── index.ts              # Public API exports
├── components/               # Domain-specific React components
├── hooks/                   # Domain-specific custom hooks
├── ipc/
│   └── [domain].ipc.ts      # IPC command wrappers
├── services/                # Frontend business logic
├── types.ts                 # Domain types
└── index.ts                 # Re-exports from api/
```

**Example - Tasks Domain API:**

```typescript
// domains/tasks/api/index.ts
export { TaskProvider, useTasks, useTaskActions } from '../hooks';
export { taskService, taskApiService } from '../services';
export {
  TaskList,
  TaskDetails,
  TaskForm,
  TaskTimeline
} from '../components';
export { taskIpc } from '../ipc/task.ipc';
export type { Task, TaskStatus, TaskFilters } from '../types';
```

### Component Hierarchy

```
App
├── RootLayout
│   ├── Providers (QueryClient, Auth, Theme)
│   ├── RPMALayout
│   │   ├── Topbar
│   │   │   ├── Search
│   │   │   ├── Notifications
│   │   │   └── UserMenu
│   │   └── DrawerSidebar
│   │       ├── Navigation Links
│   │       └── Domain-specific Items
│   └── Page Content
│       └── Domain Components
```

### State Management

```
┌─────────────────────────────────────────────────────────┐
│                    State Management                     │
├─────────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │  Server State    │    │  Client State   │       │
│  │  React Query     │    │  Zustand        │       │
│  │  @tanstack      │    │  (UI state)     │       │
│  └──────────────────┘    └──────────────────┘       │
│         │                       │                     │
│         ▼                       ▼                     │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │  React Context  │    │  Form State     │       │
│  │  (Auth, Theme)  │    │  React Hook     │       │
│  │                 │    │  Form           │       │
│  └──────────────────┘    └──────────────────┘       │
└───────────────────────────────────────────────────────────┘
```

**React Query** (Server State):
- Cache with 1-minute stale time
- Automatic refetching
- Optimistic updates
- Query key factories

**Zustand** (Client State):
- Layout state (sidebar open/closed)
- UI preferences
- Temporary state

**React Context** (Shared State):
- AuthProvider (user, session)
- ThemeProvider (theme)

**React Hook Form** (Form State):
- Form validation
- Field state
- Submission handling

---

## Backend Architecture

### Directory Structure

```
src-tauri/src/
├── main.rs                 # Tauri entry point
├── lib.rs                  # Library root
│
├── commands/               # Cross-cutting IPC commands (14)
│   ├── system.rs
│   ├── performance.rs
│   ├── ui.rs
│   ├── navigation.rs
│   ├── log.rs
│   ├── websocket.rs
│   └── ...
│
├── domains/                # 15 Bounded Contexts (DDD)
│   ├── auth/
│   │   ├── facade.rs              # Public API
│   │   ├── application/
│   │   │   └── contracts.rs      # Request/Response types
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   │   ├── user.rs
│   │   │   │   ├── session.rs
│   │   │   │   └── ...
│   │   │   └── value_objects/      # Value objects
│   │   ├── infrastructure/
│   │   │   ├── user_repository.rs
│   │   │   ├── session_repository.rs
│   │   │   ├── auth_service.rs
│   │   │   └── ...
│   │   ├── ipc/
│   │   │   └── auth.rs              # Tauri commands
│   │   └── tests/
│   │       ├── unit_auth.rs
│   │       ├── integration_auth.rs
│   │       ├── permission_auth.rs
│   │       └── validation_auth.rs
│   ├── tasks/
│   ├── clients/
│   ├── interventions/
│   └── ...
│
├── db/                     # Database layer
│   ├── connection.rs         # Connection pool
│   ├── migrations.rs        # Migration runner
│   ├── queries.rs          # Query utilities
│   ├── schema.sql          # Initial schema
│   └── mod.rs
│
├── shared/                 # Shared utilities
│   ├── repositories/        # Repository base trait
│   │   ├── base.rs
│   │   └── factory.rs
│   ├── services/           # Shared services
│   ├── errors/            # Error types
│   └── utils/             # Utilities
│
├── service_builder.rs       # Dependency injection
├── ipc_serialization.rs    # IPC serialization
└── worker_pool.rs          # Thread pool
```

### 4-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    IPC Layer (Entry Point)                 │
│                      Tauri Command Handlers                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Facade Layer (Public API)               │
│              • Input validation                           │
│              • Error mapping                             │
│              • Business rule enforcement                   │
│              • Permission checks                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                Application Layer (Use Cases)               │
│              • Domain services orchestration               │
│              • DTOs / Request/Response contracts          │
│              • Workflow orchestration                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  Domain Layer (Core Business)              │
│              • Domain entities (models)                    │
│              • Value objects                             │
│              • Domain services                           │
│              • Business rules                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Infrastructure Layer (Data Access)            │
│              • Repositories (SQL)                         │
│              • External adapters                           │
│              • Database queries                            │
│              • Data mapping                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   Database (SQLite)                        │
│              35 Tables, 200+ Indexes                     │
└──────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Visibility |
|--------|---------------|------------|
| **IPC** | Tauri command entry points, correlation IDs | `pub(crate)` |
| **Facade** | Domain public API, validation, error mapping | `pub(crate)` |
| **Application** | Use cases, DTOs, workflow orchestration | `pub(crate)` |
| **Domain** | Core business entities, value objects, enums | `pub` |
| **Infrastructure** | Repositories, services, SQL, adapters | `pub(crate)` |
| **Tests** | Unit, integration, permission, validation | `#[cfg(test)]` |

### Cross-Domain Rules

**STRICT: No cross-domain imports** (except via public API)

✅ **Allowed:**
```rust
// Use domain's public API through facade
let tasks_facade = TasksFacade::new(db.clone(), cache.clone());
let response = tasks_facade.evaluate_assignment_eligibility(task, user_id)?;
```

❌ **Forbidden:**
```rust
// Direct access to another domain's internals
use crate::domains::clients::infrastructure::client::ClientService;
```

### Event Bus Pattern

Cross-domain communication via event bus (no direct imports):

```
┌──────────────┐
│   Auth       │
│   Domain    │
└──────┬───────┘
       │
       │ emits: AuthenticationSuccess
       │
       ▼
┌──────────────────────────────────┐
│       Event Bus               │
│  • Event Registry             │
│  • Handler Registration      │
│  • Event Dispatch           │
└──────────────────────────────────┘
       │
       │ distributes events
       │
       ▼
┌──────────────┐    ┌──────────────┐
│   Tasks      │    │   Audit      │
│   Domain    │    │   Domain    │
└──────┬───────┘    └──────┬───────┘
       │                    │
       │ handles:           │ handles:
       │ TaskCreated        │ AuditLogCreated
       └───────────────────┘
```

**Supported Event Types:**
- `TaskCreated`, `TaskUpdated`, `TaskDeleted`
- `InterventionStarted`, `InterventionFinalized`
- `AuthenticationSuccess`, `SessionCreated`
- `ClientCreated`, `ClientUpdated`
- `InventoryConsumed`, `StockAdjusted`
- `QuoteCreated`, `QuoteAccepted`
- `UserCreated`, `UserUpdated`

---

## Data Flow

### Request Flow (Frontend → Backend)

```
┌──────────────┐
│ React        │
│ Component   │
└──────┬───────┘
       │
       │ user action
       ▼
┌──────────────┐
│ Domain Hook │
│ (useTasks)  │
└──────┬───────┘
       │
       │ invoke
       ▼
┌──────────────┐
│ IPC Wrapper │
│ (taskIpc)   │
└──────┬───────┘
       │
       │ safeInvoke()
       ▼
┌──────────────┐
│ IPC Client  │
│ Layer       │
└──────┬───────┘
       │
       │ permission check
       │ input sanitization
       ▼
┌──────────────┐
│ Tauri IPC   │
│ Bridge      │
└──────┬───────┘
       │
       │ serialize
       ▼
┌──────────────┐
│ IPC Command │
│ Handler     │
└──────┬───────┘
       │
       │ authenticate!
       ▼
┌──────────────┐
│ Facade      │
└──────┬───────┘
       │
       │ validate
       │ map errors
       ▼
┌──────────────┐
│ Service     │
└──────┬───────┘
       │
       │ business logic
       ▼
┌──────────────┐
│ Repository  │
└──────┬───────┘
       │
       │ SQL query
       ▼
┌──────────────┐
│ SQLite      │
│ Database    │
└──────────────┘
```

### Response Flow (Backend → Frontend)

```
┌──────────────┐
│ SQLite      │
│ Database    │
└──────┬───────┘
       │
       │ result
       ▼
┌──────────────┐
│ Repository  │
└──────┬───────┘
       │
       │ domain entity
       ▼
┌──────────────┐
│ Service     │
└──────┬───────┘
       │
       │ result
       ▼
┌──────────────┐
│ Facade      │
└──────┬───────┘
       │
       │ ApiResponse<T>
       ▼
┌──────────────┐
│ IPC Command │
│ Handler     │
└──────┬───────┘
       │
       │ compress (if >1KB)
       ▼
┌──────────────┐
│ Tauri IPC   │
│ Bridge      │
└──────┬───────┘
       │
       │ deserialize
       ▼
┌──────────────┐
│ IPC Client  │
│ Layer       │
└──────┬───────┘
       │
       │ extractAndValidate()
       ▼
┌──────────────┐
│ Domain Hook │
│ (useTasks)  │
└──────┬───────┘
       │
       │ React Query cache
       ▼
┌──────────────┐
│ React       │
│ Component   │
└──────────────┘
```

---

## Dependency Injection

### Service Builder Pattern

```rust
// src-tauri/src/service_builder.rs
pub struct ServiceBuilder {
    db: Arc<Database>,
    cache: Arc<Cache>,
    event_bus: Arc<EventBus>,
}

impl ServiceBuilder {
    pub fn new(db: Arc<Database>) -> Self {
        let cache = Arc::new(Cache::new(10000, 300));
        let event_bus = Arc::new(EventBus::new());
        Self { db, cache, event_bus }
    }

    pub fn build(self) -> Result<AppStateType, Box<dyn Error>> {
        // Initialize services in dependency order
        let auth_facade = AuthFacade::new(self.db.clone(), self.cache.clone())?;
        let task_facade = TaskFacade::new(self.db.clone(), self.cache.clone())?;
        let client_facade = ClientFacade::new(self.db.clone(), self.cache.clone())?;
        let intervention_facade = InterventionFacade::new(
            self.db.clone(),
            self.cache.clone(),
            self.event_bus.clone()
        )?;
        // ... 15+ facades

        // Register event handlers
        self.event_bus.register_handler(auth_facade.session_created_handler());
        self.event_bus.register_handler(intervention_facade.finalized_handler());
        // ... more handlers

        Ok(AppStateType {
            auth_facade,
            task_facade,
            client_facade,
            intervention_facade,
            // ... all facades
            event_bus: self.event_bus,
        })
    }
}
```

---

## Architectural Patterns

### 1. Facade Pattern

Each domain exposes a facade that:
- Provides clean public API
- Validates inputs
- Maps domain errors to AppError
- Enforces business rules

```rust
pub struct TasksFacade {
    task_service: Arc<TaskService>,
    cache: Arc<Cache>,
}

impl TasksFacade {
    /// Public API - validation and error mapping
    pub fn parse_status(&self, status: &str) -> Result<TaskStatus, AppError> {
        TaskStatus::from_str(status)
            .ok_or_else(|| AppError::Validation(format!("Invalid task status: {}", status)))
    }

    pub fn evaluate_assignment_eligibility(
        &self, task: &Task, user_id: &str, max_tasks_per_user: usize
    ) -> Result<AssignmentCheckResponse, AppError> {
        // Business rules enforcement
        let user_tasks = self.task_service.count_active_tasks(user_id)?;
        if user_tasks >= max_tasks_per_user {
            return Ok(AssignmentCheckResponse {
                task_id: task.id.clone(),
                user_id: user_id.to_string(),
                status: AssignmentStatus::Ineligible,
                reason: Some(format!("User has {} active tasks (max: {})", user_tasks, max_tasks_per_user)),
            });
        }
        // ... more checks
    }
}
```

### 2. Repository Pattern

All data access goes through repositories:

```rust
#[async_trait]
pub trait Repository<T: Send, ID: Send + Sync + Clone + 'static> {
    async fn find_by_id(&self, id: ID) -> RepoResult<Option<T>>;
    async fn find_all(&self) -> RepoResult<Vec<T>>;
    async fn save(&self, entity: T) -> RepoResult<T>;
    async fn delete_by_id(&self, id: ID) -> RepoResult<bool>;
    async fn exists_by_id(&self, id: ID) -> RepoResult<bool>;
}

pub struct TaskRepository {
    db: Arc<Database>,
}

impl TaskRepository {
    pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
        let (sql, params) = self.build_task_query_sql(&query);
        let tasks = self.db.query_as(&sql, rusqlite::params_from_iter(params))?;
        // ... pagination logic
    }
}
```

### 3. Strategy Pattern

Used for workflows (interventions):

```rust
trait WorkflowStrategy: Send + Sync {
    fn strategy_name(&self) -> &'static str;
    fn get_workflow_steps(&self, context: &WorkflowContext) -> Vec<WorkflowStepConfig>;
    fn validate_conditions(&self, context: &WorkflowContext) -> Result<(), Vec<String>>;
}

pub struct PPFWorkflowStrategy;

impl WorkflowStrategy for PPFWorkflowStrategy {
    fn strategy_name(&self) -> &'static str {
        "PPF Intervention"
    }

    fn get_workflow_steps(&self, _context: &WorkflowContext) -> Vec<WorkflowStepConfig> {
        vec![
            WorkflowStepConfig {
                step_number: 1,
                name: "Inspection".to_string(),
                estimated_duration: 720, // 12 minutes
                required_photos: 4,
                // ...
            },
            // ... 4 steps
        ]
    }
}
```

### 4. Event-Driven Architecture

- In-memory event bus for cross-domain communication
- Handlers registered per event type
- Supports async event processing

```rust
pub trait DomainEventHandler: Send + Sync {
    fn event_types(&self) -> Vec<String>;
    async fn handle(&self, event: DomainEvent) -> Result<(), AppError>;
}

// In intervention domain
pub struct InterventionFinalizedHandler {
    service: Arc<InterventionService>,
}

impl DomainEventHandler for InterventionFinalizedHandler {
    fn event_types(&self) -> vec!["InterventionFinalized".to_string()];

    async fn handle(&self, event: DomainEvent) -> Result<(), AppError> {
        if let DomainEvent::InterventionFinalized(data) = event {
            // Trigger inventory consumption calculation
            self.service.calculate_material_consumption(&data.intervention_id).await?;
            // Send notification
            // Update client statistics
        }
        Ok(())
    }
}
```

---

## Module Boundaries

### Cross-Domain Access Rules

```
┌────────────────────────────────────────────────────────────┐
│                     Bounded Context                       │
│                     (e.g., Tasks)                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────┐         │
│  │              Public API Surface               │         │
│  │              (facade.rs)                     │         │
│  │                                              │         │
│  │  ✅ Other domains can import from here      │         │
│  │                                              │         │
│  └────────────────────────────────────────────────┘         │
│                                                            │
│  ┌────────────────────────────────────────────────┐         │
│  │              Internal Modules                │         │
│  │              (application, domain,           │         │
│  │               infrastructure)                 │         │
│  │                                              │         │
│  │  ❌ Cross-domain imports FORBIDDEN       │         │
│  │                                              │         │
│  └────────────────────────────────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Validation

Architecture boundaries are validated via script:

```bash
npm run validate:bounded-contexts
```

**Validates:**
- No cross-domain imports (except public API)
- Each domain has proper facade
- Public API is properly exported
- Domain isolation is maintained

---

## Communication Patterns

### Frontend ↔ Backend (IPC)

**Synchronous:**
- Most commands use `invoke()` (awaited)
- Response returned with correlation ID

**Asynchronous:**
- Background operations (sync, reports) use job queues
- Polling or WebSocket for updates

**Streaming:**
- Large datasets use chunked streaming
- Supports real-time progress updates

### Backend ↔ Database (SQL)

**Direct Queries:**
- Prepared statements for security
- Transactions for multi-step operations

**Query Builder:**
- Dynamic query construction
- Type-safe parameter binding

**Optimizations:**
- Connection pooling
- Statement caching
- WAL mode for concurrency

---

## Performance Optimization

### Frontend

1. **React Query Caching:**
   - 1-minute stale time
   - Automatic cache invalidation
   - Optimistic updates

2. **Code Splitting:**
   - Dynamic imports
   - Route-based chunks
   - Vendor chunking

3. **Virtual Scrolling:**
   - Large lists use react-virtual
   - Reduces DOM nodes

4. **Image Optimization:**
   - Next.js Image component
   - Lazy loading
   - WebP support

### Backend

1. **Connection Pooling:**
   - Max: 10 connections
   - Min idle: 2 connections
   - Dynamic scaling

2. **Query Optimization:**
   - 200+ indexes
   - Composite indexes for common queries
   - Partial indexes for filtered queries

3. **Caching:**
   - In-memory cache (TTL-based)
   - Cache invalidation on mutations
   - Cache statistics tracking

4. **Async Processing:**
   - tokio runtime
   - Thread pool for blocking operations
   - Non-blocking I/O

---

## Security Architecture

### Authentication

```
┌──────────────┐
│  Login      │
│  Request    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Verify    │
│  Password  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Generate   │
│  JWT Token  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Create     │
│  Session    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Return     │
│  Token +    │
│  User Data  │
└──────────────┘
```

### Authorization

```
┌──────────────┐
│  Protected │
│  Command   │
└──────┬───────┘
       │
       │ authenticate!()
       │
       ▼
┌──────────────┐
│  Validate   │
│  Session    │
└──────┬───────┘
       │
       │ extract user_id, role
       ▼
┌──────────────┐
│  Check      │
│  RBAC       │
└──────┬───────┘
       │
       │ withPermissionCheck!()
       ▼
┌──────────────┐
│  Execute    │
│  Command    │
└──────────────┘
```

### Input Sanitization

```
┌──────────────┐
│  Raw Input │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Validate   │
│  (Zod)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Sanitize   │
│  (Backend)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Safe Input │
└──────────────┘
```

---

## Testing Strategy

### Frontend Testing

```
┌─────────────────────────────────────────────────┐
│           Frontend Testing                   │
├─────────────────────────────────────────────────┤
│                                           │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  Unit Tests │  │ Component   │     │
│  │  (Jest)    │  │  Tests      │     │
│  │             │  │  (Jest)    │     │
│  └──────────────┘  └──────────────┘     │
│         │                 │               │
│         └────────┬────────┘               │
│                  ▼                       │
│         ┌──────────────┐                │
│         │ Integration  │                │
│         │   Tests     │                │
│         └──────────────┘                │
│                  │                       │
│                  ▼                       │
│         ┌──────────────┐                │
│         │   E2E Tests │                │
│         │ (Playwright) │                │
│         └──────────────┘                │
└───────────────────────────────────────────┘
```

**Coverage Target:** 70%

### Backend Testing

```
┌─────────────────────────────────────────────────┐
│           Backend Testing                    │
├─────────────────────────────────────────────────┤
│                                           │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  Unit Tests │  │ Integration  │     │
│  │  (Cargo)    │  │   Tests     │     │
│  │             │  │             │     │
│  └──────────────┘  └──────────────┘     │
│         │                 │               │
│         └────────┬────────┘               │
│                  ▼                       │
│         ┌──────────────┐                │
│         │ Permission   │                │
│         │    Tests     │                │
│         └──────────────┘                │
│                  │                       │
│                  ▼                       │
│         ┌──────────────┐                │
│         │  Validation  │                │
│         │    Tests     │                │
│         └──────────────┘                │
└───────────────────────────────────────────┘
```

**Test Categories per Domain:**
1. Unit Tests - Individual functions/models
2. Integration Tests - Service + repository integration
3. Permission Tests - RBAC enforcement
4. Validation Tests - Input validation

---

## Summary

**Key Architectural Principles:**

1. **Domain-Driven Design** - 15 bounded contexts, clear boundaries
2. **4-Layer Architecture** - IPC → Facade → Application → Domain → Infrastructure
3. **Clean Separation** - Frontend ↔ Backend via IPC only
4. **Event-Driven** - Cross-domain communication via event bus
5. **Type Safety** - TypeScript + Rust with auto-generation
6. **Offline-First** - Local database with sync queue
7. **Security First** - RBAC, input sanitization, audit logging

**Statistics:**
- **Frontend Domains:** 20
- **Backend Bounded Contexts:** 15
- **IPC Commands:** 200+
- **Database Tables:** 35
- **Migrations:** 48 (current: 42)

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
