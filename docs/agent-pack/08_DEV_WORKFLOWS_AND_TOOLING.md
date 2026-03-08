# Dev Workflows & Tooling

## Running the App Locally

```bash
# Start both frontend and backend (Tauri dev mode)
npm run dev

# Sync types first, then dev
npm run dev:types

# Frontend only (for UI testing)
npm run frontend:dev
```

---

## "If you change X, run Y" Checklist

| Change | Required Command |
|--------|------------------|
| **Rust Model** (`#[derive(TS)]`) | `npm run types:sync` |
| **Cross-domain imports** | `npm run validate:bounded-contexts` |
| **Backend feature** | `npm run architecture:check` |
| **IPC Command** | `node scripts/ipc-authorization-audit.js` |
| **SQL Migration** | `node scripts/validate-migration-system.js` |
| **Frontend code** | `npm run frontend:lint` + `npm run frontend:type-check` |
| **Rust code** | `npm run backend:check` + `npm run backend:clippy` |

---

## Key npm Scripts

### Development
- `npm run dev`: Start Tauri dev mode
- `npm run dev:types`: Sync types, then dev

### Frontend
- `npm run frontend:lint`: ESLint check
- `npm run frontend:type-check`: TypeScript check (tsc)

### Backend
- `npm run backend:check`: Cargo check
- `npm run backend:clippy`: Rust lints
- `npm run backend:fmt`: Format Rust code

### Type System
- `npm run types:sync`: Export Rust types to TypeScript
- `npm run types:validate`: Validate generated types
- `npm run types:drift-check`: Check for type drift

### Architecture & Validation
- `npm run architecture:check`: Full architecture check
- `npm run validate:bounded-contexts`: Validate DDD boundaries
- `npm run backend:boundaries:check`: Enforce module boundaries

### Security & Quality
- `npm run security:audit`: Run security audit
- `npm run complexity:enforce`: Enforce complexity rules
- `npm run maintainability:audit`: Maintainability scoring
- `npm run ipc:consistency-check`: Check IPC naming consistency

---

## Makefile Commands

- `make build`: Cargo build
- `make test`: Run all Rust tests
- `make lint`: Clippy with warnings as errors
- `make format`: Format Rust code

---

## Scripts Directory (`scripts/`)

- `write-types.js`: TypeScript type generation from Rust
- `validate-bounded-contexts.js`: DDD boundary validation
- `architecture-check.js`: Full architecture validation
- `ipc-authorization-audit.js`: Verify auth on protected commands
- `validate-migration-system.js`: Migration system validation
- `security-audit.js`: Security audit runner
- `check-type-drift.js`: Rust/TS type drift detection

---

## Frontend Testing

```bash
cd frontend
npm run test           # Jest tests
npm run test:e2e       # Playwright E2E tests
```

---

## Release Process

1. **Commits**: Use Conventional Commits.
2. **Hooks**: Husky guards pushes and commits.
3. **Build**: `npm run backend:build:release`.
4. **Artifacts**: GitHub Actions builds platform-specific bundles.
