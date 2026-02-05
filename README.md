# RPMA v2 - Paint Protection Film Intervention Management

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.77+-orange.svg)](https://www.rust-lang.org)
[![Node](https://img.shields.io/badge/node-18.0.0+-green.svg)](https://nodejs.org)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-blue.svg)](https://tauri.app)

**RPMA v2** (Resource Planning & Management Application) is a comprehensive desktop application for managing Paint Protection Film (PPF) installation interventions. Built with modern web technologies and native performance, RPMA provides a complete solution for task scheduling, workflow management, client tracking, inventory control, and comprehensive reporting.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Available Scripts](#available-scripts)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [License](#license)

## Overview

RPMA v2 is an **offline-first hybrid desktop application** that combines the flexibility of web technologies with the performance of native code. It's designed for PPF installation businesses to manage their entire operation from task creation through final customer sign-off.

### Key Capabilities

- **Task Management**: Create, schedule, assign, and track PPF installation tasks
- **Intervention Workflow**: Step-by-step guided workflow for PPF installations
- **Client Management**: Manage customer information and task history
- **Calendar & Scheduling**: Visual calendar with drag-and-drop scheduling
- **Quality Control**: QC dashboards and compliance tracking
- **Inventory Management**: Track materials, suppliers, and inventory levels
- **Reporting**: Generate detailed analytics, geographic, and quality reports
- **Team Management**: Manage users, technicians, and their permissions
- **Audit & Compliance**: Track all changes with full audit logs
- **Offline-First**: Works 100% offline with automatic synchronization

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Task Management** | Full CRUD operations, task statuses (draft, scheduled, in_progress, completed, etc.), priority levels, assignment workflows |
| **PPF Workflow** | Multi-step intervention workflow (Preparation, Inspection, Installation, Finalization) with photo documentation |
| **Photo Management** | Capture, store, and organize photos for each intervention step with metadata and GPS tagging |
| **Calendar System** | Month/Week/Day/Agenda views with drag-and-drop scheduling and conflict detection |
| **Client Portal** | Customer database with task history, statistics, and communication logs |
| **Inventory System** | Material tracking, stock levels, supplier management, usage reporting |
| **Quality Control** | Checkpoints, approval workflows, quality scoring, compliance tracking |
| **Analytics Dashboard** | Real-time KPIs, performance metrics, operational intelligence |
| **Reporting** | Task completion, technician performance, client analytics, geographic distribution, material usage |
| **Team Management** | User accounts, role-based access (Admin, Supervisor, Technician, Viewer) |
| **Two-Factor Authentication** | TOTP-based 2FA with backup codes for enhanced security |
| **Messaging** | Internal messaging system with notification preferences |
| **GPS Tracking** | Technician location tracking with accuracy validation |
| **Signature Capture** | Digital signatures for client sign-off |
| **Audit Trail** | Complete audit logs for compliance and change tracking |
| **Offline Sync** | Persistent queue for offline operations with automatic synchronization |

### Advanced Features

- **Stream Transfer**: Chunked data transfer for large payloads
- **Data Compression**: Automatic Gzip compression for responses > 1KB
- **MessagePack Support**: Binary format for efficient data transfer
- **In-Memory Caching**: Performance optimization with configurable TTL
- **WebSocket Real-time**: Live updates for task/intervention status changes
- **Virtual Scrolling**: Efficient rendering of large data sets
- **Auto-Save**: Automatic form saving with status indicators
- **Internationalization**: Multi-language support architecture
- **Accessibility**: WCAG compliance with keyboard navigation, screen reader support
- **Dark Mode**: Full theme support with high contrast mode

## Technical Stack

### Frontend

| Technology | Version | Purpose |
|-------------|---------|---------|
| **Next.js** | 14.2.0 | React framework with App Router |
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework |
| **Radix UI** | Latest | Accessible component primitives |
| **shadcn/ui** | Latest | UI component library |
| **Zustand** | 5.0.8 | State management |
| **React Query** | 5.90.2 | Server state management |
| **React Hook Form** | 7.64.0 | Form management |
| **Zod** | 4.1.12 | Schema validation |
| **Framer Motion** | 12.23.24 | Animations |
| **Recharts** | 3.3.0 | Data visualization |
| **Leaflet** | 1.9.4 | Maps and geolocation |
| **React Day Picker** | Latest | Calendar component |
| **@hello-pangea/dnd** | Latest | Drag and drop |
| **Sonner** | Latest | Toast notifications |

### Backend

| Technology | Version | Purpose |
|-------------|---------|---------|
| **Rust** | 1.77+ | Backend programming language |
| **Tauri** | 2.1 | Desktop app framework |
| **Tokio** | 1.42 | Async runtime |
| **SQLite** | Latest | Database |
| **rusqlite** | 0.32 | SQLite bindings |
| **r2d2** | Latest | Connection pooling |
| **Serde** | Latest | Serialization |
| **Argon2** | 0.5 | Password hashing |
| **jsonwebtoken** | 9.3 | JWT authentication |
| **totp-rs** | 5.5 | Two-factor authentication |
| **reqwest** | Latest | HTTP client |
| **ts-rs** | Latest | TypeScript type generation |
| **genpdf** | 0.2 | PDF generation |
| **geo** | 0.28 | Geospatial operations |
| **parking_lot** | Latest | Performance primitives |
| **lru** | Latest | LRU cache |

### Build & Tooling

| Tool | Purpose |
|------|---------|
| **Node.js** | >=18.0.0, npm >=9.0.0 |
| **Rust** | 1.77+ |
| **ESLint** | JavaScript/TypeScript linting |
| **Clippy** | Rust linting |
| **Jest** | Unit testing |
| **Playwright** | E2E testing |
| **Criterion** | Rust benchmarking |
| **Tarpaulin** | Test coverage |
| **GitHub Actions** | CI/CD pipeline |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  App Router │  │   Components │  │   Hooks      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   State      │  │  Services    │  │     Utils    │        │
│  │ (Zustand)    │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Tauri IPC Layer  │
                    │   (WebSockets)     │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    Backend (Rust)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Commands    │  │   Services   │  │ Repositories │        │
│  │  (IPC)       │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Models    │  │ Validation   │  │     Cache    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    SQLite Database  │
                    │     (WAL Mode)      │
                    │  + 20+ Tables       │
                    │  + 25+ Indexes      │
                    │  + Triggers         │
                    └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ SendGrid/    │  │   Twilio/    │  │ Google Cloud │        │
│  │ Mailgun      │  │   AWS SNS    │  │   Storage    │        │
│  │ (Email)      │  │  (SMS)       │  │   (Files)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

1. **Layered Architecture**: Frontend → IPC → Commands → Services → Repositories → Database
2. **Repository Pattern**: Consistent data access layer with async operations
3. **Service Facade Pattern**: Orchestrates specialized sub-services
4. **Offline-First**: Sync queue with dependencies and retry logic
5. **Type Safety**: Rust types auto-synced to TypeScript via `ts-rs`
6. **State Management**: Zustand for global state, React Query for server state
7. **Component Organization**: UI components (shadcn/ui) + Feature components
8. **Role-Based Access Control**: Admin/Supervisor/Technician/Viewer

## Project Structure

```
rpma-rust/
├── frontend/                      # Next.js frontend application
│   ├── src/
│   │   ├── app/                   # Next.js App Router (36 pages)
│   │   ├── components/            # React components (190+ files)
│   │   │   ├── ui/               # shadcn/ui components (65 files)
│   │   │   ├── dashboard/        # Dashboard widgets (30+)
│   │   │   ├── tasks/            # Task management (40+)
│   │   │   ├── calendar/         # Calendar components (15+)
│   │   │   └── workflow/         # Workflow components (20+)
│   │   ├── hooks/                 # Custom React hooks (60+)
│   │   ├── lib/                   # Utilities and libraries
│   │   │   ├── ipc/             # IPC client and commands
│   │   │   ├── services/        # Service layer
│   │   │   ├── validation/      # Zod schemas
│   │   │   └── backend.ts       # Auto-generated types (850+ lines)
│   │   ├── types/                 # TypeScript types
│   │   ├── stores/                # Zustand stores (layout, calendar)
│   │   └── constants/             # Constants
│   ├── public/                    # Static assets
│   ├── tailwind.config.ts         # Tailwind configuration
│   └── package.json               # Frontend dependencies
│
├── src-tauri/                     # Rust backend application
│   ├── src/
│   │   ├── commands/              # Tauri IPC handlers (80+ commands)
│   │   │   ├── auth.rs
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── intervention/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── ...
│   │   ├── models/                # Domain models & DTOs (19 files)
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── user.rs
│   │   │   ├── intervention.rs
│   │   │   └── ...
│   │   ├── repositories/          # Data access layer (15 repositories)
│   │   │   ├── task_repository.rs
│   │   │   ├── client_repository.rs
│   │   │   └── ...
│   │   ├── services/              # Business logic layer (50+ services)
│   │   │   ├── task.rs
│   │   │   ├── client.rs
│   │   │   ├── auth.rs
│   │   │   ├── intervention.rs
│   │   │   └── ...
│   │   ├── db/                    # Database management
│   │   │   ├── connection.rs
│   │   │   ├── migrations.rs
│   │   │   └── utils.rs
│   │   ├── logging/               # Logging infrastructure
│   │   ├── sync/                  # Sync engine
│   │   ├── menu/                  # Application menus
│   │   ├── bin/                   # CLI executables
│   │   │   ├── export-types.rs    # TypeScript type generator
│   │   │   └── backfill_client_stats.rs
│   │   ├── main.rs                # Application entry point (418 lines)
│   │   └── lib.rs                 # Library root
│   ├── migrations/                # Database migrations (27 files, 1,360 lines)
│   │   ├── 002_rename_ppf_zone.sql
│   │   ├── 003_add_client_stats_triggers.sql
│   │   ├── ...
│   │   └── 027_add_task_constraints.sql
│   ├── benches/                   # Performance benchmarks
│   ├── tests/                     # Integration tests
│   ├── Cargo.toml                 # Rust dependencies
│   └── tauri.conf.json            # Tauri configuration
│
├── scripts/                       # Build & validation scripts (12 scripts)
│   ├── write-types.js             # Type synchronization
│   ├── validate-types.js          # Type validation
│   ├── check_db.js                # Database inspection
│   ├── test-migrations.js         # Migration testing
│   └── security-audit.js          # Security auditing
│
├── docs/                          # Documentation
│   ├── MIGRATION_SYSTEM_GUIDE.md  # Database migration docs
│   └── SCRIPTS_DOCUMENTATION.md   # Scripts reference
│
├── .github/                       # GitHub configuration
│   └── workflows/
│       └── ci.yml                # CI/CD pipeline
│
├── .env                           # Environment variables
├── package.json                   # Root package.json (monorepo)
├── Cargo.toml                     # Workspace configuration
├── tsconfig.json                  # TypeScript configuration
└── AGENTS.md                      # Project structure documentation
```

## Setup Instructions

### Prerequisites

- **Node.js**: >=18.0.0
- **npm**: >=9.0.0
- **Rust**: 1.77+
- **Git**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rpma-rust
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Sync TypeScript types from Rust**
   ```bash
   npm run types:sync
   ```

### Running the Application

#### Development Mode

```bash
# Start full development environment (recommended)
npm run dev

# Start frontend only
npm run frontend:dev
```

This will:
- Start the Tauri development server
- Launch the Next.js frontend
- Enable hot-reload for both frontend and backend
- Open the application window

#### Production Build

```bash
# Build for production
npm run build

# Run built application
npm run tauri dev
```

### Initial Setup

1. **Bootstrap first admin account**
   - Navigate to `/bootstrap-admin` on first launch
   - Create the initial admin user
   - This user will have full system access

2. **Configure notification services** (optional)
   - Go to Settings → Notifications
   - Configure email provider (SendGrid/Mailgun)
   - Configure SMS provider (Twilio/AWS SNS)

3. **Test database**
   ```bash
   npm run check_db
   ```

### Troubleshooting

#### Common Issues

**Issue**: "Types not found after running types:sync"
- **Solution**: Run `npm run types:validate` to check for errors

**Issue**: "Tauri window not opening"
- **Solution**: Check that all dependencies are installed: `npm install`

**Issue**: "Database migration failed"
- **Solution**: Run `npm run check_db_schema` to inspect the database

## Available Scripts

### Development Scripts

```bash
npm run dev                    # Full dev start (sync types + tauri dev)
npm run frontend:dev          # Next.js dev server only
npm run types:sync            # Sync Rust types to TypeScript
npm run install               # Install dependencies
```

### Build Scripts

```bash
npm run build                 # Production build
npm run frontend:build        # Frontend build only
npm run backend:build         # Rust dev build
npm run backend:build:release  # Rust release build
```

### Type Management Scripts

```bash
npm run types:sync            # Generate TS types from Rust
npm run types:validate        # Validate generated types
npm run types:drift-check     # Check for type drift
npm run types:ci-drift-check  # CI/CD strict drift check
npm run types:generate-docs   # Generate type documentation
npm run ci:validate          # CI validation suite
```

### Quality Assurance Scripts

```bash
npm run frontend:lint        # ESLint check
npm run frontend:type-check   # TypeScript type check
npm run backend:check        # Rust compilation check
npm run backend:clippy       # Rust linting
npm run backend:fmt          # Format Rust code
```

### Performance & Security Scripts

```bash
npm run bundle:analyze       # Analyze bundle size
npm run bundle:check-size    # Check bundle size
npm run performance:test      # Run performance tests
npm run performance:update-baseline  # Update performance baseline
npm run security:audit       # Run security audit
```

### Utility Scripts

```bash
npm run clean                # Clean build artifacts
npm run fix:encoding         # Fix file encoding issues
```

### Frontend Test Scripts

```bash
npm test                     # Run Jest tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:ci             # CI tests
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright UI mode
```

### Database Scripts

```bash
npm run check_db             # Inspect database state
npm run check_db_schema      # Inspect database schema
npm run cleanup_db           # Clean up test data
npm run test-migrations      # Test database migrations
```

### Migration Scripts

```bash
npm run validate-migration-system    # Validate migration system
npm run migration-health-check       # Check migration health
```

## Development Workflow

### Type Synchronization

**Critical**: Types are synchronized between Rust backend and TypeScript frontend.

```bash
# After modifying Rust models, run:
npm run types:sync

# Validate types before committing:
npm run types:validate

# Check CI compliance:
npm run types:ci-drift-check
```

All backend types are auto-generated and stored in `frontend/src/lib/backend.ts`.

### Making Changes

1. **Backend changes**
   ```bash
   # 1. Modify Rust code in src-tauri/src/
   # 2. Sync types if models changed
   npm run types:sync
   # 3. Test backend
   npm run backend:check
   # 4. Test application
   npm run dev
   ```

2. **Frontend changes**
   ```bash
   # 1. Modify React code in frontend/src/
   # 2. Lint and type-check
   npm run frontend:lint
   npm run frontend:type-check
   # 3. Test application
   npm run frontend:dev
   ```

3. **Database changes**
   ```bash
   # 1. Create new migration in src-tauri/migrations/
   # 2. Test migration
   npm run test-migrations
   # 3. Verify schema
   npm run check_db_schema
   ```

### Running Tests

```bash
# Frontend tests
npm test
npm run test:e2e

# Backend tests
cargo test
cargo test --release

# Full CI suite
npm run ci:validate
```

### Code Quality

```bash
# Linting
npm run frontend:lint
npm run backend:clippy

# Formatting
npm run backend:fmt

# Security audit
npm run security:audit
```

## Documentation

For comprehensive documentation, refer to:

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file - Project overview |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Features, user stories, technical constraints |
| [API.md](API.md) | API endpoints, authentication, validation |
| [DATABASE.md](DATABASE.md) | Database schema, relationships, migrations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Folder structure, design patterns, data flows |
| [DEPLOYMENT.md](DEPLOYMENT.md) | CI/CD, build configuration, environment setup |
| [DESIGN.md](DESIGN.md) | UI components, design system, styling |
| [USER-FLOWS.md](USER-FLOWS.md) | User journeys, interface states, workflows |

Additional documentation in `docs/`:

- [MIGRATION_SYSTEM_GUIDE.md](docs/MIGRATION_SYSTEM_GUIDE.md) - Database migration system
- [SCRIPTS_DOCUMENTATION.md](docs/SCRIPTS_DOCUMENTATION.md) - Build scripts reference

## License

[MIT License](LICENSE)

## Support

For issues, questions, or contributions, please refer to the project repository.

---

**RPMA v2** - Built with ❤️ using Next.js, Rust, and Tauri
