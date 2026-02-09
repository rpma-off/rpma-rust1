# AGENTS.md 

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
## Architecture

```
┌─────────────────┐
│ Next.js (React) │  ← Presentation Layer
├─────────────────┤
│   Tauri IPC     │  ← Communication Layer
├─────────────────┤
│ Rust Services   │  ← Business Logic
├─────────────────┤
│ SQLite Database │  ← Data Layer
└─────────────────┘
```
## 📜 Scripts Disponibles

### Scripts Principaux
- `npm run dev` - Démarrage en mode développement
- `npm run build` - Build de production
- `npm run tauri dev` - Développement Tauri uniquement

### Scripts Frontend
- `npm run frontend:dev` - Serveur de développement Next.js
- `npm run frontend:build` - Build frontend
- `npm run frontend:lint` - Linting du code frontend
- `npm run frontend:type-check` - Vérification des types TypeScript

### Scripts Backend
- `npm run backend:build` - Build Rust en mode debug
- `npm run backend:build:release` - Build Rust en mode release
- `npm run backend:check` - Vérification du code Rust
- `npm run backend:clippy` - Analyse avec Clippy
- `npm run backend:fmt` - Formatage du code Rust

### Synchronisation des Types
- `npm run types:sync` - Synchroniser les types Rust → TypeScript
- `npm run types:validate` - Valider la synchronisation des types
- `npm run types:drift-check` - Détecter les divergences de types
- `npm run types:ci-drift-check` - Vérification CI des types

### Tests et Qualité
- `npm run test` - Lancer les tests unitaires
- `npm run test:coverage` - Tests avec couverture
- `npm run test:e2e` - Tests end-to-end
- `npm run security:audit` - Audit de sécurité
- `npm run performance:test` - Tests de performance

### Utilitaires
- `npm run clean` - Nettoyer les builds et node_modules
- `npm run git:start-feature` - Démarrer une nouvelle branche de fonctionnalité
- `npm run fix:encoding` - Corriger les problèmes d'encodage

## Quick Start for AI Agents

### To understand the project quickly:
1. Start with [00_PROJECT_OVERVIEW.md](00_PROJECT_OVERVIEW.md) for high-level context
2. Read [01_DOMAIN_MODEL.md](01_DOMAIN_MODEL.md) to understand the data model
3. Review [02_ARCHITECTURE_AND_DATAFLOWS.md](02_ARCHITECTURE_AND_DATAFLOWS.md) for technical architecture
4. Check [08_DEV_WORKFLOWS_AND_TOOLING.md](08_DEV_WORKFLOWS_AND_TOOLING.md) for development practices

### For specific tasks:
- **Adding a new feature**: Read [03_FRONTEND_GUIDE.md](03_FRONTEND_GUIDE.md) and [04_BACKEND_GUIDE.md](04_BACKEND_GUIDE.md)
- **Working with the API**: Read [05_IPC_API_AND_CONTRACTS.md](05_IPC_API_AND_CONTRACTS.md)
- **Database changes**: Read [07_DATABASE_AND_MIGRATIONS.md](07_DATABASE_AND_MIGRATIONS.md)
- **Security/permissions**: Read [06_SECURITY_AND_RBAC.md](06_SECURITY_AND_RBAC.md)
- **UI/UX changes**: Read [09_USER_FLOWS_AND_UX.md](09_USER_FLOWS_AND_UX.md)



### Code Patterns
- **Frontend**: Use shadcn/ui components with Tailwind classes
- **Backend**: Follow command→service→repository pattern
- **Authentication**: All protected commands need `session_token`
- **Type Safety**: Never edit `frontend/src/lib/backend.ts` (generated)

### Important Paths
- Frontend root: `frontend/src/app/`
- IPC client: `frontend/src/lib/ipc/`
- Backend commands: `src-tauri/src/commands/`
- Models: `src-tauri/src/models/`
- Migrations: `src-tauri/migrations/`

## Acceptance Criteria

An agent that has thoroughly reviewed these files should be able to:

✅ Answer "Where do I add a new feature?"  
✅ Identify "Which command handles X?"  
✅ Locate "What tables store Y?"  
✅ Understand "What are the business rules?"  
✅ Follow development patterns consistently  
✅ Navigate the codebase efficiently  
✅ Avoid common pitfalls  
✅ Run appropriate validation commands

## Commandes d'Exécution des Tests

### Backend Tests
```bash
# Run all backend tests
cd src-tauri && cargo test

# Run specific test modules
cd src-tauri && cargo test auth_service
cd src-tauri && cargo test task_validation
cd src-tauri && cargo test intervention_workflow
```

### Frontend Tests
```bash
# Run all frontend tests
cd frontend && npm test

# Run specific test patterns
cd frontend && npm test -- --testNamePattern="auth"
cd frontend && npm test -- --testNamePattern="tasks"
cd frontend && npm test -- --testNamePattern="intervention"
```

### E2E Tests
```bash
# Run all e2e tests
cd frontend && npm run test:e2e

# Run specific e2e tests
cd frontend && npm run test:e2e -- --grep="Authentication"
cd frontend && npm run test:e2e -- --grep="Task Management"
```

### Coverage Reports
```bash
# Backend coverage (if configured)
cd src-tauri && cargo llvm-cov

# Frontend coverage
cd frontend && npm run test:coverage
```