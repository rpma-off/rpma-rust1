# API Documentation (IPC Commands)

In a Tauri application, the "API" consists of IPC (Inter-Process Communication) commands that the frontend invokes. This document lists the primary IPC commands available in RPMA-Rust, categorized by domain.

## Authentication & Sessions (`domains/auth`)

| Command | Description |
|---|---|
| `auth_login` | Authenticates a user with email and password. |
| `auth_create_account` | Registers a new user and organization. |
| `auth_logout` | Destroys the current session. |
| `auth_validate_session` | Verifies the validity of the current session. |
| `get_active_sessions` | Retrieves list of current active sessions for the user. |
| `revoke_session` | Revokes a specific session by ID. |

## Users (`domains/users`)

| Command | Description |
|---|---|
| `get_users` | Lists all users in the organization. |
| `create_user` | Creates a new user (admin/technician/etc). |
| `update_user` | Updates user details. |
| `delete_user` | Soft deletes a user account. |
| `bootstrap_first_admin` | Special command for initial setup. |

## Tasks & Interventions (`domains/tasks`, `domains/interventions`)

| Command | Description |
|---|---|
| `task_crud` | Unified command for task CRUD operations. |
| `task_transition_status` | Updates task status with validation. |
| `intervention_workflow` | Main entry point for intervention state changes. |
| `intervention_start` | Initiates a new intervention for a task. |
| `intervention_advance_step` | Moves the intervention to the next workflow step. |
| `intervention_finalize` | Completes the intervention and locks data. |

## Inventory (`domains/inventory`)

| Command | Description |
|---|---|
| `material_list` | Retrieves all materials in stock. |
| `material_update_stock` | Records stock additions or manual changes. |
| `material_record_consumption` | Logs materials used during an intervention. |
| `inventory_get_stats` | Dashboard data for stock levels and low-stock alerts. |

## Quotes (`domains/quotes`)

| Command | Description |
|---|---|
| `quote_create` | Creates a new customer quote. |
| `quote_export_pdf` | Generates a PDF version of the quote. |
| `quote_convert_to_task` | Transitions an accepted quote into an active task. |

## Documents & Reports (`domains/documents`)

| Command | Description |
|---|---|
| `document_store_photo` | Saves an intervention photo to disk and database. |
| `export_intervention_report` | Generates a final PDF report for the customer. |

## System & Navigation

| Command | Description |
|---|---|
| `health_check` | Verifies database and system status. |
| `navigation_update` | Synchronizes frontend and backend navigation state. |
| `ui_window_close` | Closes the application window. |

## Communication Protocol

### Type Safety
All commands use `ts-rs` to export Rust structs as TypeScript interfaces. This ensures that the data passed between frontend and backend is always type-safe.

### Authentication Middleware
Commands are protected by an internal authorization layer. Most commands require a valid `RequestContext` which includes:
- `auth`: The current user's session and role.
- `correlation_id`: For tracing across IPC boundaries.

### Error Handling
The backend uses a structured `AppError` enum which is serialized and sent to the frontend. Common error codes include:
- `Unauthorized`: Missing or invalid session.
- `Forbidden`: Insufficient permissions for the role.
- `Validation(msg)`: Business rule or input validation failure.
- `NotFound(msg)`: Resource does not exist.
- `DatabaseError(msg)`: Internal SQLite failure (sanitized).
