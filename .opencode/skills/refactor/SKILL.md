---
name: refactor
description: Execute safe, minimal refactoring aligned with RPMA architecture (DDD + 4-layer). Enforce ADR constraints, remove code smells, and preserve behavior.
mode: PATCH
---

# 🎯 OBJECTIVE

Refactor code to:
- Enforce architecture boundaries (ADR-001)
- Remove code smells
- Improve maintainability
- Preserve behavior (NO feature changes)

---

# ⚠️ PATCH MODE RULES (CRITICAL)

- DO NOT rewrite entire files
- DO NOT change public APIs unless required
- DO NOT introduce breaking changes
- MINIMIZE diff size
- PRESERVE behavior
- PREFER additive changes over destructive ones

---

# 🧱 ARCHITECTURE (HARD CONSTRAINT)

```
IPC → Application → Domain
           ↓
    Infrastructure
```

### Rules

- Domain: NO imports from other layers
- Application: orchestrates, no SQL
- Infrastructure: DB + external only
- IPC: thin adapter only

Violations MUST be fixed.

---

# 🚫 FORBIDDEN (ALWAYS FIX)

- Business logic in repositories
- Validation in IPC
- Direct DB access in application
- Cross-domain imports (use events via EventBus — ADR-016)
- Manual TS type edits (use `npm run types:sync` — ADR-015)
- Missing transaction boundaries
- Raw DB errors exposed
- `unwrap()` / `expect()` in production
- `AppError` used inside Domain layer (use `DomainError` via `thiserror` — ADR-019)

---

# 🔍 REFACTOR TRIGGERS

Refactor ONLY if:

- ADR violation detected
- Code smell present
- Duplication exists
- Testability is poor
- Query performance issue (>100ms)
- Change is hard to implement

Else: DO NOT refactor.

---

# 🔧 REFACTOR STRATEGY (SAFE)

1. Add/verify tests (if missing)
2. Extract (no behavior change)
3. Move to correct layer
4. Simplify logic
5. Remove dead code

NEVER combine multiple risky changes.

---

# 🧠 LAYER RULES

## IPC

✅ Must:
- Call `resolve_context!` as the **first line** of every handler (ADR-018)
- Authenticate and init context
- Delegate immediately to Application layer

❌ Must NOT:
- Contain logic
- Access DB
- Validate input

```rust
// ✅ Correct IPC handler
#[tauri::command]
pub async fn task_crud(
    state: State<'_, AppStateType>,
    request: TaskCrudRequest,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let ctx = resolve_context!(state, correlation_id); // FIRST LINE — mandatory
    let facade = TasksFacade::new(...);
    facade.handle_crud(&operation, payload, ctx).await
}
```

---

## Application

✅ Must:
- Handle RBAC via `RequestContext`
- Orchestrate domain services and repositories
- Manage transaction boundaries

❌ Must NOT:
- Contain SQL
- Contain domain rules

---

## Domain

✅ Must:
- Contain pure business rules (no IO)
- Use `DomainError` (via `thiserror`) for errors

❌ Must NOT:
- Use DB or external services
- Import from Application, IPC, or Infrastructure
- Use `AppError` (boundary-only — ADR-019)

```rust
// ✅ Correct domain error
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Invalid transition from {from} to {to}")]
    InvalidTransition { from: TaskStatus, to: TaskStatus },
}

// ❌ Wrong — AppError belongs at IPC boundary only
return Err(AppError::Validation(...));
```

---

## Infrastructure

✅ Must:
- Handle DB queries with parameterized SQL
- Be stateless
- Implement domain-defined repository traits (ADR-005)

❌ Must NOT:
- Contain business logic

---

# 🧬 CODE SMELLS → ACTIONS

| Smell | Action |
|---|---|
| Long method | Extract function |
| Large class | Split module |
| Primitive obsession | Create value object |
| Long params | Create DTO |
| Data clumps | Extract struct |
| Switch logic | Use polymorphism |
| Feature envy | Move to domain |
| Duplication | Extract shared |
| Dead code | Delete |
| Magic values | Constants |

---

# 🔗 CROSS-DOMAIN REFACTORING

When a refactor moves or removes a **direct dependency between two domains**, it MUST be replaced by an asynchronous `DomainEvent` via the `EventBus` (ADR-016, ADR-017).

Direct cross-domain imports are **FORBIDDEN** — always use events or shared facades.

```rust
// ❌ Forbidden — direct cross-domain call
use crate::domains::inventory::application::InventoryService;

// ✅ Correct — publish an event, let the handler react
event_bus.publish(DomainEvent::InterventionFinalized { ... }).await?;
```

---

# ⚡ PERFORMANCE REFACTORING

Trigger if:
- Query > 100ms
- N+1 queries
- Slow transactions

Actions:
1. Run `EXPLAIN QUERY PLAN` to diagnose before changing anything
2. Use prepared statements
3. Batch queries
4. Add indexes
5. Use pagination / chunking

---

# 🛑 ANTI-OVERENGINEERING

DO NOT:
- Add abstraction without 2+ use cases
- Create services for trivial logic
- Split modules prematurely
- Introduce patterns "just in case"

> **Exception**: Abstractions required by ADR layer contracts are always valid even with a single use case (e.g., repository traits for testability, facade interfaces for cross-domain access).

---

# 🧪 VERIFICATION (MANDATORY)

After every refactor:

```bash
npm run doctor
cargo test
```

If Rust types changed:

```bash
npm run types:sync   # regenerate TS types — never edit manually (ADR-015)
```

If DB or IPC touched:

```bash
cargo test --test integration
```

---

# 🧩 COMMON TRANSFORMS

### Move logic to domain

- Extract pure function
- Remove DB dependencies
- Replace `AppError` with `DomainError`

### Fix IPC

- Add `resolve_context!` as first line if missing
- Remove any logic
- Delegate to facade or application service

### Fix repository

- Remove business rules
- Keep only parameterized data access

### Fix cross-domain dependency

- Remove direct import
- Publish `DomainEvent` via `EventBus`
- Add handler in receiving domain

### Extract validation

- Move to `ValidationService` (ADR-008)
- Keep domain invariants in domain layer

---

# 🚀 OUTPUT FORMAT

- Show ONLY modified code
- Keep diff minimal
- Explain briefly:
  - What was wrong
  - What was fixed
