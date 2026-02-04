# Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architectural Pattern](#architectural-pattern)
4. [Project Structure](#project-structure)
5. [Data Flow](#data-flow)
6. [Module Dependencies](#module-dependencies)
7. [Key Design Patterns](#key-design-patterns)
8. [Performance Optimization](#performance-optimization)

## Overview

RPMA v2 is a **desktop application** for managing Paint Protection Film (PPF) interventions, built using the **Tauri framework**. It follows an **offline-first** architecture with local SQLite database, designed to work reliably without an internet connection, with synchronization capabilities when online.

### Architecture Type
- **Hybrid Desktop Application** (Tauri-based)
- **Multi-tier Layered Architecture**
- **Offline-First with Sync**

## Technology Stack

### Backend (Rust)
```
┌─────────────────────────────────────────────┐
│           Tauri Framework v2.1              │
├─────────────────────────────────────────────┤
│  Language: Rust 1.77+ (Edition 2021)        │
│  Runtime: Async (Tokio multi-threaded)      │
│  Database: SQLite (rusqlite 0.32)           │
│  Connection Pool: r2d2                      │
│  Auth: JWT (jsonwebtoken) + Argon2          │
│  Logging: tracing + tracing-subscriber      │
│  Serialization: serde + rmp-serde           │
└─────────────────────────────────────────────┘
```

### Frontend (Next.js + TypeScript)
```
┌─────────────────────────────────────────────┐
│           Next.js 14.2 (App Router)         │
├─────────────────────────────────────────────┤
│  Language: TypeScript 5.3                   │
│  UI Framework: React 18.3                   │
│  State Mgmt: Zustand 5.0 + TanStack Query   │
│  Styling: TailwindCSS 3.4                   │
│  Components: Radix UI + shadcn/ui           │
│  Forms: react-hook-form + Zod validation    │
│  Maps: Leaflet/React-Leaflet                │
│  Charts: Recharts                           │
└─────────────────────────────────────────────┘
```

### Additional Tools
- **PDF Generation**: genpdf, printpdf
- **Image Processing**: image crate
- **2FA**: totp-rs
- **Geospatial**: geo crate
- **Testing**: Jest, Playwright, Criterion (benchmarks)
- **Caching**: LRU cache, Redis support
- **Compression**: flate2
- **WebSocket**: tokio-tungstenite

## Architectural Pattern

### 4-Tier Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│  (Next.js Frontend - React Components, Pages, UI)            │
│  • /frontend/src/app/*        - Next.js App Router Pages     │
│  • /frontend/src/components/* - Reusable UI Components       │
│  • /frontend/src/hooks/*      - Custom React Hooks           │
└───────────────────────────┬──────────────────────────────────┘
                            │ IPC (Tauri Commands)
┌───────────────────────────▼──────────────────────────────────┐
│                     APPLICATION LAYER                         │
│  (Tauri Commands - IPC Handlers, DTOs, Middleware)           │
│  • /src-tauri/src/commands/*  - Tauri command handlers       │
│  • /src-tauri/src/logging/*   - Request logging & correlation│
│  • /src-tauri/src/batching.rs - IPC optimization             │
└───────────────────────────┬──────────────────────────────────┘
                            │ Service Calls
┌───────────────────────────▼──────────────────────────────────┐
│                      BUSINESS LAYER                           │
│  (Services - Business Logic, Domain Events, Validation)      │
│  • /src-tauri/src/services/*         - Business services     │
│  • /src-tauri/src/services/reports/* - Reporting engine      │
│  • /src-tauri/src/services/auth.rs   - Security & auth       │
│  • /src-tauri/src/sync/*             - Sync orchestration    │
└───────────────────────────┬──────────────────────────────────┘
                            │ Repository Pattern
┌───────────────────────────▼──────────────────────────────────┐
│                       DATA LAYER                              │
│  (Repositories - Data Access, Caching, DB Operations)        │
│  • /src-tauri/src/repositories/*   - Data repositories       │
│  • /src-tauri/src/db/*             - Database management     │
│  • /src-tauri/src/models/*         - Domain models           │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

### Root Directory Layout
```
rpma-rust/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities, API clients
│   │   ├── types/        # TypeScript types
│   │   ├── ui/           # shadcn/ui components
│   │   └── store/        # Zustand state stores
│   ├── public/           # Static assets
│   ├── package.json
│   └── next.config.js
│
├── src-tauri/            # Rust backend application
│   ├── src/
│   │   ├── commands/     # Tauri IPC command handlers
│   │   ├── services/     # Business logic layer
│   │   ├── repositories/ # Data access layer
│   │   ├── models/       # Domain models & DTOs
│   │   ├── db/           # Database management
│   │   ├── logging/      # Logging infrastructure
│   │   ├── sync/         # Sync engine
│   │   ├── menu/         # Application menus
│   │   ├── bin/          # Binary executables
│   │   ├── main.rs       # Application entry point
│   │   └── lib.rs        # Library root
│   ├── migrations/       # Database migrations
│   ├── benches/          # Performance benchmarks
│   ├── tests/            # Integration tests
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
│
├── scripts/              # Build & validation scripts
├── migrations/           # Additional migrations
├── docs/                 # Documentation
├── .github/              # GitHub workflows
├── package.json          # Root package.json (monorepo)
├── .env                  # Environment variables
└── Cargo.toml            # Workspace configuration
```

### Backend Module Structure

```
src-tauri/src/
│
├── main.rs                    # App initialization, setup, DB init
├── lib.rs                     # Library exports
├── service_builder.rs         # Dependency injection setup
├── worker_pool.rs            # Background worker pool
├── batching.rs               # IPC batching optimization
├── ipc_serialization.rs      # MessagePack serialization
├── memory_management.rs      # Memory monitoring & caching
├── test_utils.rs             # Testing utilities
│
├── bin/
│   ├── export-types.rs       # TypeScript type generation
│   └── backfill_client_stats.rs
│
├── commands/                  # IPC Command Handlers (Application Layer)
│   ├── mod.rs
│   ├── auth.rs               # Authentication commands
│   ├── task.rs, task_types.rs
│   ├── client.rs
│   ├── user.rs
│   ├── intervention.rs
│   ├── material.rs
│   ├── calendar.rs
│   ├── message.rs
│   ├── notification.rs
│   ├── reports.rs
│   ├── settings.rs
│   ├── security.rs
│   ├── analytics.rs
│   ├── status.rs
│   ├── sync.rs, queue.rs
│   ├── websocket.rs, websocket_commands.rs
│   ├── ui.rs, navigation.rs, system.rs
│   ├── performance.rs
│   ├── log.rs
│   ├── ipc_optimization.rs
│   ├── streaming.rs
│   └── compression.rs
│
 ├── services/                  # Business Logic Layer (83 services)
 │   ├── mod.rs
 │   ├── auth.rs               # Auth service (JWT, Argon2, 2FA)
 │   ├── session.rs, token.rs
 │   ├── two_factor.rs
 │   ├── task.rs, task_*.rs    # Task management
 │   ├── client.rs, client_*.rs
 │   ├── user.rs
 │   ├── intervention*.rs      # Intervention workflow
 │   ├── material.rs           # Material/inventory management
 │   ├── calendar*.rs
 │   ├── notification.rs
 │   ├── settings.rs
 │   ├── dashboard.rs
 │   ├── validation.rs         # Business validation rules
 │   ├── event_*.rs            # Event bus & domain events
 │   ├── reports/              # Reporting subsystem
 │   │   ├── core.rs
 │   │   ├── generation.rs
 │   │   ├── export.rs
 │   │   └── ... (multiple report types)
 │   ├── photo/                # Photo management
 │   ├── pdf_*.rs              # PDF generation
 │   ├── geo.rs                # Geospatial operations
 │   ├── cache.rs              # Application cache
 │   ├── security_monitor.rs
 │   ├── audit_service.rs
 │   ├── performance_monitor.rs
 │   ├── rate_limiter.rs
 │   └── ... (many more)
│
├── repositories/              # Data Access Layer
│   ├── mod.rs
│   ├── factory.rs            # Repository factory pattern
│   ├── base.rs               # Base repository trait
│   ├── cache.rs              # Repository-level caching
│   ├── task_repository.rs
│   ├── client_repository.rs
│   ├── user_repository.rs
│   ├── intervention_repository.rs
│   ├── material_repository.rs
│   ├── calendar_event_repository.rs
│   ├── session_repository.rs
│   ├── photo_repository.rs
│   ├── message_repository.rs
│   ├── notification_repository.rs
│   ├── audit_repository.rs
│   └── ... (more repositories)
│
├── models/                    # Domain Models & DTOs
│   ├── mod.rs
│   ├── common.rs             # Common types
│   ├── task.rs
│   ├── client.rs
│   ├── user.rs
│   ├── auth.rs
│   ├── intervention.rs
│   ├── step.rs
│   ├── material.rs
│   ├── photo.rs
│   ├── calendar*.rs
│   ├── message.rs
│   ├── notification.rs
│   ├── settings.rs
│   ├── status.rs
│   ├── reports.rs
│   └── sync.rs
│
├── db/                        # Database Management
│   ├── mod.rs                # Database struct & pool
│   ├── schema.sql            # Initial schema (v25)
│   ├── connection.rs         # Connection management
│   ├── migrations.rs         # Migration runner
│   ├── queries.rs            # Common queries
│   ├── import.rs             # Data import
│   ├── utils.rs
│   ├── operation_pool.rs
│   └── metrics.rs
│
├── logging/                   # Logging & Observability
│   ├── mod.rs
│   ├── middleware.rs
│   └── correlation.rs
│
├── sync/                      # Sync Engine
│   ├── mod.rs
│   ├── engine.rs
│   └── background_service.rs
│
├── menu/                      # Application Menu
│   ├── mod.rs
│   └── events.rs
│
└── tests/                     # Integration Tests
```

### Frontend Module Structure

```
frontend/src/
│
├── app/                       # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   ├── RootClientLayout.tsx  # Client-side root
│   ├── globals.css           # Global styles
│   ├── error.tsx, loading.tsx, not-found.tsx
│   │
│   ├── login/                # Auth pages
│   ├── signup/
│   ├── bootstrap-admin/      # First admin setup
│   ├── unauthorized/
│   │
│   ├── dashboard/            # Dashboard pages
│   ├── tasks/                # Task management
│   ├── clients/              # Client management
│   ├── interventions/        # Intervention workflows
│   ├── schedule/             # Calendar/scheduling
│   ├── inventory/            # Material inventory
│   ├── messages/             # Messaging
│   ├── reports/              # Reporting pages
│   ├── analytics/            # Analytics dashboards
│   ├── team/, technicians/, users/
│   ├── settings/             # Settings pages
│   ├── configuration/        # System config
│   ├── admin/                # Admin area
│   ├── audit/
│   ├── data-explorer/
│   │
│   └── api/                  # API routes (Next.js API)
│       ├── auth/
│       ├── tasks/
│       └── ... (many routes)
│
├── components/                # Reusable Components
│   ├── Charts/
│   ├── GPS/
│   ├── PhotoUpload/
│   ├── QualityControl/
│   ├── SignatureCapture/
│   ├── TaskForm/
│   ├── animations/
│   ├── auth/
│   ├── clients/
│   ├── dashboard/
│   ├── error-boundaries/
│   ├── forms/
│   └── ... (many more)
│
├── ui/                        # shadcn/ui Components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   └── ... (40+ UI primitives)
│
├── hooks/                     # Custom React Hooks
│   ├── useAuth.ts
│   ├── useTasks.ts
│   ├── useClients.ts
│   ├── useInterventions.ts
│   └── ... (60+ hooks)
│
├── lib/                       # Utilities & API Clients
│   ├── api/                  # API client functions
│   ├── utils.ts
│   ├── cn.ts                 # className utilities
│   └── ... (many utilities)
│
├── types/                     # TypeScript Types
│   ├── task.ts
│   ├── client.ts
│   ├── intervention.ts
│   └── ... (generated + custom)
│
├── store/                     # Zustand State Management
│
├── contexts/                  # React Contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── ...
│
├── constants/                 # Constants & Config
│
└── ErrorBoundary.tsx
```

## Data Flow

### 1. Request Flow (Frontend → Backend)

```
┌─────────────────────────────────────────────────────────────┐
│  USER INTERACTION                                            │
│  (Click Button, Submit Form, etc.)                           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  REACT COMPONENT                                             │
│  • Calls custom hook (e.g., useTasks)                       │
│  • OR directly invokes Tauri command                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  TAURI IPC BRIDGE                                            │
│  • @tauri-apps/api/core: invoke(command_name, args)         │
│  • Serializes data (JSON → MessagePack for optimization)    │
│  • Sends to Rust backend                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │ IPC
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  TAURI COMMAND HANDLER (commands/*)                          │
│  • Receives request                                          │
│  • Validates inputs                                          │
│  • Extracts app state (services, db)                        │
│  • Calls appropriate service method                          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICE (services/*)                                        │
│  • Executes business logic                                   │
│  • Validates business rules                                  │
│  • Coordinates multiple repositories if needed               │
│  • Emits domain events (if applicable)                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  REPOSITORY (repositories/*)                                 │
│  • Checks cache first                                        │
│  • Builds SQL query                                          │
│  • Executes against SQLite                                   │
│  • Maps rows to domain models                                │
│  • Updates cache                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite DATABASE                                             │
│  • Executes query with WAL mode                              │
│  • Returns results                                           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼ (Return path)
         Service → Command → IPC → Frontend
```

### 2. Sync Flow (Offline → Online)

```
┌─────────────────────────────────────────────────────────────┐
│  OFFLINE OPERATION                                           │
│  • User creates/updates entity while offline                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICE LAYER                                               │
│  • Saves entity to local SQLite                              │
│  • Marks entity.synced = 0                                   │
│  • Adds operation to sync_queue                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SYNC_QUEUE TABLE                                            │
│  operation_type, entity_type, entity_id, status='pending'   │
└───────────────────┬─────────────────────────────────────────┘
                    │
         (When network available)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKGROUND SYNC SERVICE (sync/background_service.rs)        │
│  • Polls queue every interval                                │
│  • Batches pending operations                                │
│  • Respects dependencies                                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL API (Future)                                       │
│  • Sends HTTP request to backend                             │
│  • Receives confirmation                                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SYNC COMPLETION                                             │
│  • Marks entity.synced = 1                                   │
│  • Updates sync_queue status = 'completed'                   │
│  • Triggers WebSocket broadcast (if active)                  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Authentication Flow

```
User Login
    │
    ▼
auth::auth_login(email, password)
    │
    ▼
AuthService::login()
    │
    ├─→ Validate credentials (Argon2 hash check)
    │
    ├─→ Check 2FA if enabled
    │
    ├─→ Generate JWT token (with expiry)
    │
    ├─→ Create session in user_sessions table
    │
    ├─→ Log audit event
    │
    └─→ Returns { token, user, session }
```

## Module Dependencies

### Backend Dependencies (Directed Graph)

```
main.rs
  ├─→ db::Database
  ├─→ repositories::Repositories (factory)
  ├─→ service_builder::ServiceBuilder
  └─→ commands::* (registered handlers)

ServiceBuilder
  ├─→ Database (Arc)
  ├─→ Repositories (Arc)
  └─→ Creates AppState with all services

Commands
  └─→ Services (via AppState)

Services
  ├─→ Repositories
  ├─→ Other Services (composition)
  └─→ Domain Models

Repositories
  ├─→ Database (connection pool)
  ├─→ Cache
  └─→ Domain Models
```

### Frontend Dependencies

```
Pages (app/*)
  ├─→ Components
  ├─→ Hooks
  └─→ API Clients (lib/api/*)

Hooks
  ├─→ @tauri-apps/api
  ├─→ TanStack Query
  └─→ Store (Zustand)

Components
  ├─→ UI primitives (ui/*)
  ├─→ Hooks
  └─→ Types
```

## Key Design Patterns

### 1. **Repository Pattern**
- **Location**: `repositories/*`
- **Purpose**: Abstract data access, enable caching
- **Implementation**: Base trait with CRUD operations

```rust
pub trait Repository<T> {
    async fn find_by_id(&self, id: &str) -> Result<Option<T>>;
    async fn find_all(&self) -> Result<Vec<T>>;
    async fn create(&self, entity: &T) -> Result<String>;
    async fn update(&self, entity: &T) -> Result<()>;
    async fn delete(&self, id: &str) -> Result<()>;
}
```

### 2. **Service Layer Pattern**
- **Location**: `services/*`
- **Purpose**: Encapsulate business logic
- **Benefits**: Testable, reusable, decoupled from IPC

### 3. **Command Pattern (Tauri IPC)**
- **Location**: `commands/*`
- **Purpose**: Handle frontend requests
- **Pattern**: Thin handlers that delegate to services

### 4. **Factory Pattern**
- **Location**: `repositories/factory.rs`, `service_builder.rs`
- **Purpose**: Centralized dependency initialization

### 5. **Event Bus Pattern**
- **Location**: `services/event_bus.rs`, `domain_event.rs`
- **Purpose**: Decouple domain events from handlers

### 6. **Strategy Pattern**
- **Location**: `services/workflow_strategy.rs`
- **Purpose**: Different intervention workflow strategies

### 7. **Observer Pattern**
- **Location**: WebSocket broadcasts, event handlers
- **Purpose**: Real-time updates across clients

### 8. **Singleton Pattern**
- **Location**: `Database` (via Arc), `AppState`
- **Purpose**: Single instance of critical resources

## Performance Optimization

### 1. **Database Optimization**
- **WAL Mode**: Write-Ahead Logging for concurrent reads
- **Connection Pooling**: r2d2 with configurable size
- **Indexes**: Strategic composite indexes on common queries
- **FTS5**: Full-text search for clients
- **Periodic Checkpoints**: Every 60s to manage WAL size

### 2. **Caching Strategy**
- **LRU Cache**: In-memory cache for hot data
- **Repository Cache**: Per-entity caching layer
- **Cache Metadata Table**: Tracks cache validity
- **TTL-based Invalidation**: Configurable expiry

### 3. **IPC Optimization**
- **MessagePack Serialization**: `rmp-serde` for compact payload
- **Compression**: `flate2` for large transfers
- **Batching**: Batch multiple operations in single IPC
- **Streaming**: Chunked transfer for large datasets

### 4. **Memory Management**
- **Memory Monitoring**: `sysinfo` crate tracks usage
- **Automatic Cache Eviction**: When memory pressure high
- **Worker Pool**: Bounded thread pool for background tasks

### 5. **Frontend Optimization**
- **TanStack Query**: Automatic caching, deduplication
- **Virtual Scrolling**: `@tanstack/react-virtual` for large lists
- **Code Splitting**: Next.js automatic chunking
- **Image Compression**: Before upload

### 6. **Async & Concurrency**
- **Tokio Runtime**: Multi-threaded async executor
- **Parking Lot**: More efficient locks than std
- **Async Streams**: For large result sets

## Security Architecture

### Authentication & Authorization
- **Password Hashing**: Argon2 (industry standard)
- **JWT Tokens**: Signed with HS256, short-lived
- **Session Management**: Tracked in `user_sessions` table
- **2FA**: TOTP-based (RFC 6238)
- **Role-Based Access**: Admin, Technician, Supervisor, Viewer

### Data Protection
- **Database Encryption**: Optional SQLCipher support
- **Environment Secrets**: JWT_SECRET, RPMA_DB_KEY in .env
- **Content Security Policy**: Strict CSP in tauri.conf.json
- **Input Validation**: Zod on frontend, Rust validation on backend

### Audit & Monitoring
- **Audit Logs**: All mutations logged in `audit_logs` table
- **Security Events**: Tracked in dedicated tables
- **Rate Limiting**: `rate_limiter.rs` service
- **Security Monitoring**: `security_monitor.rs` service

## Build & Deployment

### Development Build
```bash
npm run dev
# Runs: frontend dev + tauri dev
```

### Production Build
```bash
npm run build
# Builds: Next.js + Tauri bundle (.exe, .dmg, .appimage)
```

### Build Artifacts
- **Windows**: `.msi` installer
- **macOS**: `.dmg` or `.app`
- **Linux**: `.AppImage` or `.deb`

## Gaps & Improvements

### Identified Gaps
1. **No Docker deployment** - Desktop app only
2. **Sync API not implemented** - Offline queue exists but no backend
3. **Photo module incomplete** - Many TODOs in commands
4. **Limited testing** - Some test files but incomplete coverage

### Suggested Improvements
1. **Add E2E tests** using Playwright for critical flows
2. **Implement backend API** for sync functionality
3. **Complete photo management** module
4. **Add metrics dashboard** (Prometheus/Grafana for monitoring)
5. **Database backup automation**
6. **Multi-language support** (currently FR-focused)

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-01  
**Maintained By**: RPMA Team
