# RPMA v2 - Project Overview

## What is RPMA v2?
RPMA v2 is an **offline-first desktop application** designed for managing Paint Protection Film (PPF) interventions. It serves as the single source of truth for technicians and managers to handle tasks, workflow steps, photo management, inventory, reporting, and secure user sessions with role-based access control (RBAC). The application prioritizes robust offline capability, ensuring field and workshop reliability even without continuous connectivity.

## Technology Stack
- **Architecture Flow**: Frontend (Next.js) <-> IPC Bridge (Tauri) <-> Backend (Rust) <-> Database (SQLite)
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Rust 1.85+, Tauri 2.1 framework.
- **Database**: SQLite with WAL mode (via `rusqlite` and `r2d2` pooling) for high-concurrency local storage.
- **State Management & Caching**: Zustand, React Query, Context API.
- **Auth**: JWT tokens (with optional 2FA support), hashed with Argon2.
- **Type Safety**: Automatic generation of TypeScript types from Rust models using `ts-rs`.

## Core Bounded Contexts (Domains)
The repository enforces Domain-Driven Design (DDD). Cross-domain access is strictly forbidden except through public interfaces.
- **`tasks`**: Work order creation, assignment, and status tracking.
- **`interventions`**: The heart of the app—PPF execution lifecycle, step-by-step workflows, and photo logging.
- **`inventory`**: Tracking materials consumed during interventions.
- **`users` / `auth`**: Authentication, session management, and RBAC.
- **`quotes`**: Creation and estimation of PPF jobs.
- **`calendar`**: Scheduling and timeline overviews.
- **`clients`**: Customer profiles and histories.
- **`reports` / `audit`**: Business intelligence and audit trails for compliance.
- **`documents` / `settings` / `sync`**: Supporting subdomains for files, config, and potential sync capabilities.

## Golden Paths (Where to Look Next)
To understand specific areas of the application, follow these guides:
- [Domain Model (01_DOMAIN_MODEL.md)](./01_DOMAIN_MODEL.md)
- [Architecture & Dataflows (02_ARCHITECTURE_AND_DATAFLOWS.md)](./02_ARCHITECTURE_AND_DATAFLOWS.md)
- [Frontend Guide (03_FRONTEND_GUIDE.md)](./03_FRONTEND_GUIDE.md)
- [Backend Guide (04_BACKEND_GUIDE.md)](./04_BACKEND_GUIDE.md)
- [IPC API & Contracts (05_IPC_API_AND_CONTRACTS.md)](./05_IPC_API_AND_CONTRACTS.md)
- [Security & RBAC (06_SECURITY_AND_RBAC.md)](./06_SECURITY_AND_RBAC.md)
- [Database & Migrations (07_DATABASE_AND_MIGRATIONS.md)](./07_DATABASE_AND_MIGRATIONS.md)
- [Dev Workflows & Tooling (08_DEV_WORKFLOWS_AND_TOOLING.md)](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- [User Flows & UX (09_USER_FLOWS_AND_UX.md)](./09_USER_FLOWS_AND_UX.md)
