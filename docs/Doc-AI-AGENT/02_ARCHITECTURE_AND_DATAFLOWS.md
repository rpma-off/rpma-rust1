# RPMA v2 Architecture and Dataflows

## Layered Architecture Overview

RPMA v2 follows a clean 4-layer architecture that ensures separation of concerns and maintainability:

```
┌─────────────────────────────────────┐
│   Frontend (Next.js/React)         │  ← UI State, User Interactions
├─────────────────────────────────────┤
│   IPC Layer (Tauri)                │  ← Communication Bridge, Type Safety
├─────────────────────────────────────┤
│   Services (Rust)                  │  ← Business Logic, Validation
├─────────────────────────────────────┤
│   Repositories (Rust)               │  ← Data Access, Query Building
├─────────────────────────────────────┤
│   Database (SQLite)                 │  ← Persistence, ACID Properties
└─────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure
```
frontend/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root server component
│   ├── RootClientLayout.tsx # Client wrapper with auth
│   ├── (dashboard)/       # Route groups
│   └── [feature]/         # Feature directories
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── [domain]/         # Domain-specific components
├── lib/                  # Utilities and clients
│   └── ipc/              # IPC client implementation
└── types/                # TypeScript definitions
```

### State Management Patterns
- **Local State**: React hooks (`useState`, `useReducer`) for component state
- **Global State**: React Context for authentication and Zustand for application state
- **Server State**: TanStack Query for caching and synchronization
- **Form State**: Controlled components with validation using react-hook-form

## Backend Architecture

### Service Organization
```
src-tauri/src/
├── main.rs               # Application entry point
├── commands/             # IPC command handlers
│   ├── auth.rs          # Authentication commands
│   ├── task.rs          # Task management
│   ├── intervention.rs  # Intervention workflows
│   └── [domain].rs      # Other domain commands
├── services/            # Business logic
│   ├── auth.rs          # Authentication service
│   ├── task.rs          # Task business logic
│   └── [domain].rs      # Other domain services
├── repositories/        # Data access layer
│   ├── task_repository.rs
│   └── [domain]_repository.rs
├── models/              # Domain entities
│   ├── task.rs          # Task entity
│   └── [domain].rs      # Other entities
└── db/                  # Database management
    ├── mod.rs           # Connection pool
    └── migrations.rs    # Migration system
```

### Service Initialization Pattern
```rust
// src-tauri/src/main.rs - ServiceBuilder pattern
App::new()
    .setup(|app| {
        let app_state = ServiceBuilder::new()
            .with_database(&app)?
            .with_auth_service()
            .with_task_service()
            .with_intervention_service()
            .with_inventory_service()
            .build();
        
        Ok(app_state)
    })
```

## Core Dataflows

### 1. Task Creation Flow
```
┌───────────────────┐    ┌──────────────┐    ┌──────────────┐
│ Frontend UI       │    │ IPC Layer    │    │ Rust Backend │
├───────────────────┤    ├──────────────┤    ├──────────────┤
│ 1. User fills     │───▶│ 2. Validate  │───▶│ 3. Create    │
│    task form      │    │    request   │    │    task      │
│ 5. Update UI      │◀───│ 6. Return    │◀───│ 4. Store in  │
│    with new ID    │    │    response  │    │    database  │
└───────────────────┘    └──────────────┘    └──────────────┘
```

**Implementation Details:**
- Frontend: `frontend/src/lib/ipc/domains/tasks.ts`
- IPC Command: `src-tauri/src/commands/task.rs`
- Service: `src-tauri/src/services/task.rs`
- Repository: `src-tauri/src/repositories/task_repository.rs`

### 2. Intervention Workflow Execution
```
┌────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend UI        │    │ IPC Layer       │    │ Rust Backend    │
├────────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 1. Start workflow  │───▶│ 2. Validate     │───▶│ 3. Create       │
│    from task       │    │    task state   │    │    intervention │
│ 4. Load step UI    │◀───│ 5. Return       │◀───│ 6. Initialize   │
│ 7. Complete step   │───▶│ 8. Validate     │───▶│    steps        │
│    with photos     │    │    step data    │    │ 9. Store       │
│ 10. Load next      │◀───│ 11. Update      │◀───│    progress     │
│    step            │    │    UI state     │    │ 12. Trigger     │
│                   │    │                 │    │    sync queue   │
└────────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Components:**
- Workflow Engine: `src-tauri/src/services/intervention.rs`
- Step Validation: `src-tauri/src/services/intervention.rs`
- Photo Processing: `src-tauri/src/services/photo.rs`
- Sync Queue: `src-tauri/src/sync/mod.rs`

### 3. Calendar Scheduling Updates
```
┌───────────────────┐    ┌──────────────┐    ┌──────────────┐
│ Calendar UI       │    │ IPC Layer    │    │ Rust Backend │
├───────────────────┤    ├──────────────┤    ├──────────────┤
│ 1. Drag task to   │───▶│ 2. Validate  │───▶│ 3. Update    │
│    new date       │    │    date      │    │    task      │
│ 4. Check conflicts│◀───│ 5. Return    │◀───│ 6. Check     │
│ 7. Refresh        │    │    response  │    │    conflicts  │
│    calendar       │    │             │    │ 8. Notify     │
│                   │    │             │    │    assigned   │
│                   │    │             │    │    users      │
└───────────────────┘    └──────────────┘    └──────────────┘
```

## Offline-First Architecture

### Sync Queue Implementation
```
┌───────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│ Local Operation   │    │ Sync Queue          │    │ Remote Server   │
├───────────────────┤    ├─────────────────────┤    ├─────────────────┤
│ 1. Execute CRUD   │───▶│ 2. Queue operation  │───▶│ 3. Apply when   │
│    locally        │    │    with priority    │    │    online       │
│ 4. Get immediate │◀───│ 5. Return local     │◀───│ 6. Handle       │
│    result         │    │    optimistic       │    │    conflicts    │
│                   │    │    response         │    │                 │
│                   │    │ 7. Retry with       │    │                 │
│                   │    │    backoff         │    │                 │
└───────────────────┘    └─────────────────────┘    └─────────────────┘
```

**Implementation Location:** `src-tauri/src/sync/mod.rs`

### Conflict Resolution Strategy
1. **Last Write Wins**: For non-critical fields
2. **Manual Resolution**: For critical business data
3. **Field-Level Merging**: For compatible updates
4. **Version Vectors**: For tracking synchronization state

## Event Bus System

### Internal Events
```
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ Event Source    │    │ Event Bus    │    │ Event Sink   │
├─────────────────┤    ├──────────────┤    ├──────────────┤
│ • Task Created  │───▶│ • Distribute  │───▶│ • UI Update  │
│ • Step Complete │    │ • Filter      │    │ • Sync Queue │
│ • Photo Added   │    │ • Transform   │    │ • Audit Log  │
│ • Status Change │    │ • Persist     │    │ • Notification│
└─────────────────┘    └──────────────┘    └──────────────┘
```

**Implementation:** `src-tauri/src/events/mod.rs`

## Type Synchronization

### Rust-to-TypeScript Flow
```
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ Rust Model      │    │ ts-rs Crate  │    │ Generated    │
├─────────────────┤    ├──────────────┤    ├──────────────┤
│ #[derive(TS)]   │───▶│ Parse Rust   │───▶│ TypeScript   │
│ struct Task {   │    │ models       │    │ interfaces   │
│    id: String,  │    │ Extract types │    │ in backend.ts│
│    title: String│    │ Generate TS   │    │             │
│ }               │    │ interfaces   │    │             │
└─────────────────┘    └──────────────┘    └──────────────┘
```

**Command:** `npm run types:sync`  
**Output:** `frontend/src/lib/backend.ts`

## Error Handling Architecture

### Frontend Error Boundaries
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Component Error  │    │ Error Boundary  │    │ Fallback UI     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 1. Component     │───▶│ 2. Catch error  │───▶│ 3. Show error   │
│    throws        │    │    and log      │    │    screen       │
│                 │    │ 4. Attempt      │    │ 4. Report to    │
│                 │    │    recovery     │    │    error service│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Error Handling
```rust
// Error mapping pattern
match result {
    Ok(data) => Ok(ApiResponse::success(data)),
    Err(DatabaseError::NotFound) => Err(AppError::NotFound("Task not found".to_string())),
    Err(DatabaseError::ConstraintViolation) => Err(AppError::Validation("Invalid data".to_string())),
    Err(err) => Err(AppError::Internal(format!("Database error: {}", err))),
}
```

## Performance Optimizations

### Frontend Optimizations
- **Component Memoization**: React.memo for expensive renders
- **Virtualization**: For long lists (tasks, interventions)
- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Progressive loading and thumbnails

### Backend Optimizations
- **Connection Pooling**: r2d2 for SQLite connections
- **Query Optimization**: Prepared statements and indexed queries
- **Batch Operations**: Bulk inserts/updates for sync
- **Background Tasks**: Async processing for heavy operations

## Security Boundaries

### Frontend Security
- **XSS Prevention**: React's built-in escaping
- **CSRF Protection**: Same-site cookies and token validation
- **Input Validation**: Zod schemas for all user input

### Backend Security
- **Authentication Middleware**: Token validation on protected routes
- **Authorization Checks**: Role-based access control
- **SQL Injection Prevention**: Parameterized queries only
- **Audit Logging**: All sensitive operations logged