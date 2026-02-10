# AGENTS.md 

RPMA v2 is an offline-first desktop app (Tauri) for managing PPF interventions: tasks, interventions, steps, photos, inventory, reporting, and user management.


## 🗂️ Structure du Projet

```
rpma-rust/
├── frontend/                 # Application Next.js
│   ├── src/
│   │   ├── app/             # Pages App Router
│   │   ├── components/      # Composants React
│   │   ├── hooks/           # Hooks personnalisés
│   │   ├── lib/             # Utilitaires et IPC
│   │   ├── types/           # Types TypeScript
│   │   └── ui/              # Composants shadcn/ui
│   └── package.json
├── src-tauri/               # Application Rust
│   ├── src/
│   │   ├── commands/        # Commandes Tauri IPC
│   │   ├── models/          # Modèles de données
│   │   ├── repositories/    # Accès aux données
│   │   ├── services/        # Logique métier
│   │   └── db/              # Gestion base de données
│   └── Cargo.toml
├── migrations/              # Migrations de base de données
├── scripts/                 # Scripts de build et validation
└── docs/                    # Documentation
```

## Tech Stack Summary

- **Desktop Framework**: Tauri (Rust + system webview)
- **Frontend**: Next.js 14 with React, TypeScript, and Tailwind CSS
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Backend**: Rust with SQLite (WAL mode) for data persistence
- **State Management**: React hooks with contexts and Zustand for global state
- **Authentication**: JWT with 2FA support and role-based access control
- **Type Safety**: Automatic TypeScript generation from Rust models using `ts-rs`

## Essential Commands

# Start development (recommended)
npm run dev

# Frontend only
npm run frontend:dev

# Build for production
npm run build

# Type checking
npm run frontend:type-check

# Linting
npm run frontend:lint

# Type sync (Rust → TypeScript)
npm run types:sync

## Critical consistency rules
- Rust models => TS types via ts-rs. Never drift.
- IPC commands must be authenticated for protected endpoints (session_token) and follow the response envelope pattern.
- RBAC must be enforced in command handlers and data access.

## Where to look
- Frontend patterns: `frontend/src/app`, `frontend/src/components`, `frontend/src/lib/ipc`
- Backend patterns: `src-tauri/src/commands`, `src-tauri/src/services`, `src-tauri/src/repositories`
- DB + migrations: `src-tauri/migrations`, migration manager code
- Security/RBAC: auth commands, validators, scripts

## ARCHITECTURE MUST MATCH PROJECT DOCS
- 4-layer architecture: Frontend -> IPC -> Rust Services -> Repositories -> SQLite. Keep responsibilities separated.
- Offline-first: local DB is source-of-truth; avoid designs that require constant network connectivity.
- Types: Rust models generate TS types (ts-rs). Never hand-edit generated types.

## QUALITY GATES (RUN THE RIGHT ONES)
When relevant:
- Frontend: `npm run frontend:lint` and `npm run frontend:type-check`
- Backend: `npm run backend:check`, `npm run backend:clippy`, `npm run backend:fmt`
- Types: `npm run types:sync`, `npm run types:validate`, `npm run types:drift-check`
- DB/migrations: `node scripts/validate-migration-system.js`
- Security: `npm run security:audit`, `node scripts/validate-rbac.js`, `node scripts/validate-session-security.js`
- Full: `npm run quality:check` (preferred)

## CHANGE RULES (STRICT)
- Any new feature must include: tests, validation, error handling, and docs update (if user-facing).
- Never leave TODOs, “quick hacks”, or commented-out code.
- Prefer deterministic behavior; avoid time-based flakiness in tests.
- Keep diffs small and reviewable.


## DEFAULT WORKFLOW (ALWAYS)
A) Locate the relevant files + existing patterns. Prefer copying existing patterns over inventing new ones.
B) Make the smallest possible change that solves the task.
C) Run the appropriate checks (see "Quality Gates").
D) Summarize what changed + why + how to verify.

# Testing Rules (Strict)

## When you change code
You must add or update tests that prove the change.

## Backend
- Unit tests for services and repositories when logic changes.
- Integration tests for IPC commands where behavior is critical.

## Frontend
- Component tests for UI flows when UX behavior changes.
- Hook tests if business logic is in hooks.

## Test quality
- No flaky tests.
- Prefer deterministic time and stable fixtures.
- Keep tests fast, focused, and readable.

## Minimum bar
- Every bug fix requires a regression test.
- Every new feature requires tests for:
  - success path
  - validation failure
  - permission failure (if protected)
