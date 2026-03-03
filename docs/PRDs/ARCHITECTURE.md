# ARCHITECTURE.md

## RPMA v2 - Architecture Documentation

---

## 1. High-Level Architecture

### 1.1 System Overview

RPMA v2 follows a **4-layer Clean Architecture** with **Domain-Driven Design (DDD)** bounded contexts:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Frontend (Next.js 14)                     │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │    │
│  │  │  Pages  │  │Components│  │ Hooks   │  │  Zustand   │   │    │
│  │  │(App Dir)│  │          │  │         │  │   Store    │   │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘   │    │
│  └───────┼────────────┼────────────┼──────────────┼──────────┘    │
│          │            │            │              │                │
│          └────────────┴─────┬──────┴──────────────┘                │
│                             ▼                                       │
│                    IPC Client Layer                                 │
│                    (safeInvoke, typed)                              │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Tauri IPC
┌─────────────────────────────┴───────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              IPC Command Handlers (Tauri)                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │    │
│  │  │ auth::ipc    │  │ tasks::ipc   │  │ clients::ipc │    │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │    │
│  └─────────┼─────────────────┼─────────────────┼────────────┘    │
│            │                 │                 │                   │
│            ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Application Services / Facades                  │    │
│  │  AuthFacade, TaskFacade, ClientFacade, etc.                │    │
│  └─────────────────────────────┬───────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Domain    │  │   Domain    │  │   Domain    │               │
│  │   Models    │  │   Services  │  │  Policies   │               │
│  │  Entities   │  │   Rules     │  │             │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                     │
│  Bounded Contexts: auth, users, clients, tasks, interventions,      │
│  inventory, quotes, documents, calendar, notifications,            │
│  sync, audit, reports, settings                                    │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │  Repositories  │  │   Database     │  │  External      │      │
│  │  (SQL)         │  │   (SQLite WAL)  │  │  Adapters      │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5 |
| **UI Components** | Radix UI primitives, shadcn/ui |
| **Styling** | Tailwind CSS 3.4 |
| **State Management** | Zustand 5, TanStack Query 5 |
| **Backend Runtime** | Tauri 2.x (Rust) |
| **Backend Language** | Rust 1.85 |
| **Database** | SQLite (WAL mode) |
| **ORM** | rusqlite + r2d2 connection pool |
| **Async Runtime** | tokio |
| **Auth** | Argon2id + UUID sessions |

---

## 2. Project Structure

### 2.1 Root Directory

```
rpma-rust/
├── frontend/                    # Next.js application
├── src-tauri/                   # Rust/Tauri backend
├── migrations/                  # (Deprecated - see src-tauri/migrations)
├── scripts/                     # Build, validation, utility scripts
├── docs/                        # Documentation
├── AGENTS.md                    # Developer guide
├── package.json                 # npm workspace root
├── Cargo.toml                   # Rust workspace
├── Makefile                     # Development shortcuts
└── *.config.*                   # Configuration files
```

### 2.2 Frontend Structure

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── (auth)/              # Auth-related pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/         # Protected pages
│   │   │   ├── dashboard/
│   │   │   ├── clients/
│   │   │   ├── tasks/
│   │   │   ├── interventions/
│   │   │   ├── inventory/
│   │   │   ├── quotes/
│   │   │   ├── calendar/
│   │   │   ├── messages/
│   │   │   ├── settings/
│   │   │   ├── audit/
│   │   │   └── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Root redirect
│   │   └── providers.tsx      # React context providers
│   │
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # Base UI components (shadcn)
│   │   ├── forms/             # Form components
│   │   ├── layout/            # Layout components
│   │   └── ...
│   │
│   ├── domains/               # Feature-bounded domains
│   │   ├── auth/              # Authentication domain
│   │   ├── clients/           # Client management
│   │   ├── tasks/             # Task management
│   │   ├── interventions/     # PPF interventions
│   │   ├── inventory/         # Inventory/materials
│   │   ├── quotes/            # Quote management
│   │   ├── calendar/          # Scheduling
│   │   ├── notifications/     # Notifications
│   │   ├── users/             # User management
│   │   ├── settings/          # App settings
│   │   ├── audit/             # Audit logs
│   │   ├── sync/              # Offline sync
│   │   └── ...
│   │
│   ├── hooks/                 # Shared React hooks (63+)
│   │
│   ├── lib/                   # Utilities and IPC
│   │   ├── ipc/               # IPC client & commands
│   │   │   ├── index.ts       # Main export
│   │   │   ├── client.ts      # Tauri invoke wrapper
│   │   │   ├── commands.ts    # Command registry
│   │   │   ├── adapter.ts     # IPC adapter interface
│   │   │   ├── cache.ts       # Response caching
│   │   │   ├── retry.ts       # Retry logic
│   │   │   └── metrics.ts    # Performance metrics
│   │   └── ...
│   │
│   ├── shared/                # Shared utilities
│   │   ├── ui/               # Design system
│   │   ├── hooks/            # Shared hooks
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   │
│   └── types/                # Auto-generated from Rust
│
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### 2.3 Backend Structure (Rust)

```
src-tauri/
├── src/
│   ├── main.rs               # Tauri entry point
│   ├── lib.rs                # Library root
│   │
│   ├── commands/             # Cross-cutting commands
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   ├── errors.rs
│   │   ├── correlation_helpers.rs
│   │   ├── websocket.rs
│   │   └── ...
│   │
│   ├── domains/              # Bounded contexts (DDD)
│   │   ├── auth/
│   │   │   ├── domain/       # Domain models, rules
│   │   │   │   ├── models/
│   │   │   │   └── policy.rs
│   │   │   ├── application/  # Use cases
│   │   │   ├── infrastructure/ # Repositories
│   │   │   ├── ipc/          # Tauri commands
│   │   │   ├── facade.rs     # Domain facade
│   │   │   └── tests/
│   │   │
│   │   ├── clients/
│   │   ├── tasks/
│   │   ├── interventions/
│   │   ├── inventory/
│   │   ├── quotes/
│   │   ├── calendar/
│   │   ├── documents/
│   │   ├── notifications/
│   │   ├── users/
│   │   ├── sync/
│   │   ├── audit/
│   │   ├── reports/
│   │   └── settings/
│   │
│   ├── db/                   # Database layer
│   │   ├── mod.rs
│   │   ├── connection.rs     # Connection pool
│   │   ├── migrations.rs     # Migration runner
│   │   ├── queries.rs        # Shared queries
│   │   └── metrics.rs        # DB metrics
│   │
│   ├── services/             # Cross-cutting services
│   │   ├── auth_service.rs
│   │   ├── audit_service.rs
│   │   ├── sync_service.rs
│   │   └── ...
│   │
│   ├── repositories/         # Data access (if shared)
│   │
│   ├── shared/               # Shared utilities
│   │   ├── app_state.rs      # Application state
│   │   ├── error.rs          # Error types
│   │   ├── result.rs         # Result types
│   │   └── ...
│   │
│   └── logging/              # Logging infrastructure
│       ├── mod.rs
│       ├── middleware.rs
│       └── correlation.rs
│
├── migrations/               # SQL migrations (002-047)
│   ├── 002_*.sql
│   ├── 003_*.sql
│   └── ...
│
├── tests/                    # Integration tests
│   ├── commands/
│   │   ├── auth_commands_test.rs
│   │   ├── client_commands_test.rs
│   │   ├── intervention_commands_test.rs
│   │   └── task_commands_test.rs
│   └── ...
│
├── Cargo.toml
├── tauri.conf.json
└── build.rs
```

---

## 3. Bounded Contexts

### 3.1 Backend Domains (15 Bounded Contexts)

| Domain | Responsibility | Key Entities |
|--------|---------------|---------------|
| `auth` | Authentication, sessions | User, Session |
| `users` | User management, RBAC | User, Role, Permission |
| `clients` | Customer management | Client, ClientStatistics |
| `tasks` | Task lifecycle | Task, TaskHistory, TaskNote |
| `interventions` | PPF workflow | Intervention, InterventionStep |
| `inventory` | Materials, stock | Material, Category, Supplier |
| `quotes` | Quote management | Quote, QuoteItem |
| `documents` | Photo/document storage | Document |
| `calendar` | Scheduling | CalendarEvent, TaskConflict |
| `notifications` | User notifications | Notification |
| `messages` | Internal messaging | Message |
| `sync` | Offline sync queue | SyncOperation |
| `audit` | Security audit trail | AuditEvent |
| `reports` | Report generation | Report |
| `settings` | App configuration | AppSetting |

### 3.2 Frontend Domains (20 Feature Domains)

```
admin, analytics, audit, auth, bootstrap, calendar, clients,
dashboard, documents, interventions, inventory, notifications,
performance, quotes, reports, settings, sync, tasks, users, workflow
```

---

## 4. Layer Architecture Details

### 4.1 Domain Layer (innermost)

**Responsibilities:**
- Domain models (entities, value objects)
- Domain rules and invariants
- Business logic
- Domain events

**Rules:**
- No external dependencies
- Pure Rust types
- Serialization hints for TypeScript generation

**Example:**
```rust
// Domain model with TS export
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    // ...
}
```

### 4.2 Application Layer

**Responsibilities:**
- Use cases and application services
- Orchestration of domain operations
- Transaction management
- Authorization checks

**Key Pattern - Facade:**
```rust
pub struct ClientFacade;
impl ClientFacade {
    pub fn create_client(&self, request: CreateClientRequest) -> Result<Client, AppError>;
    pub fn update_client(&self, id: &str, request: UpdateClientRequest) -> Result<Client, AppError>;
}
```

### 4.3 Infrastructure Layer

**Responsibilities:**
- Database repositories
- External service adapters
- File system access

**Rules:**
- All SQL in infrastructure layer
- Repository interfaces defined in domain
- Implementations in infrastructure

### 4.4 IPC/Presentation Layer

**Responsibilities:**
- Tauri command handlers
- Request/response serialization
- Authentication middleware
- Error handling

**Pattern:**
```rust
#[tauri::command]
pub async fn client_crud(
    request: ClientCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Client>, AppError> {
    // Thin wrapper - delegates to facade
    let facade = ClientFacade::new();
    facade.handle_crud(request)
}
```

---

## 5. Data Flow

### 5.1 Typical Request Flow

```
1. Frontend: User clicks "Create Client"
         │
         ▼
2. IPC Client: ipcClient.clients.create({ name, email })
         │
         ▼
3. Tauri IPC: invoke("client_crud", { operation: "create", data })
         │
         ▼
4. Command Handler: client_crud() receives request
         │
         ▼
5. Authorization: validate session & RBAC
         │
         ▼
6. Facade: ClientFacade::handle_crud(request)
         │
         ▼
7. Domain Service: Validate business rules
         │
         ▼
8. Repository: Insert to SQLite
         │
         ▼
9. Response: ApiResponse<Client> serialized back
         │
         ▼
10. Frontend: Client created in state
```

### 5.2 Authentication Flow

```
1. User submits login form (email, password)
         │
         ▼
2. auth_login IPC command
         │
         ▼
3. AuthService::authenticate(email, password, ip)
         │
         ├── Validate input
         ├── Lookup user by email
         ├── Verify Argon2 hash
         ├── Create session token
         └── Store session in DB
         │
         ▼
4. Return UserSession (token, expiry)
         │
         ▼
5. Frontend stores token for subsequent requests
```

---

## 6. Cross-Cutting Concerns

### 6.1 Error Handling

- Custom error types per domain (`domain::errors`)
- Global `AppError` enum in `shared/error.rs`
- Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, etc.
- Structured error responses with correlation IDs

### 6.2 Logging

- Structured logging with `tracing`
- Correlation IDs for request tracking
- Log levels: ERROR, WARN, INFO, DEBUG, TRACE
- Middleware for request/response logging

### 6.3 Security

- Session token validation on every protected command
- RBAC role checks before sensitive operations
- Argon2id password hashing
- Audit logging for security events
- Input validation via Zod (frontend) and custom validators (backend)

### 6.4 Type Synchronization

- Rust structs derive `#[derive(TS)]` from `ts-rs`
- `npm run types:sync` generates TypeScript types
- Types stored in `frontend/src/types/`
- Never edit manually - auto-generated

---

## 7. Architectural Rules (From AGENTS.md)

### 7.1 Mandatory Rules

| Rule | Description |
|------|-------------|
| ✅ 4-Layer Architecture | Never skip layers |
| ✅ Domain Isolation | No cross-domain imports |
| ✅ Thin IPC Handlers | Commands delegate to facades |
| ✅ SQL in Infrastructure | No raw SQL in application layer |
| ✅ Type Sync | Run after Rust model changes |
| ✅ Idempotent Migrations | Use IF NOT EXISTS |

### 7.2 Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| ❌ Direct DB access from IPC | Violates layer separation |
| ❌ Business logic in handlers | Should be in domain services |
| ❌ Cross-domain imports | Use event bus instead |
| ❌ Raw SQL in commands | Should use repositories |
| ❌ Manual type edits | Auto-generated, will be overwritten |

---

## 8. Module Dependencies

### 8.1 Dependency Direction

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation (IPC)                        │
│    Depends on: Application (facades), Shared (error types)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application (Facades)                     │
│    Depends on: Domain (models, services), Infrastructure      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Domain (Pure Rust)                        │
│    No external dependencies - self-contained                │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure                           │
│    Implements domain interfaces                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Testing Strategy

### 9.1 Test Types

| Level | Location | Framework |
|-------|----------|-----------|
| Unit Tests | `domains/*/tests/unit_*.rs` | Rust built-in |
| Integration Tests | `domains/*/tests/integration_*.rs` | Rust built-in |
| Permission Tests | `domains/*/tests/permission_*.rs` | Rust built-in |
| Validation Tests | `domains/*/tests/validation_*.rs` | Rust built-in |
| Migration Tests | `src/tests/migrations/test_*.rs` | Rust built-in |
| Property Tests | `src/tests/proptests/` | proptest |
| E2E Tests | `frontend/tests/e2e/*.spec.ts` | Playwright |
| Unit Tests (Frontend) | `frontend/src/**/__tests__/*.test.tsx` | Jest/Vitest |

### 9.2 Test Commands

```bash
# Backend
cd src-tauri && cargo test --lib           # Unit tests
cd src-tauri && cargo test migration       # Migration tests

# Frontend
cd frontend && npm test                     # Unit tests
cd frontend && npm run test:e2e             # E2E tests
```

---

## 10. Validation & Quality Gates

### 10.1 Pre-Commit Checks

```bash
npm run types:drift-check           # Type drift detection
npm run validate:bounded-contexts   # Domain isolation
npm run security:audit              # Dependency audit
npm run backend:clippy              # Rust linter
npm run frontend:lint               # ESLint
```

### 10.2 CI/CD Checks

```bash
npm run quality:check               # Full quality gate
npm run prod:gate                   # Production gate
```

---

## 11. Performance Considerations

### 11.1 Database Optimization

- WAL mode for concurrent reads
- Strategic indexes on filtered columns
- Connection pooling (r2d2)
- Query monitoring

### 11.2 IPC Optimization

- Response compression (gzip)
- Streaming for large transfers
- Request caching
- Batch operations where possible

### 11.3 Frontend Optimization

- Next.js SSR/SSG where appropriate
- TanStack Query caching
- Bundle analysis and optimization
- Code splitting by route
