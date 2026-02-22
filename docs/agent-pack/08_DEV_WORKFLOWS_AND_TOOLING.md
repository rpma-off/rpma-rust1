# 08 - Dev Workflows and Tooling

## Daily commands

From repo root:

```bash
npm run dev
npm run frontend:dev
npm run build
```

Quality gates:

```bash
npm run quality:check
npm run frontend:lint
npm run frontend:type-check
npm run backend:check
npm run backend:clippy
npm run backend:fmt -- --check
npm run validate:bounded-contexts
npm run architecture:check
npm run migration:audit
```

## Tests

Frontend:
```bash
cd frontend && npm test
cd frontend && npm run test:e2e
```

Backend:
```bash
cd src-tauri && cargo test --lib
```

Domain shortcuts are available in `Makefile` (`test-auth-commands`, `test-task-commands`, etc.).

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
- `scripts/security-audit.js`
- `scripts/bounded-context-migration-audit.js`

## Security and audit tooling

```bash
npm run security:audit
```

Additional checks:
- `scripts/ipc-authorization-audit.js`
- `deny.toml` for Rust dependency policy

## If you change X, run Y

- Rust models exported to TS changed -> `npm run types:sync && npm run types:drift-check`
- IPC command signatures/handlers changed -> `npm run frontend:type-check` + relevant domain tests
- SQL schema/migrations changed -> `node scripts/validate-migration-system.js` + `npm run migration:audit`
- Domain boundary/module moves changed -> `npm run validate:bounded-contexts && npm run architecture:check`
- Auth/RBAC/security logic changed -> `npm run security:audit` + targeted auth/audit tests

## CI note

Current CI pipeline failures may come from existing frontend test-suite issues unrelated to docs. Use workflow/job logs in GitHub Actions for exact failing suites.
