# AGENTS.md

## Project Overview

RPMA v2 is an **offline-first desktop application for managing Paint Protection Film (PPF) interventions.

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

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Backend**: Rust with Tauri framework
- **Database**: SQLite with WAL mode
- **State Management**: React hooks, Context API, Zustand
- **Type Safety**: Automatic TypeScript generation from Rust models using `ts-rs`
- **Testing**: Vitest (frontend), Rust built-in tests (backend)


## ARCHITECTURE RULES

### Backend layering

Every backend change inside a domain must respect this order:  
`ipc -> application -> domain -> infrastructure`. 

Layer responsibilities:
- `ipc/`: serialization, auth entry checks, routing, error mapping, command boundary concerns only. 
- `application/`: use cases, orchestration, transaction boundaries, authorization enforcement. 
- `domain/`: core business rules, entities, value objects, validation, no I/O. 
- `infrastructure/`: repositories, SQL, adapters, persistence details. 

Hard constraints:
- Do not put business logic in IPC handlers. 
- Do not access the database from application services except through infrastructure/repository abstractions implied by the domain structure. 
- Do not place SQL outside infrastructure or migration files. 
- Do not introduce I/O into the domain layer. 

### Bounded contexts

Each domain is isolated under `src-tauri/src/domains/<domain>`. 

Hard constraints:
- Do not import another domain’s internals. 
- Cross-domain communication must happen only through approved public interfaces or orchestration paths, not internal module access. 
- New backend features must be added to the owning bounded context, not to unrelated shared folders unless the concern is truly shared. 

### Frontend structure

Frontend code should follow domain-local organization under `frontend/src/domains/<domain>/` and use shared utilities for common patterns. 

Hard constraints:
- Do not manually redefine shared IPC payload shapes when generated types already exist. 
- Prefer existing UI primitives and established UX patterns over custom one-off components. 
- Route backend calls through the project’s IPC wrapper layer, not ad hoc invocation paths. 

---

## IPC RULES

The Tauri IPC boundary is strict and must remain thin. 

For protected commands:
- Require and validate `session_token`. 
- Pass or generate `correlation_id` for traceability.
- Delegate business logic to application services. 
- Return mapped `AppError`/response envelopes consistent with existing patterns. 

Hard constraints:
- Do not add SQL to command handlers. 
- Do not add business rules to command handlers. 
- Do not create alternate auth paths outside the standard middleware/wrapper flow. 

When adding or changing a command:
- Verify whether it is public or protected. 
- Ensure frontend wrapper compatibility with `safeInvoke` conventions, including token handling, correlation handling, and timeout behavior. 
- Preserve stable command naming unless a breaking change is explicitly required. 

---


## CHANGE STRATEGY

For every task, follow this sequence:

1. Identify the owning domain.
2. Identify the correct layer(s) to change.
3. Make the smallest safe implementation.
4. Reuse existing patterns before introducing new abstractions.
5. Update tests for the impacted behavior.
6. Run the smallest relevant validation set.
7. Report what changed, what was validated, and any unresolved risks.

Preferred approach:
- Favor narrow, local edits.
- Preserve public contracts unless change is required.
- Avoid unrelated refactors in the same task.
- Avoid moving files unless necessary.

If the request conflicts with architecture or security rules, do not implement the shortcut.  
Implement the compliant version or explicitly report why the request is unsafe.

---

## REQUIRED TASK PLAYBOOKS

### If changing Rust models
Run:
- `npm run types:sync`
- `npm run types:validate`
- `npm run types:drift-check`

### If changing domain boundaries or backend structure
Run:
- `npm run validate:bounded-contexts`
- `npm run architecture:check`

### If adding or modifying IPC commands
Do all of the following:
- preserve thin-handler design, 
- verify auth and RBAC behavior, 
- verify wrapper compatibility and public/protected command handling, 
- run `node scripts/ipc-authorization-audit.js` if available in the repo docs. 

### If changing database schema or migrations
Run:
- `node scripts/validate-migration-system.js`
- impacted backend tests
- type regeneration if shared contracts are affected

### If fixing a bug
Add or update at least one regression test.

### If adding a feature
Cover:
- success path,
- validation failure,
- permission failure for protected behavior.

---

## TESTING RULES

Testing is mandatory for behavior changes.

Required behavior:
- Add regression coverage for bug fixes.
- Add positive and negative coverage for new features.
- Prefer deterministic tests.
- Keep tests aligned with owning domain boundaries.

Hard constraints:
- Do not delete or weaken tests to make a build pass.
- Do not rely on flaky timing behavior.
- Do not leave permission-sensitive behavior untested when access control is part of the feature.

---

## FORBIDDEN ACTIONS

Never do any of the following:
- manually edit generated type files, 
- place business logic in IPC handlers, 
- place SQL outside infrastructure or migrations, 
- import another domain’s internals,
- bypass session validation on protected commands, 
- bypass RBAC for convenience, 
- disable linting, type checks, architecture checks, or security checks to get a green result,
- weaken tests or remove failing coverage without explicit justification,
- introduce unrelated refactors into a targeted task,
- claim a feature, command, or auth behavior exists without verifying it in the repository.

---

## MINIMUM VALIDATION MATRIX

Run the smallest relevant subset based on touched files.

Frontend:
- `npm run frontend:lint`
- `npm run frontend:type-check`

Backend:
- `npm run backend:check`
- `npm run backend:clippy`
- `npm run backend:fmt`

Architecture:
- `npm run validate:bounded-contexts`
- `npm run architecture:check`

Types:
- `npm run types:sync`
- `npm run types:validate`
- `npm run types:drift-check`

Security:
- `npm run security:audit`

Migrations:
- `node scripts/validate-migration-system.js`

Tests:
- relevant unit tests,
- relevant domain tests,
- relevant integration tests,
- migration/performance tests when impacted.

## WHEN IN DOUBT
If a requirement conflicts with an architecture rule, or if the correct 
pattern is ambiguous, implement the most conservative compliant option 
and explicitly document the ambiguity in your response. Do not silently 
pick an approach. OR check :
- **Full docs**: `docs/agent-pack/README.md`
- **Architecture decisions**: `docs/adr/`
---

