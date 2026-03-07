# Backend Guide

The backend is built in Rust using the Tauri framework. It fully embraces Domain-Driven Design (DDD).

## Directory Structure (`src-tauri/src/`)
- **`main.rs` & `lib.rs`**: Tauri builder initialization, command registration, and plugin setup.
- **`commands/`**: Root IPC handlers spanning cross-domain or system functions (`log.rs`, `websocket.rs`, `system.rs`).
- **`db/`**: Connection pooling (r2d2), configuration (WAL mode), and migration tracking.
- **`domains/`**: The bounded contexts (`tasks`, `users`, `interventions`, etc.).
  - `[domain]/ipc/`: domain-specific IPC commands.
  - `[domain]/application/`: Use cases.
  - `[domain]/domain/`: Entities.
  - `[domain]/infrastructure/`: Repositories and SQL.
- **`shared/`**: Generic structs (`AppError`, helpers).
- **`models/`**: (If present globally) Central location for structs exported via `ts-rs` to TypeScript.

## Implementing a New Feature (End-to-End)
1. **Domain Model**: Create the strict logic in `domains/[domain]/domain/models.rs`.
2. **Infrastructure**: Write the SQL queries in `domains/[domain]/infrastructure/repo.rs`. Use `rusqlite`.
3. **Application Service**: Tie them together in `domains/[domain]/application/service.rs`. Handle authorization checks here.
4. **IPC Command**: Create a thin wrapper function in `domains/[domain]/ipc/commands.rs`. Extract the session token and payload.
   ```rust
   #[tauri::command]
   pub async fn create_foo(state: State<'_, AppState>, token: String, payload: CreateFooPayload) -> Result<Foo, AppError> {
       let service = state.foo_service();
       service.create(token, payload).await
   }
   ```
5. **Registration**: Ensure the new command is registered in `main.rs` inside the `tauri::Builder::default().invoke_handler(...)`.

## Error Handling & Validation
- **Errors**: Return the generic `AppError` enum (defined in `shared/` or `errors.rs`), which implements `serde::Serialize` to map seamlessly to Promise rejections in the frontend.
- **Validation**: Validate heavily at the domain layer. Do not rely on SQLite for business validation (though foreign keys MUST be enforced).
- **Logging**: Use `tracing` crate. Logs correlate typically via a `correlation_id` passed from the frontend for easier debugging.
