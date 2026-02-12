# Agent Onboarding Pack - RPMA v2

Welcome! This directory contains **10 high-signal documentation files** designed to help AI agents quickly and accurately understand the RPMA v2 project.

## 🎯 Purpose

These documents enable an AI agent to:
- Understand the project's architecture, domain model, and design patterns
- Locate critical code paths and entry points
- Navigate the codebase efficiently
- Make informed changes without breaking existing functionality
- Follow established conventions and best practices

---

## 📚 Documentation Index

Read the documents in this order for fastest onboarding:

### 1. **[00_PROJECT_OVERVIEW.md](./00_PROJECT_OVERVIEW.md)** ⭐ START HERE
High-level introduction to RPMA v2, tech stack, architecture, and "golden paths" for AI agents.

**Read this first** to get oriented.

**Key topics**:
- What is RPMA v2?
- Tech stack (Tauri, Next.js, SQLite)
- Four-layer architecture
- Project structure
- Core principles (offline-first, type safety, RBAC)

---

### 2. **[01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)**
Complete reference of all business entities, their relationships, lifecycles, and database mappings.

**Key topics**:
- Entity relationship diagram
- 10 core entities (Task, Client, Intervention, etc.)
- Field-level documentation
- Domain rules and constraints
- Table names and indexes

---

### 3. **[02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)**
Detailed architecture documentation with step-by-step data flow diagrams for core workflows.

**Key topics**:
- Layered architecture (Frontend → Command → Service → Repository → DB)
- Visual data flow diagrams (Task creation, Intervention workflow, etc.)
- Offline-first + sync queue design
- Event bus for side effects
- Transaction management

---

### 4. **[03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)**
Frontend-specific patterns, structure, and common pitfalls.

**Key topics**:
- Next.js App Router structure
- IPC client usage
- State management (React Query + Zustand)
- Form validation with Zod
- Component standards
- Design system (Tailwind + shadcn/ui)

---

### 5. **[04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)**
Backend-specific patterns, step-by-step guide to adding new IPC commands.

**Key topics**:
- Backend structure (commands, services, repositories)
- End-to-end example: Adding "Archive Task" feature
- Error handling patterns
- Validation strategies (command vs. service layer)
- Logging and tracing
- Testing backend code

---

### 6. **[05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)**
Complete IPC API reference with the top 30 most important commands.

**Key topics**:
- IPC contract rules
- Standard response envelope (`ApiResponse<T>`)
- Type sync mechanism (Rust → TypeScript)
- Top 30 commands (auth, tasks, interventions, materials, reports)
- Error codes and handling

---

### 7. **[06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)**
Security architecture, authentication flows, and RBAC permission matrix.

**Key topics**:
- Login/logout/session validation flows
- Role-based access control (Admin, Supervisor, Technician, Viewer)
- RBAC permission matrix
- Authorization patterns
- Audit logging
- Security best practices

---

### 8. **[07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)**
Database setup, migration system, and how to safely add schema changes.

**Key topics**:
- SQLite configuration (WAL mode, connection pooling)
- Migration system (discovery, application, tracking)
- Migration file format and best practices
- Example migrations (add column, create table, data migration)
- Testing and validation scripts

---

### 9. **[08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)**
Development workflows, scripts, and "if you change X, run Y" checklists.

**Key topics**:
- Core development commands (`npm run dev`, `npm run types:sync`)
- Quality checks (linting, type checking, security audit)
- Testing (frontend, backend, E2E)
- 24 validation scripts reference
- Complete development workflow example

---

### 10. **[09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)**
User roles, core user flows, and UX patterns.

**Key topics**:
- User personas (Admin, Supervisor, Technician, Viewer)
- 7 core user flows (login, create task, start intervention, etc.)
- Common UI patterns (tables, modals, toasts)
- Design system quick reference
- Accessibility considerations

---

## 🚀 Quick Start for AI Agents

### If you need to...

| Task | Documents to Read | Key Actions |
|------|-------------------|-------------|
| **Understand the project** | 00, 01, 02 | Read overview, domain model, architecture |
| **Add a new IPC command** | 04, 05, 08 | Follow backend guide step-by-step, run `types:sync` |
| **Add a frontend feature** | 03, 09 | Check frontend guide, follow UI patterns |
| **Modify database schema** | 01, 07, 08 | Create migration, validate, test |
| **Debug an issue** | 02, 04, 06 | Check data flows, logs, security patterns |
| **Add a new user role** | 06, 01 | Update RBAC matrix, modify auth logic |
| **Understand a user flow** | 09, 02 | Read user flows, check data flow diagrams |
| **Set up development environment** | 00, 08 | Run `npm run dev`, check quality scripts |

---

## 🔧 Essential Commands Cheat Sheet

```bash
# Start development
npm run dev

# Sync TypeScript types from Rust
npm run types:sync

# Run all quality checks
npm run quality:check

# Run tests
npm run test

# Validate migrations
node scripts/validate-migration-system.js

# Security audit
npm run security:audit

# Check type drift
npm run types:drift-check
```

---

## 📂 Critical Code Paths

### Backend Entry Points

| Purpose | Path |
|---------|------|
| Application entry | `src-tauri/src/main.rs` |
| IPC command registry | `src-tauri/src/commands/mod.rs` |
| Database initialization | `src-tauri/src/db/mod.rs` |
| Migrations | `src-tauri/migrations/` |
| Domain models | `src-tauri/src/models/` |

### Frontend Entry Points

| Purpose | Path |
|---------|------|
| Root layout | `frontend/src/app/layout.tsx` |
| Home page | `frontend/src/app/page.tsx` |
| IPC client | `frontend/src/lib/ipc/` |
| Auto-generated types | `frontend/src/types/` (⚠️ DO NOT EDIT) |
| UI components | `frontend/src/components/ui/` |

---

## 🎓 Learning Path

### Day 1: Orientation
1. Read **00_PROJECT_OVERVIEW.md**
2. Skim **01_DOMAIN_MODEL.md** (understand entities)
3. Read **02_ARCHITECTURE_AND_DATAFLOWS.md** (understand layers)

### Day 2: Frontend
4. Read **03_FRONTEND_GUIDE.md**
5. Read **09_USER_FLOWS_AND_UX.md**
6. Explore `frontend/src/` directory

### Day 3: Backend
7. Read **04_BACKEND_GUIDE.md**
8. Read **05_IPC_API_AND_CONTRACTS.md**
9. Explore `src-tauri/src/` directory

### Day 4: Advanced Topics
10. Read **06_SECURITY_AND_RBAC.md**
11. Read **07_DATABASE_AND_MIGRATIONS.md**
12. Read **08_DEV_WORKFLOWS_AND_TOOLING.md**

### Day 5: Hands-On
13. Follow a complete development workflow (08)
14. Add a simple IPC command (04)
15. Create a migration (07)

---

## ⚠️  Critical Rules

### Type Safety
- ✅ **ALWAYS** run `npm run types:sync` after modifying Rust models
- ❌ **NEVER** manually edit `frontend/src/types/*.ts`

### Architecture
- ✅ **ALWAYS** follow the 4-layer architecture (no layer skipping)
- ❌ **NEVER** put business logic in IPC commands
- ❌ **NEVER** access the database directly from services (use repositories)

### Security
- ✅ **ALWAYS** validate `session_token` in protected commands
- ✅ **ALWAYS** check RBAC permissions
- ❌ **NEVER** commit secrets to Git

### Database
- ✅ **ALWAYS** use migrations for schema changes
- ✅ **ALWAYS** make migrations idempotent (`IF NOT EXISTS`)
- ❌ **NEVER** modify the database schema directly

### Quality
- ✅ **ALWAYS** run `npm run quality:check` before committing
- ✅ **ALWAYS** write tests for new features
- ✅ **ALWAYS** validate migrations before applying

---

## 🧭 Navigation Tips

### Finding Things

**To find a command implementation**:
1. Check `src-tauri/src/commands/mod.rs` for the command name
2. Navigate to the specific command file
3. Trace the call to service layer

**To find a model definition**:
1. Check `src-tauri/src/models/mod.rs` for re-exports
2. Navigate to the specific model file (e.g., `task.rs`)

**To find frontend IPC usage**:
1. Check `frontend/src/lib/ipc/domains/` for domain-specific wrappers
2. Usage examples in `frontend/src/app/` pages

**To find a migration**:
1. Check `src-tauri/migrations/` directory
2. Migrations are numbered sequentially (002, 024, etc.)

---

## 📖 Additional Resources

### Existing Documentation

- **AGENTS.md** (project root): Comprehensive developer guide
- **README.md** (project root): Project setup and overview
- **Inline code comments**: Most critical functions have doc comments

### External References

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Next.js Documentation](https://nextjs.org/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Rust Book](https://doc.rust-lang.org/book/)

---

## 🆘 When You're Stuck

### Common Issues → Solutions

| Issue | Solution |
|-------|----------|
| Types out of sync | `npm run types:sync && npm run types:validate` |
| Build failed | Check error logs, verify dependencies, run `npm install` and `cargo build` |
| Migration failed | `node scripts/validate-migration-system.js` |
| IPC command not found | Check `src-tauri/src/main.rs` for registration |
| Permission denied | Check RBAC matrix in 06_SECURITY_AND_RBAC.md |

### Debug Process

1. **Read error message carefully** (most errors are descriptive)
2. **Check relevant documentation file** (use index above)
3. **Trace the code path** (follow layer-by-layer)
4. **Check logs** (`tracing` output in console)
5. **Consult AGENTS.md** (comprehensive developer guide)

---

## 📝 Glossary

| Term | Meaning |
|------|---------|
| **RPMA** | Repair Management Application (PPF installation tracking) |
| **PPF** | Paint Protection Film |
| **IPC** | Inter-Process Communication (frontend ↔ backend) |
| **Task** | Work order / intervention request |
| **Intervention** | Actual execution of a task (PPF installation) |
| **Session Token** | Authentication token for protected IPC commands |
| **RBAC** | Role-Based Access Control |
| **WAL** | Write-Ahead Logging (SQLite mode) |
| **ts-rs** | Rust crate for generating TypeScript types |

---

## ✅ Validation Checklist

Before making any changes, ensure you've:
- [ ] Read **00_PROJECT_OVERVIEW.md** (orientation)
- [ ] Understood the **4-layer architecture** (02)
- [ ] Checked **type sync requirements** (if touching models)
- [ ] Reviewed **RBAC rules** (if adding commands)
- [ ] Planned **migrations** (if changing schema)

Before committing changes:
- [ ] Run `npm run quality:check`
- [ ] Run `npm run types:drift-check`
- [ ] Run tests (`npm run test`)
- [ ] Validate migrations (`node scripts/validate-migration-system.js` if applicable)
- [ ] Review changed files for hardcoded secrets or debug logs

---

## 🎯 Success Criteria

You've successfully onboarded when you can:
- [ ] Explain the 4-layer architecture
- [ ] Add a new IPC command end-to-end
- [ ] Create and apply a database migration
- [ ] Understand the type sync workflow
- [ ] Navigate the RBAC permission matrix
- [ ] Locate any entity's model, service, repository, and command

---

## 📞 Support

For questions or issues:
1. Check this documentation pack
2. Consult **AGENTS.md** (root directory)
3. Review inline code comments
4. Check existing tests for usage examples

---

**Version**: 1.0  
**Last Updated**: 2026-02-11  
**Maintained by**: RPMA Development Team

---

Happy coding! 🚀
