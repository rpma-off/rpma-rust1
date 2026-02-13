# RPMA v2 — Repository Map

## Rust Backend (`src-tauri/`)

### Module Layout (`src-tauri/src/`)
| Module | Path | Description |
|--------|------|-------------|
| `commands/` | 32 files | Tauri IPC command handlers (auth, task, client, intervention, material, etc.) |
| `services/` | 65+ files | Business logic layer (task CRUD, workflow, intervention, auth, etc.) |
| `repositories/` | 18 files | Data access layer (SQLite via rusqlite + r2d2 pooling) |
| `models/` | 20 files | Data models with `#[derive(Serialize, TS)]` for type generation |
| `db/` | 9 files | Database connection, migrations, schema, metrics, pooling |
| `sync/` | 3 files | Offline sync queue (background.rs, queue.rs) |
| `logging/` | — | Structured logging setup |
| `lib.rs` | — | Module declarations and type exports |
| `main.rs` | — | Tauri app entry point and command registration |

### Key Patterns
- **Architecture**: Commands → Services → Repositories → SQLite
- **IPC**: MessagePack serialization via `rmp-serde`
- **Auth**: Argon2 password hashing, JWT tokens, TOTP 2FA
- **DB**: SQLite WAL mode, r2d2 connection pooling

## Frontend (`frontend/src/`)

### App Router Pages (`app/`)
| Route | Description |
|-------|-------------|
| `/` | Root page |
| `/login` | Authentication |
| `/dashboard` | Main dashboard |
| `/tasks` | Task management |
| `/clients` | Client management |
| `/interventions` | PPF intervention workflow |
| `/inventory` | Material/stock management |
| `/reports` | Reporting |
| `/schedule` | Calendar/scheduling |
| `/settings` | User/app settings |
| `/admin` | Admin panel |
| `/users` | User management |
| `/analytics` | Analytics dashboards |
| `/messages` | Messaging |
| `/team` | Team management |

### Component Organization (`components/`)
- `layout/` — Shared layout components
- `tasks/` — Task-related UI (TaskForm, TaskActions, etc.)
- `workflow/` — Workflow step components
- `dashboard/` — Dashboard widgets
- `inventory/` — Stock management UI
- `auth/` — Authentication components
- `calendar/` — Calendar views
- `ui/` — shadcn/ui primitives (Button, Dialog, Input, etc.)
- `navigation/` — App navigation

### IPC Layer (`lib/ipc/`)
| File | Description |
|------|-------------|
| `client.ts` | Main IPC client with domain methods |
| `secure-client.ts` | Secure IPC wrapper with RBAC |
| `cache.ts` | Response caching layer |
| `utils.ts` | `safeInvoke` helper with error handling |
| `core/types.ts` | `BackendResponse<T>` interface |
| `core/response-handlers.ts` | Response extraction/validation |
| `domains/` | Domain-specific IPC (inventory, interventions, users, etc.) |
| `mock/` | Mock IPC for testing (mock-db, mock-client, fixtures) |
| `utils/crud-helpers.ts` | Generic CRUD operation factories |

### Types (`types/`)
- `json.ts` — JsonValue, JsonObject, JsonArray base types
- `api.ts` — ApiResponse, ApiError, CustomError
- `task.types.ts`, `client.types.ts`, `intervention-extended.types.ts` — Domain types
- Auto-generated from Rust via `ts-rs`

### Hooks (`hooks/`)
- 50+ custom hooks for tasks, clients, interventions, materials, sync, etc.
- Key: `useTasks`, `useClient`, `useInterventionWorkflow`, `useInventory`

## Database & Migrations

### Schema (`src-tauri/src/db/schema.sql`)
- Core tables: `tasks`, `interventions`, `clients`, `users`, `photos`, `materials`
- Support tables: `notifications`, `calendar_events`, `audit_log`, `sync_queue`

### Migrations (`migrations/`)
- `020_calendar_enhancements.sql`
- `025_audit_logging.sql`
- `026_performance_indexes.sql`
- `029_add_users_first_last_name.sql`
- `030_add_user_sessions_updated_at.sql`
- `031_report_indexes.sql`

Migration system: Applied via `db/migrations.rs`, validated by `scripts/detect-schema-drift.js`.

## Auth & RBAC

### Backend Enforcement
- `commands/auth.rs` — Login, session management, 2FA
- `commands/auth_middleware.rs` — Session validation middleware
- `services/auth.rs` — Business logic
- `models/auth.rs` — Session, role models

### Frontend Enforcement
- `lib/rbac.ts` — Role-based access control utilities
- `lib/auth.ts` — Auth state management
- `lib/ipc/secure-client.ts` — RBAC-aware IPC client

### Roles
- Admin, Manager, Technician, Viewer (defined in backend models)

## CI/CD (`.github/workflows/ci.yml`)
- Frontend: lint, type-check, tests, build
- Rust: fmt, clippy, tests (stable + MSRV 1.85.0)
- Database: schema drift detection
- Security: cargo-audit, cargo-deny
- Build: Multi-platform Tauri bundles
