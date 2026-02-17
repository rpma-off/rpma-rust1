# AGENTS.md 

## Project Overview

RPMA v2 is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions. The application handles tasks, interventions, workflow steps, photo management, inventory tracking, reporting, and user management with role-based access control.

## 📁 Project Structure

```
rpma-rust/
├── frontend/                 # Next.js 14 application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # 260+ React components
│   │   ├── hooks/           # 67 custom hooks
│   │   ├── lib/             # Utilities and IPC client (19 domain modules)
│   │   ├── types/           # TypeScript type definitions (auto-generated from Rust)
│   │   └── ui/              # shadcn/ui components
│   └── package.json
├── src-tauri/               # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/        # 65 IPC command files
│   │   ├── models/          # 21 data models with ts-rs exports
│   │   ├── repositories/    # 20 repository files
│   │   ├── services/        # 88 service files
│   │   └── db/              # Database management
│   └── Cargo.toml
├── migrations/              # SQLite migrations
├── scripts/                 # Build and validation scripts
└── docs/                    # Project documentation
```

## 🏗️ Architecture

### Four-Layer Architecture
```
Frontend (Next.js/React/TypeScript)
    ↓ IPC calls
Tauri Commands (Rust)
    ↓
Services (Business Logic - Rust)
    ↓
Repositories (Data Access - Rust)
    ↓
SQLite Database (WAL mode)
```

## 📋 Essential Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run frontend:dev           # Frontend only (Next.js)

# Building
npm run build                  # Production build
npm run frontend:build         # Build frontend only
npm run backend:build          # Build backend only (Cargo)
npm run backend:build:release  # Build backend release version

# Quality check (RECOMMENDED)
npm run quality:check          # Run all quality checks

# Linting/Type-checking
npm run frontend:lint          # ESLint
npm run frontend:type-check    # TypeScript checking
npm run backend:check          # Cargo check
npm run backend:clippy         # Rust linting
npm run backend:fmt            # Rust formatting

# Type Management
npm run types:sync             # Regenerate TS types from Rust
npm run types:validate         # Validate type consistency
npm run types:drift-check      # Check for type drift

# Testing
cd frontend && npm test        # Run frontend tests
cd frontend && npm run test:e2e # Run E2E tests with Playwright
cd frontend && npm run test:coverage # Run tests with coverage

# Security & Validation
npm run security:audit         # Security vulnerability scan
node scripts/validate-migration-system.js  # Migration validation


## ✅ Test Gates

Run these tests before submitting code:

```bash
# All backend tests (Rust)
cd src-tauri && cargo test --lib

# Database migration tests
cd src-tauri && cargo test migration

# Performance tests
cd src-tauri && cargo test performance

# Frontend tests (TypeScript/React)
cd frontend && npm test

# E2E tests with Playwright
cd frontend && npm run test:e2e

# Code coverage
cd frontend && npm run test:coverage
```

### Frontend
```bash
npm run frontend:lint          # Must pass
npm run frontend:type-check    # Must pass
```

### Backend
```bash
npm run backend:check          # Must pass
npm run backend:clippy         # Must pass
npm run backend:fmt            # Must pass
```

### Types
```bash
npm run types:sync             # Regenerate
npm run types:validate         # Must pass
npm run types:drift-check      # Must pass
```

### Security
```bash
npm run security:audit         # Must pass
```


## 🧪 Testing Requirements

### When to Add Tests
- **Always** when adding new features
- **Always** when fixing bugs (regression tests)
- **Always** when changing business logic

### Test Types
- **Unit tests**: For services and repositories (backend), hooks (frontend)
- **Integration tests**: For IPC commands and critical workflows
- **Component tests**: For UI components with complex logic
- **E2E tests**: For critical user flows

### Test Quality Standards
- No flaky tests - tests must be deterministic
- Use stable fixtures, avoid time-based dependencies
- Keep tests fast, focused, and readable
- Test success path AND error conditions

### Minimum Coverage
- Every bug fix requires a regression test
- Every new feature requires tests for:
  - ✅ Success path
  - ❌ Validation failures
  - 🔒 Permission failures (for protected features)

## 📚 Additional Resources

- **DOCUMENTATION**: See `docs\agent-pack\README.md` for detailed documentation about our project
- **ADR**: See `docs\ADR` for architectural decision records