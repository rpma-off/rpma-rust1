# IPC API & Contracts

The Tauri IPC is the strict boundary between the Next.js frontend and the Rust backend.

## IPC Contract Rules
- **Authentication**: All protected commands MUST receive and validate a `session_token`.
- **Correlation**: Best practice dictates passing a `correlation_id` to trace a request through logs.
- **Response Format**: Rust `Result<T, AppError>` maps to a successful JS Promise resolving `T`, or a rejected Promise yielding `AppError`.
- **Performance**: Large payloads may use the utilities found in `src-tauri/src/commands/ipc_optimization.rs` or `compression.rs`.

## Important Commands Reference
*(Note: These are illustrative patterns based on standard RPMA structures. Run `rg "#\[tauri::command\]"` in `src-tauri/` to see exact names.)*

| Command Name | Purpose | Parameters | Permissions | Rust Path | Frontend Path |
|---|---|---|---|---|---|
| `login` | Authenticates a user | `username`, `password` | `Public` | `domains/users/ipc/` | `domains/auth/ipc/` |
| `get_session` | Validate current token | `token` | `Public` | `domains/users/ipc/` | `domains/auth/ipc/` |
| `create_task` | Create a new work order | `token`, `TaskPayload` | `Admin/Mgr` | `domains/tasks/ipc/` | `domains/tasks/ipc/` |
| `list_tasks` | Fetch tasks / dashboard | `token`, `FilterOpts` | `Auth` | `domains/tasks/ipc/` | `domains/tasks/ipc/` |
| `start_intervention` | Begin a PPF job | `token`, `intervention_id` | `Technician`| `domains/interventions/ipc`| `domains/interventions/`|
| `upload_photo` | Attach step imagery | `token`, `step_id`, `bytes`| `Technician`| `domains/documents/ipc/`| `domains/interventions/`|
| `get_inventory` | List consummables | `token` | `Auth` | `domains/inventory/ipc/`| `domains/inventory/` |

## Type Synchronization
Rust acts as the solitary source of truth for shapes traversing the IPC bridge.
- **Library**: `ts-rs`
- **Generates to**: `frontend/src/types/`
- **Command**: Run `npm run types:sync` from root to output the binaries in `src/bin/export-types.rs` into `.d.ts` definitions.
