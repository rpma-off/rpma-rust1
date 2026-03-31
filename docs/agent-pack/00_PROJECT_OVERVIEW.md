# 00 — Project Overview: RPMA v2

RPMA v2 (Resource Planning & Management Application) is an **offline-first desktop application** for planning, executing, and auditing **PPF (Paint Protection Film)** field interventions. It runs as a Tauri desktop client with a Rust backend, Next.js frontend, and SQLite local persistence.

## Primary Users
| Role | Responsibilities |
|------|----------------|
| **Field Technician** | Execute interventions, log steps, upload photos |
| **Supervisor** | Create/assign tasks, manage quotes, schedule via calendar |
| **Administrator** | Manage users, security policies, system configuration |
| **Viewer** | Read-only access to dashboards and reports |

## Core Goals
- **Offline-First**: SQLite WAL is the local source of truth. No remote dependency at runtime.
- **Surgical Accuracy**: Precise tracking of PPF intervention steps and material consumption.
- **Auditability**: Complete history of tasks, interventions, and system changes via domain event audit trail.

## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.1 |
| Backend language | Rust | Edition 2021, min 1.85 |
| Frontend framework | Next.js (App Router) | ^14.2.35 |
| UI runtime | React | ^18.3.1 |
| Frontend language | TypeScript | ^5.3.0 |
| Database | SQLite WAL | via rusqlite + r2d2 (pool max 10) |
| Server state | TanStack Query | ^5.90.2 |
| UI local state | Zustand | ^5.0.8 |
| Styling | Tailwind CSS + shadcn/ui | ^3.4.0 |
| Type generation | ts-rs | 10.1 |

Source of truth: `package.json`, `frontend/package.json`, `src-tauri/Cargo.toml`.

## Backend Bounded Contexts (`src-tauri/src/domains/`)
| Domain | Purpose |
|--------|---------|
| `auth` | Login, session management, rate limiting, audit |
| `users` | User CRUD, RBAC role assignment |
| `clients` | Client CRM, statistics (denormalized via triggers) |
| `tasks` | Task lifecycle, checklists, status transitions |
| `interventions` | PPF workflow execution, photos, step progression |
| `inventory` | Material stock, consumption, low-stock alerts |
| `quotes` | Quote/devis lifecycle, items, PDF export |
| `calendar` | Event scheduling, conflict detection |
| `notifications` | In-app notifications, messaging |
| `documents` | Photo storage, intervention report generation |
| `settings` | App/user/org config — **SQLite-backed since migration 035** |
| `trash` | Soft-delete recycle bin (restore / hard-delete) |
| `rules` | Business rules engine (validation, escalation) |
| `integrations` | Third-party API integration stubs |

## Frontend Bounded Contexts (`frontend/src/domains/`)
Mirrors backend: `auth`, `users`, `clients`, `tasks`, `interventions`, `inventory`, `quotes`, `calendar`, `notifications`, `reports`, `settings`, `admin`, `bootstrap`, `trash`, `rules`, `integrations`, `dashboard`.

## Repository Layout
```
rpma-rust/
├── CLAUDE.md                         # Dev rules + ADR index (mandatory reading)
├── Makefile                          # Backend build/test aliases
├── package.json                      # Root task runner (71 scripts)
├── src-tauri/
│   ├── migrations/                   # 70 numbered SQL migrations (002–070)
│   ├── src/
│   │   ├── main.rs                   # Tauri bootstrap + 100+ command registration
│   │   ├── service_builder.rs        # 26-step service initialization order
│   │   ├── shared/                   # Cross-domain kernel
│   │   └── domains/                  # 14 bounded contexts
│   └── tests/harness/                # TestApp, fixtures, auth contexts
└── frontend/
    ├── src/
    │   ├── app/                      # 18 Next.js App Router routes
    │   ├── domains/                  # 18 frontend feature modules
    │   ├── lib/ipc/                  # safeInvoke, ipcClient singleton, cache
    │   ├── lib/query-keys.ts         # TanStack Query key factories
    │   ├── lib/rbac.ts               # Frontend permission matrix (26 permissions)
    │   └── types/                    # AUTO-GENERATED from ts-rs (never hand-edit)
    └── package.json                  # 36 frontend scripts
```

## Golden Paths
| Question | Document |
|----------|----------|
| Add a feature end-to-end | [04_BACKEND_GUIDE.md](04_BACKEND_GUIDE.md) + [03_FRONTEND_GUIDE.md](03_FRONTEND_GUIDE.md) |
| Which IPC command handles X? | [05_IPC_API_AND_CONTRACTS.md](05_IPC_API_AND_CONTRACTS.md) |
| What tables store Y? How do migrations work? | [07_DATABASE_AND_MIGRATIONS.md](07_DATABASE_AND_MIGRATIONS.md) |
| RBAC roles and enforcement points | [06_SECURITY_AND_RBAC.md](06_SECURITY_AND_RBAC.md) |
| Core entities and business rules | [01_DOMAIN_MODEL.md](01_DOMAIN_MODEL.md) |
| Architecture diagrams and dataflows | [02_ARCHITECTURE_AND_DATAFLOWS.md](02_ARCHITECTURE_AND_DATAFLOWS.md) |
| Dev commands, scripts, CI checklist | [08_DEV_WORKFLOWS_AND_TOOLING.md](08_DEV_WORKFLOWS_AND_TOOLING.md) |
| User flows and UX patterns | [09_USER_FLOWS_AND_UX.md](09_USER_FLOWS_AND_UX.md) |
