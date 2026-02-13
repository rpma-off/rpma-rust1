# RPMA v2 — Fix Plan

## Phase 0: CI & Build Blockers ✅ DONE

| Task | Complexity | Status |
|------|-----------|--------|
| Fix WebKit package in CI workflow | S | ✅ Done |
| Fix schema drift checker | S | ✅ Done |
| Clean up committed artifacts | S | ✅ Done |

## Phase 1: Type Safety ✅ DONE

| Task | Complexity | Status |
|------|-----------|--------|
| Fix `JsonObject` type definition | S | ✅ Done |
| Fix `BackendResponse` interface | S | ✅ Done |
| Fix mock-db.ts type errors (89) | M | ✅ Done |
| Fix IPC client.ts type casts (44) | M | ✅ Done |
| Fix domain IPC files (28) | M | ✅ Done |
| Fix remaining component type issues | S | ✅ Done |
| Fix cache type constraints | S | ✅ Done |
| Fix error handling type narrowing | S | ✅ Done |

## Phase 2: Future Improvements (Documented)

| Task | Complexity | Priority |
|------|-----------|----------|
| Replace `any` types in backend-type-guards.ts | M | Medium |
| Fix 16 pre-existing test suite failures | L | Medium |
| Add `.expect()` messages to mutex locks | S | Low |
| Add type-safe validators for IPC responses | L | Medium |
| Centralize error types across IPC boundary | M | Medium |

## Dependencies

- Phase 0 must be done first (CI is blocked)
- Phase 1 depends on Phase 0 (can't verify without working CI)
- Phase 2 items are independent and can be done in any order
