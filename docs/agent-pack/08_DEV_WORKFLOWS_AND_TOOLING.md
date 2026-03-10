# Dev Workflows & Tooling

## Running the App Locally

```bash
# Start both frontend and backend (Tauri dev mode)
npm run dev

# Sync types first, then dev
npm run dev:types

# Strict mode: sync types, drift check, then dev
npm run dev:strict

# Frontend only (for UI testing)
npm run frontend:dev

# Build for production
npm run build
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
| **Before commit** | `npm run quality:check` |

---

## Key npm Scripts

### Development
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Tauri dev mode |
| `npm run dev:types` | Sync types, then dev |
| `npm run dev:strict` | Sync, drift-check, then dev |
| `npm run build` | Production build |

### Frontend
| Script | Purpose |
|--------|---------|
| `npm run frontend:dev` | Next.js dev server only |
| `npm run frontend:build` | Build Next.js |
| `npm run frontend:lint` | ESLint check |
| `npm run frontend:type-check` | TypeScript check (tsc) |
| `npm run frontend:encoding-check` | Check file encoding |

### Backend
| Script | Purpose |
|--------|---------|
| `npm run backend:build` | Cargo build |
| `npm run backend:build:release` | Cargo build --release |
| `npm run backend:check` | Cargo check |
| `npm run backend:clippy` | Rust lints |
| `npm run backend:fmt` | Format Rust code |
| `npm run backend:boundaries:check` | Enforce module boundaries |
| `npm run backend:detect-cross-domain` | Detect cross-domain imports |

### Type System
| Script | Purpose |
|--------|---------|
| `npm run types:sync` | Export Rust types to TypeScript |
| `npm run types:validate` | Validate generated types |
| `npm run types:drift-check` | Check for type drift |
| `npm run types:ci-drift-check` | CI drift check |
| `npm run types:watch` | Watch mode for type generation |

### Architecture & Validation
| Script | Purpose |
|--------|---------|
| `npm run architecture:check` | Full architecture check |
| `npm run architecture:check:strict` | Strict architecture check |
| `npm run validate:bounded-contexts` | Validate DDD boundaries |
| `npm run backend:boundaries:check` | Backend module boundaries |
| `npm run migration:audit` | Migration system audit |
| `npm run backend:migration:fresh-db-test` | Test migrations from scratch |

### Security & Quality
| Script | Purpose |
|--------|---------|
| `npm run security:audit` | Run security audit |
| `npm run complexity:enforce` | Enforce complexity rules |
| `npm run maintainability:audit` | Maintainability scoring |
| `npm run quality:check` | Full quality suite |
| `npm run prod:gate` | Production readiness gate |

### IPC Validation
| Script | Purpose |
|--------|---------|
| `npm run ipc:consistency-check` | Check IPC naming consistency |
| `npm run ipc:production-gate` | Production gate for IPC |

---

## Makefile Commands

| Command | Purpose |
|---------|---------|
| `make build` | Cargo build |
| `make test` | Run all Rust tests |
| `make lint` | Clippy with warnings as errors |
| `make format` | Format Rust code |

---

## Scripts Directory (`scripts/`)

### Type Management
| Script | Purpose |
|--------|---------|
| `write-types.js` | TypeScript type generation from Rust |
| `watch-types.js` | Watch mode for type generation |
| `validate-types.js` | Validate generated types |
| `check-type-drift.js` | Rust/TS type drift detection |
| `ci-type-drift-check.js` | CI type drift check |

### Architecture Validation
| Script | Purpose |
|--------|---------|
| `architecture-check.js` | Full architecture validation |
| `backend-architecture-check.js` | Backend-specific checks |
| `validate-bounded-contexts.js` | DDD boundary validation |
| `enforce-backend-module-boundaries.js` | Module boundary enforcement |
| `detect-cross-domain-imports.js` | Cross-domain import detection |
| `anti-spaghetti-guards.js` | Anti-pattern detection |

### IPC & Security
| Script | Purpose |
|--------|---------|
| `ipc-authorization-audit.js` | Verify auth on protected commands |
| `ipc-consistency-check.js` | IPC naming consistency |
| `ipc-production-gate.js` | Production readiness gate |
| `security-audit.js` | Security audit runner |

### Database & Migrations
| Script | Purpose |
|--------|---------|
| `validate-migration-system.js` | Migration system validation |
| `detect-schema-drift.js` | Schema drift detection |
| `test-migrations.js` | Migration testing |
| `migration-health-check.js` | Migration health check |
| `bounded-context-migration-audit.js` | Migration audit |

### Quality & Complexity
| Script | Purpose |
|--------|---------|
| `enforce-complexity-rules.js` | Complexity enforcement |
| `maintainability-audit.js` | Maintainability scoring |
| `check-bundle-size.js` | Bundle size checks |

### Git Workflow
| Script | Purpose |
|--------|---------|
| `git-workflow.js` | Git workflow helpers |

### Utilities
| Script | Purpose |
|--------|---------|
| `fix-encoding.js` | Fix file encoding issues |
| `check-mojibake.js` | Detect encoding problems |

---

## Golden Path: Backend Domain Implementation

When adding a new domain or major feature, follow this "Golden Path" as seen in `interventions` and `tasks`:

1. **Strict Layering**: `IPC` → `Domain Facade` → `Application Service` → `Infrastructure Repository`
2. **Unified Requests**: Use single `Request` structs for IPC commands instead of multiple arguments
3. **Domain Events**: Use the `EventBus` for cross-domain side effects
4. **Thin IPC**: Keep IPC handlers minimal; delegate all logic to the domain facade
5. **Type Safety**: Use `ts-rs` for ALL shared models. Run `npm run types:sync` immediately after changing Rust models

---

## Architecture Review Checklist

Use this checklist during PR reviews to prevent structural regressions:

- [ ] **No Cross-Domain Imports**: Does `domain A` import `domain B`? (Check `npm run validate:bounded-contexts`)
- [ ] **No SQL in Services**: Is there raw SQL outside of `infrastructure/` or migration files?
- [ ] **Thin Handlers**: Do IPC handlers contain business logic or database calls?
- [ ] **Auth Enforcement**: Are all new protected commands using `AuthMiddleware`?
- [ ] **Type Sync**: Are TypeScript bindings up to date? (Check `npm run types:drift-check`)
- [ ] **Audit Logging**: Do sensitive state changes trigger an audit event?
- [ ] **Offline Ready**: Does the new entity have `synced` and `last_synced_at` fields?
- [ ] **Tests**: Are there tests for the new functionality?

---

## Release Process

1. **Commits**: Use Conventional Commits
2. **Hooks**: Husky guards pushes and commits
3. **Quality Gate**: Run `npm run prod:gate`
4. **Build**: `npm run backend:build:release`
5. **Artifacts**: GitHub Actions builds platform-specific bundles
