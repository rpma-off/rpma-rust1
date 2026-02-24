# 08 - Dev Workflows and Tooling

## Daily commands

From repo root:

```bash
npm run dev
npm run frontend:dev
npm run build
```

Build-only targets:

```bash
npm run frontend:build
npm run backend:build
npm run backend:build:release
```

## Quality gates

```bash
npm run quality:check
npm run frontend:lint
npm run frontend:type-check
npm run backend:check
npm run backend:clippy
npm run backend:fmt -- --check
npm run validate:bounded-contexts
npm run architecture:check
npm run backend:boundaries:check
npm run migration:audit
```

## Tests

Frontend:
```bash
cd frontend && npm test
cd frontend && npm run test:e2e
cd frontend && npm run test:coverage
```

Backend:
```bash
cd src-tauri && cargo test --lib
cd src-tauri && cargo test migration
cd src-tauri && cargo test performance
```

Domain shortcuts are available in `Makefile` (`make test-auth-commands`, `make test-task-commands`, etc.).

## Type and schema tooling

```bash
npm run types:sync
npm run types:validate
npm run types:drift-check
node scripts/validate-migration-system.js
```

Key scripts:
- `scripts/write-types.js`
- `scripts/validate-types.js`
- `scripts/check-type-drift.js`
- `scripts/validate-bounded-contexts.js`
- `scripts/architecture-check.js`
- `scripts/bounded-context-migration-audit.js`
- `scripts/security-audit.js`

## Security and audit tooling

```bash
npm run security:audit
```

Additional checks:
- `scripts/ipc-authorization-audit.js`
- `deny.toml` for Rust dependency policy

## If you change X, run Y

- Rust models exported to TS changed: `npm run types:sync` and `npm run types:drift-check`
- IPC command signatures/handlers changed: `npm run frontend:type-check` + relevant domain tests
- SQL schema/migrations changed: `node scripts/validate-migration-system.js` + `npm run migration:audit`
- Domain boundary/module moves changed: `npm run validate:bounded-contexts` + `npm run architecture:check`
- Auth/RBAC/security logic changed: `npm run security:audit` + targeted auth/audit tests
