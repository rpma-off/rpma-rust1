# RPMA v2 - PPF Intervention Management System

## Overview

**RPMA v2** is an offline-first desktop application for managing Paint Protection Film (PPF) interventions. Built with a modern tech stack including Next.js 14, React 18, TypeScript, Tauri, and Rust, it provides comprehensive functionality for task management, client tracking, inventory control, and workflow execution.

**Version:** 0.1.0
**Type:** Desktop Application (Windows, macOS, Linux)
**License:** Private

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-------------|---------|---------|
| **Next.js** | 14.2.35 | React framework with App Router |
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.3.0 | Type safety |
| **Tailwind CSS** | 3.4.0 | Styling |
| **shadcn/ui** | Custom | Component library (Radix UI primitives) |
| **@tanstack/react-query** | 5.90.2 | Server state management |
| **Zustand** | 5.0.8 | Client state management |
| **Zod** | 4.1.12 | Runtime validation |
| **Framer Motion** | 12.23.24 | Animations |
| **Recharts** | 3.3.0 | Charts |
| **Playwright** | 1.40.0 | E2E testing |

### Backend

| Technology | Version | Purpose |
|-------------|---------|---------|
| **Rust** | 1.85+ | Backend language |
| **Tauri** | 2.1.0 | Desktop app framework |
| **SQLite** | Latest | Database (WAL mode) |
| **tokio** | Latest | Async runtime |
| **serde** | Latest | Serialization |

### Security & Auth

| Technology | Purpose |
|-------------|---------|
| **JWT** | Session tokens |
| **Argon2** | Password hashing |
| **RBAC** | Role-based access control (4 roles) |
| **2FA** | Two-factor authentication (optional) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │  Tasks   │  │ Clients  │  │   ...    │       │
│  │  Domain  │  │  Domain  │  │  Domain  │  │  Domains │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│         │             │             │             │           │
│         └─────────────┴─────────────┴─────────────┘           │
│                        │                                        │
│                   ┌───▼────┐                                   │
│                   │  IPC   │ ◄───────────────────────────────┤
│                   │ Layer  │                                   │
│                   └───┬────┘                                   │
└───────────────────────┼────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Rust)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │  Tasks   │  │ Clients  │  │   ...    │       │
│  │  Domain  │  │  Domain  │  │  Domain  │  │  Domains │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│         │             │             │             │           │
│         └─────────────┴─────────────┴─────────────┘           │
│                        │                                        │
│                   ┌───▼────────────────────┐                   │
│                   │  Database (SQLite)     │                   │
│                   │  35 Tables, 200+ Indexes│                   │
│                   └────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Domain-Driven Design (DDD)

The application follows **Domain-Driven Design** with **15 bounded contexts**:

| Domain | Responsibility |
|--------|---------------|
| `auth` | Authentication, sessions, 2FA |
| `tasks` | Task CRUD, assignments, history |
| `interventions` | PPF workflow, steps, photos |
| `clients` | Client management, CRM |
| `inventory` | Materials, stock, tracking |
| `quotes` | Quote creation, PDF export |
| `reports` | Analytics, reporting |
| `calendar` | Events, scheduling |
| `users` | User management, RBAC |
| `documents` | Photo storage, file management |
| `notifications` | Messages, alerts |
| `settings` | User and system settings |
| `sync` | Offline sync, background ops |
| `audit` | Security audit trail |
| `analytics` | Dashboard metrics |

---

## Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Rust**: 1.85+ (with Cargo)
- **Git**: For version control

### Installation

```bash
# Clone repository
git clone <repository-url>
cd rpma-rust

# Install dependencies
npm run install

# Run application
npm run dev
```

### Environment Setup

Create a `.env` file at the root level:

```env
JWT_SECRET=your-32-character-secret-here
RPMA_DB_KEY=your-database-encryption-key
NODE_ENV=development
RUST_LOG=debug
```

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start full app (frontend + backend) |
| `npm run frontend:dev` | Frontend only (localhost:3000) |
| `npm run dev:strict` | Dev with type sync + drift check |

### Build

| Command | Description |
|---------|-------------|
| `npm run build` | Full production build |
| `npm run frontend:build` | Build Next.js frontend |
| `npm run backend:build` | Cargo build (debug) |
| `npm run backend:build:release` | Cargo build (release) |

### Type Synchronization

| Command | Description |
|---------|-------------|
| `npm run types:sync` | Generate TS types from Rust models |
| `npm run types:validate` | Validate generated types |
| `npm run types:drift-check` | Detect type drift |
| `npm run types:watch` | Watch for type changes |

### Quality Gate

| Command | Description |
|---------|-------------|
| `npm run quality:check` | Run all quality checks |
| `npm run frontend:lint` | ESLint |
| `npm run frontend:type-check` | TypeScript strict check |
| `npm run backend:clippy` | Rust linter |
| `npm run backend:check` | Cargo check |
| `npm run security:audit` | Security audit |

### Architecture

| Command | Description |
|---------|-------------|
| `npm run validate:bounded-contexts` | Validate DDD boundaries |
| `npm run architecture:check` | Architecture rules |
| `npm run boundary:enforce` | Enforce boundary coverage |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | All tests |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `make test-auth-commands` | Auth integration tests |
| `make test-task-commands` | Task integration tests |

### Git Workflow

| Command | Description |
|---------|-------------|
| `npm run git:start-feature` | Start new feature branch |
| `npm run git:sync-feature` | Sync feature branch |
| `npm run git:finish-feature` | Complete feature branch |

---

## Project Structure

```
rpma-rust/
├── frontend/                    # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/                 # App Router pages (34 routes)
│   │   ├── components/          # Shared React components
│   │   ├── domains/             # 20 feature domains
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities + IPC client
│   │   ├── shared/              # Shared utils, UI primitives
│   │   └── types/               # ⚠️ AUTO-GENERATED (ts-rs)
│   ├── public/                  # Static assets
│   ├── tests/                   # Playwright E2E tests
│   └── package.json
│
├── src-tauri/                   # Rust/Tauri Backend
│   ├── src/
│   │   ├── commands/            # 14 cross-cutting IPC commands
│   │   ├── domains/             # 15 bounded contexts (DDD)
│   │   │   ├── auth/
│   │   │   ├── tasks/
│   │   │   └── ...
│   │   ├── db/                   # Database layer
│   │   ├── shared/              # Shared utilities
│   │   └── main.rs              # Tauri entry point
│   ├── migrations/              # 42 SQL migrations
│   ├── tests/                   # Integration tests
│   └── Cargo.toml
│
├── migrations/                  # Root-level SQL migrations (7)
├── docs/                        # Documentation
│   ├── adr/                     # Architectural Decision Records
│   └── agent-pack/              # Developer guides
│
├── scripts/                     # Build & validation scripts (41)
├── package.json                 # Root npm workspace
├── Cargo.toml                   # Rust workspace
├── tsconfig.json                # TypeScript config
├── .github/workflows/           # CI/CD pipelines
└── README.md                    # This file
```

---

## Key Features

### Core Functionality

- ✅ **Authentication** - JWT-based with session management
- ✅ **Task Management** - Full CRUD with status tracking
- ✅ **PPF Workflow** - 4-step guided workflow (Inspection → Preparation → Installation → Finalization)
- ✅ **Client Management** - CRM with task history
- ✅ **Inventory Tracking** - Materials, stock, consumption
- ✅ **Quote Management** - Create, export PDF
- ✅ **Reporting & Analytics** - KPIs, trends, performance metrics
- ✅ **Calendar & Scheduling** - Event management, conflict detection
- ✅ **User Management** - RBAC with 4 roles
- ✅ **Offline-First** - Local database with sync queue
- ✅ **Photo Management** - Attach photos to interventions with EXIF data
- ✅ **Audit Logging** - Comprehensive security audit trail

### Workflow Steps (PPF Intervention)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Inspection  │───▶│ Preparation  │───▶│ Installation │───▶│ Finalization │
│   (~12 min)  │    │  (~18 min)   │    │ (~45 min)    │    │   (~8 min)   │
├──────────────┤    ├──────────────┤    ├──────────────┤    ├──────────────┤
│ • Checklist  │    │ • Checklist  │    │ • Zone work  │    │ • Checklist  │
│ • Environment│   │ • Film pre-cut│   │ • Quality    │    │ • Photos     │
│ • Defects    │    │ • Materials  │    │   scoring    │    │ • Client     │
│ • 4+ photos  │    │              │    │ • 6+ photos  │    │   briefing   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Security Features

- **Session-based authentication** with JWT tokens
- **RBAC** (Role-Based Access Control) with 4 roles:
  - `Admin` - Full access
  - `Supervisor` - Create, Read, Update, Assign
  - `Technician` - Create, Read, Update own tasks
  - `Viewer` - Read-only access
- **Password hashing** with Argon2
- **2FA support** (optional, backup codes)
- **Input sanitization** and validation
- **XSS protection** via DOMPurify
- **CSP headers** configured
- **Audit logging** for all actions

---

## Database

- **Engine**: SQLite with WAL mode (Write-Ahead Logging)
- **Tables**: 35 tables
- **Indexes**: 200+ (single, composite, partial)
- **Migrations**: 48 numbered files (current version: 42)
- **Features**:
  - Soft deletes
  - Full-text search (clients)
  - Triggers for automatic stats
  - Views for optimized queries

---

## Testing

### Frontend Testing

```bash
cd frontend
npm test                    # Jest unit tests
npm run test:coverage       # Coverage report (70% threshold)
npm run test:e2e            # Playwright E2E tests
```

### Backend Testing

```bash
cd src-tauri
cargo test                  # All unit tests
cargo test migration        # Migration tests
cargo test performance      # Performance tests

# Via Makefile
make test-auth-commands     # Auth integration tests
make test-task-commands     # Task integration tests
make test-client-commands   # Client integration tests
```

---

## Documentation

- **Architectural Decisions**: `docs/adr/` (8 ADRs)
- **Developer Guide**: `docs/agent-pack/` (comprehensive onboarding)
- **This Documentation**: `docs/` (this file and related docs)

---

## Contributing

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions
- `chore:` - Maintenance
- `perf:` - Performance improvements
- `security:` - Security fixes

### Git Hooks

- **pre-commit**: UTF-8 encoding check
- **pre-push**: Prevents direct pushes to `main`
- **commit-msg**: Validates conventional commits

### Code Quality Gates

All changes must pass:

1. ✅ Frontend lint (`eslint`)
2. ✅ Frontend type-check (`tsc --noEmit`)
3. ✅ Backend check (`cargo check`)
4. ✅ Backend clippy (`cargo clippy`)
5. ✅ Architecture validation
6. ✅ Bounded context validation
7. ✅ Type synchronization check
8. ✅ Security audit

---

## License

Private - All rights reserved.

---

## Support

For issues or questions:
- Create an issue in the repository
- Contact the development team

---

**Built with ❤️ using Next.js, Rust, and Tauri**
