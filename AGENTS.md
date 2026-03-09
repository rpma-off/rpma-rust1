# AGENTS.md

Stack:
- Frontend: Next.js 14, React 18, TypeScript, Tailwind, shadcn/ui
- Backend: Rust + Tauri
- Database: SQLite (WAL)
- Types: Rust models exported to TypeScript via ts-rs

## 📁 Project Structure

```
rpma-rust1/
├── frontend/                    # Next.js 14 App
│   ├── src/
│   │   ├── app/                 # App Router pages (~38 pages)
│   │   ├── components/          # Shared React components (179+)
│   │   ├── domains/             # Feature domains (auth, interventions, inventory, tasks)
│   │   │   └── [domain]/
│   │   │       ├── api/         # Public API surface for the domain
│   │   │       ├── components/  # Domain-specific components
│   │   │       ├── hooks/       # Domain-specific hooks
│   │   │       ├── ipc/         # IPC call wrappers
│   │   │       └── services/    # Frontend business logic
│   │   ├── hooks/               # Shared custom hooks (63+)
│   │   ├── lib/                 # Utilities and IPC client (20 domain modules)
│   │   ├── shared/              # Shared utils, types, UI primitives
│   │   └── types/               # ⚠️ AUTO-GENERATED — DO NOT EDIT MANUALLY
│   └── package.json
│
├── src-tauri/                   # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/            # 65 IPC command handlers
│   │   ├── domains/             # Bounded contexts (DDD)
│   │   │   └── [domain]/
│   │   │       ├── application/ # Use cases / application services
│   │   │       ├── domain/      # Domain models, value objects, rules
│   │   │       ├── infrastructure/ # SQL repositories, external adapters
│   │   │       ├── ipc/         # Tauri command entry points
│   │   │       └── tests/       # Domain tests
│   │   ├── models/              # 21 data models (ts-rs exports)
│   │   ├── repositories/        # 20 repository files
│   │   ├── services/            # 88 service files
│   │   ├── shared/              # Shared backend utilities, errors
│   │   └── db/                  # Database init, pool, migrations
│   ├── migrations/              # Embedded SQLite migrations
│   ├── benches/                 # Criterion benchmarks
│   ├── tests/                   # Integration test suites
│   │   ├── auth_commands_test.rs
│   │   ├── client_commands_test.rs
│   │   ├── intervention_commands_test.rs
│   │   ├── task_commands_test.rs
│   │   └── user_commands_test.rs
│   └── Cargo.toml
│
├── migrations/                  # Root-level SQL migration files (6 files)
├── migration-tests/             # Migration validation tests
├── scripts/                     # Build, validation, and utility scripts
├── docs/                        # Project documentation
│   ├── adr/                     # Architectural Decision Records
│   └── agent-pack/              # Agent documentation pack
├── Makefile                     # Shorthand commands (see below)
├── package.json                 # Root package.json (npm workspaces)
├── Cargo.toml                   # Workspace root
├── deny.toml                    # cargo-deny security config
├── commitlint.config.js         # Conventional commit rules
└── tsconfig.json
```

Core architecture:
- Backend domains follow strict layering: `ipc -> application -> domain -> infrastructure`
- Frontend code should stay organized by domain under `frontend/src/domains/<domain>/`
- Cross-domain backend internals are private; use only approved public interfaces

## Commands

Use the real command surfaces below; do not invent a root `npm run test` shortcut.

- **App / dev:** `npm run dev`, `npm run dev:types`, `npm run frontend:dev`

- **Frontend checks:** `npm run frontend:lint`, `npm run frontend:type-check`, `cd frontend && npm run test:ci`, `cd frontend && npm run test:e2e`

- **Backend checks:** `npm run backend:check`, `npm run backend:clippy`, `npm run backend:fmt`, `make test`, `cd src-tauri && cargo test --test <target>`

- **Types:** `npm run types:sync`, `npm run types:validate`, `npm run types:drift-check`, `npm run types:watch`

- **Architecture / security:** `npm run validate:bounded-contexts`, `npm run architecture:check`, `npm run backend:boundaries:check`, `node scripts/ipc-authorization-audit.js`, `npm run ipc:consistency-check`, `npm run security:audit`

- **Database / migrations:** `node scripts/validate-migration-system.js`, `node scripts/detect-schema-drift.js`, `npm run backend:migration:fresh-db-test`


## Non-negotiable rules

Never:
- Edit generated type files manually.
- Put business logic in IPC handlers.
- Put SQL outside infrastructure or migration files.
- Import another backend domain’s internals.
- Bypass session validation or RBAC on protected commands.
- Use ad hoc frontend-backend calls when the project IPC wrapper pattern exists.
- Disable checks, weaken tests, or remove coverage just to get green CI.
- Make unrelated refactors during a focused task.
- Claim behavior exists without verifying it in the repository.

Always:
- Make the smallest safe change.
- Reuse an existing local pattern before creating a new abstraction.
- Keep public contracts stable unless the task explicitly requires change.
- Add or update tests for every behavior change.
- Report exactly what changed, what was validated, and what remains uncertain.

## Backend rules

Respect this layer order for all backend changes:
`ipc -> application -> domain -> infrastructure`

Layer responsibilities:
- `ipc/`: command boundary only; serialization, auth entry checks, routing, error mapping
- `application/`: use cases, orchestration, transactions, authorization enforcement
- `domain/`: business rules, entities, value objects, validation, no I/O
- `infrastructure/`: repositories, SQL, persistence, external adapters

Hard constraints:
- IPC handlers must stay thin.
- Application code must not execute raw SQL directly.
- Domain code must not perform I/O.
- New backend behavior belongs in the owning bounded context.

## Frontend rules

Use domain-local organization under `frontend/src/domains/<domain>/` where possible.

Hard constraints:
- Do not manually redefine payload types if generated types already exist.
- Prefer existing shared UI primitives and established UX patterns.
- Route backend calls through the project IPC wrapper layer.
- Do not introduce direct `invoke()` usage in new code unless that exact area already uses an approved alternative pattern.

## IPC rules

The Tauri IPC boundary is strict and thin.

For protected commands:
- Require and validate `session_token`
- Pass or generate `correlation_id`
- Delegate logic to application services
- Return responses/errors consistent with existing `AppError` and wrapper conventions

When adding or changing a command:
- Verify whether it is public or protected
- Preserve command naming unless a breaking change is required
- Verify frontend wrapper compatibility, including token handling, correlation handling, and timeouts
- Verify auth and RBAC behavior end to end

## Required task workflow

Before editing:
1. Identify the owning domain.
2. Identify the exact files likely to change.
3. Identify the existing pattern/file to imitate.
4. State whether the task touches IPC, auth, schema, generated types, or domain boundaries.
5. State the minimal validation plan.

Implementation:
1. Make the smallest safe change.
2. Reuse existing patterns.
3. Avoid unrelated cleanup/refactors.
4. If the request conflicts with architecture or security rules, do not implement the shortcut; implement the compliant version or explain why it is unsafe.

After editing:
1. Update tests for impacted behavior.
2. Run the smallest relevant validation set.
3. Report changed files, validation run, and unresolved risks.

## Required test policy

Testing is mandatory for behavior changes.

Minimum expectations:
- Bug fix: add or update at least one regression test
- New feature: cover success path, validation failure, and permission failure when protected
- Prefer deterministic tests
- Keep tests in the owning domain where possible

Never:
- Delete or weaken tests to make a build pass
- Leave permission-sensitive behavior untested when access control is part of the change

Tests:
- relevant unit tests
- relevant domain tests
- relevant integration tests
- migration/performance tests when impacted

Task-specific requirements:
- Rust model changes: run all type sync/validation/drift commands
- Domain boundary/backend structure changes: run bounded-context + architecture checks
- IPC changes: verify thin handlers, auth/RBAC, wrapper compatibility, and run `node scripts/ipc-authorization-audit.js` if available
- Schema/migration changes: run migration validation, impacted backend tests, and regenerate types if contracts changed


## When unsure

If a requirement is ambiguous or conflicts with architecture rules, choose the most conservative compliant option and explicitly say so.

when unsure check docs:
- `docs/agent-pack/README.md`
- `docs/adr/`
