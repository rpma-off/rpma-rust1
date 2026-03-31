# 02 — Architecture and Dataflows

## 4-Layer Architecture (ADR-001)

Each bounded context under `src-tauri/src/domains/<domain>/` follows a strict layer hierarchy:

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **IPC** | `domains/*/ipc/` | Thin Tauri command adapters — no business logic |
| **Application** | `domains/*/application/` | Use-case orchestration, validation, event emission |
| **Domain** | `domains/*/domain/` | Pure business models, invariants, errors |
| **Infrastructure** | `domains/*/infrastructure/` | SQL repositories, external adapters |

Rules:
- Each layer may only import the layer **below** it, never above.
- Cross-domain communication goes only through `shared/contracts/` traits (ADR-003).
- Business logic forbidden in IPC or infrastructure layers.

## Service Initialization (`src-tauri/src/service_builder.rs`)

Services are wired in a specific acyclic order (26 steps). Key dependencies:

```
Database + Repositories (roots)
  → TaskService, ClientService
  → EventBus (in-memory)
  → InterventionService, InterventionWorkflowService
  → SettingsService, AuthService, UserService
  → SessionService, SessionStore
  → MaterialService, InventoryFacade
  → QuoteService, MessageService, AuditService
  → EventBus handlers registered (AuditLogHandler, InterventionFinalizedHandler, QuoteAcceptedHandler)
  → TrashService, GlobalSearchService
```

All services exposed as `Arc<T>` fields on `AppStateType` (`shared/app_state.rs`).

## Dataflows

### Task Creation
```
Frontend Component
  → useMutation (TanStack Query)
  → taskIpc.create() [frontend/src/domains/tasks/ipc/task.ipc.ts]
  → safeInvoke("task_create", payload + session_token + correlation_id)
  → Tauri IPC boundary
  → task_create handler [domains/tasks/ipc/task/facade.rs]
    → resolve_context!(&state, &correlation_id, UserRole::Supervisor)
    → TaskCommandService.create_task(&ctx, request)
      → Application layer: validate, build domain model
      → TaskRepository.insert(task) [infrastructure/]
        → SQLite INSERT (WAL)
    → EventBus.publish(TaskCreated { ... })
  → ApiResponse<Task> returned
  → TanStack Query cache invalidated (taskKeys.lists())
```

### Intervention Step Advance
```
Technician UI (advance step button)
  → interventionsIpc.advanceStep() [domains/interventions/ipc/interventions.ipc.ts]
  → safeInvoke("intervention_advance_step", ...)
  → intervention_advance_step handler [domains/interventions/ipc/intervention/facade.rs]
    → resolve_context!(&state, &correlation_id, UserRole::Technician)
    → InterventionService.advance_step(&ctx, step_id)
      → Domain: validate step ordering, update status
      → Repository: persist step status + timestamps
      → EventBus.publish(InterventionStepAdvanced { ... })
  → Tauri emits UI event → TanStack Query invalidates interventionKeys
```

### Calendar Scheduling
```
Calendar UI (drag/reschedule)
  → calendarIpc.scheduleTask() [lib/ipc/calendar.ts]
  → safeInvoke("calendar_schedule_task", { task_id, date })
  → calendar_schedule_task handler [domains/calendar/]
    → resolve_context!(&state, &correlation_id, UserRole::Supervisor)
    → CalendarService.schedule_task()
      → Conflict check → Update task scheduled_date → SQLite UPDATE
```

## Request Context & Auth Flow (`src-tauri/src/shared/context/`)

Every protected command uses:
```rust
let ctx = resolve_context!(&state, &correlation_id);           // any role
let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin); // min role
```

`session_resolver.rs` flow:
1. Retrieve active `UserSession` from `SessionStore` (in-memory `Arc<Mutex<T>>`)
2. Gate: call `has_permission(user_role, required_role)` → 403 if insufficient
3. Build `RequestContext { auth: AuthContext, correlation_id }` — no raw tokens downstream

## Event Bus (`src-tauri/src/shared/event_bus/bus.rs`)

- **Process-global singleton** (`OnceLock<Arc<InMemoryEventBus>>`)
- **Fire-and-forget**: `tokio::spawn` per handler — failures logged, bus never crashes
- **Registered handlers** (registered during service_builder init):
  - `AuditLogHandler` — writes audit entries for sensitive actions
  - `InterventionFinalizedHandler` — triggers inventory deduction on completion
  - `QuoteAcceptedHandler` / `QuoteConvertedHandler` — lifecycle side-effects

```rust
// Publishing (from application layer):
event_bus.publish(DomainEvent::TaskCreated { task_id, ... }).await;

// Subscribing (registered once in service_builder):
event_bus.register_handler(Arc::new(AuditLogHandler::new(audit_service)));
```

## IPC Transport Layer

```
Frontend                          │  Rust Backend
──────────────────────────────────┼──────────────────────────────────
safeInvoke(command, args)         │  #[tauri::command]
  + correlation_id injected       │  async fn command_name(
  + session_token injected        │      request: RequestDTO,
  + timeout 15s                   │      state: AppState<'_>
  + error normalization           │  ) -> Result<ApiResponse<T>, AppError>
  + retry logic                   │
                                  │
frontend/src/lib/ipc/utils.ts     │  domains/*/ipc/facade.rs
```

## Offline-First Architecture

- All writes go to local SQLite (WAL mode) — no blocking on remote calls.
- `synced` flag on records tracks what has been confirmed to any remote service.
- No remote server dependency at runtime; the app functions fully offline.
- `shared/contracts/sync.rs` defines sync-queue types for future remote sync.
