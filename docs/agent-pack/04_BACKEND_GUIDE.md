---
title: "Backend Guide"
summary: "Rust development standards, domain patterns, and system architecture."
read_when:
  - "Implementing new backend features"
  - "Writing Rust services or repositories"
  - "Adding new IPC commands"
---

# 04. BACKEND GUIDE

The backend is a **Rust** application managed by **Tauri**, located in `src-tauri/`.

## Architecture: The Four-Layer Rule

Every domain in `src-tauri/src/domains/` MUST follow (**ADR-001**):
`IPC → Application → Domain ← Infrastructure`

### 1. IPC Layer (`ipc/`)
Entry points for Tauri commands.
```rust
#[tauri::command]
pub async fn my_command(state: State<'_, AppState>, correlation_id: Option<String>) -> AppResult<ApiResponse<T>> {
    let ctx = resolve_context!(&state, &correlation_id); // Mandatory!
    let service = MyService::new(&state);
    service.do_something(&ctx).await.map(ApiResponse::success)
}
```

### 2. Application Layer (`application/`)
Coordination and auth enforcement. Use `RequestContext` for all identity decisions (**ADR-006**).

### 3. Domain Layer (`domain/`)
Pure logic. No SQL, no IPC, no frameworks. Entities and business rules only.

### 4. Infrastructure Layer (`infrastructure/`)
Repository implementations (**ADR-005**) using SQLite.

## Error Handling (**ADR-019**)
- Use `AppError` enum for all expected failures.
- `thiserror` for internal errors; `anyhow` ONLY at the IPC boundary if needed.
- No `unwrap()` or `expect()` in production code.

## Security & Auth
- **Centralized Auth**: `resolve_context!` macro handles session validation and RBAC.
- **RequestContext**: flows through the system; raw tokens never leave the IPC layer.

## Database & Persistence
- **Migrations**: Numbered SQL files in `migrations/` (**ADR-010**).
- **WAL Mode**: Enabled by default for performance (**ADR-009**).
- **Repository Pattern**: Abstract data access to keep business logic testable.

## Cross-Domain Coordination
- **Event Bus**: `shared/services/event_bus.rs` for reactive logic (**ADR-016**).
- **Facade**: Domains export a Facade for controlled cross-domain access.

## Coding Standards
- Use **Newtypes** (e.g., `TaskId(String)`) for type safety.
- All IPC types must derive `TS` and `export` for frontend sync.
- Follow `clippy` and `rustfmt` rules.
