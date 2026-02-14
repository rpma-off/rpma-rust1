# Inventory Page — Scope Files

## Frontend

| File Path | Role |
|-----------|------|
| `frontend/src/app/inventory/page.tsx` | Route entry point (`/inventory`) |
| `frontend/src/components/inventory/InventoryDashboard.tsx` | Stats dashboard (total materials, low stock, value, turnover, recent transactions) |
| `frontend/src/components/inventory/InventoryLayout.tsx` | Page layout wrapper with header + search button + tabs |
| `frontend/src/components/inventory/InventoryTabs.tsx` | Tab navigation: Materials, Suppliers, Reports, Settings |
| `frontend/src/components/inventory/MaterialCatalog.tsx` | Material list table with search, filter, add/edit dialog |
| `frontend/src/components/inventory/MaterialForm.tsx` | Create/edit material form (used inside dialog) |
| `frontend/src/components/inventory/SupplierManagement.tsx` | Supplier management tab (placeholder → now real) |
| `frontend/src/components/inventory/InventoryReports.tsx` | Reports tab (placeholder → now real) |
| `frontend/src/components/inventory/InventorySettings.tsx` | Settings tab (placeholder → now real) |
| `frontend/src/hooks/useInventory.ts` | Main inventory hook: CRUD, stock, consumption, stats |
| `frontend/src/hooks/useInventoryStats.ts` | Inventory stats hook (calls `inventory_get_stats`) |
| `frontend/src/hooks/useMaterials.ts` | Material list with filtering (calls `material_list`) |
| `frontend/src/hooks/useMaterialForm.ts` | Form state management for create/edit material |
| `frontend/src/lib/inventory.ts` | TypeScript type definitions for inventory domain |
| `frontend/src/lib/ipc/domains/inventory.ts` | Typed IPC wrappers for all inventory operations |
| `frontend/src/lib/ipc/commands.ts` | IPC command name constants |

## Backend (src-tauri)

| File Path | Role |
|-----------|------|
| `src-tauri/src/commands/material.rs` | Tauri IPC command handlers for material operations |
| `src-tauri/src/services/material.rs` | Business logic: validation, CRUD, stock, categories, suppliers, transactions |
| `src-tauri/src/models/material.rs` | Data models: Material, Supplier, Category, Transaction, Consumption |
| `src-tauri/src/models/material_ts.rs` | TypeScript export helpers |
| `src-tauri/src/repositories/material_repository.rs` | Database access layer |
| `src-tauri/src/main.rs` | Tauri command registration (invoke_handler) |
| `src-tauri/src/commands/mod.rs` | Command module exports |

## Database Migrations

| File Path | Role |
|-----------|------|
| `src-tauri/migrations/024_add_inventory_management.sql` | Creates materials, material_categories, inventory_transactions tables |
| `src-tauri/migrations/031_add_inventory_non_negative_checks.sql` | Adds non-negative stock constraints |

## Tests

| File Path | Role |
|-----------|------|
| `frontend/tests/e2e/inventory-management.spec.ts` | Existing E2E tests for inventory |
| `frontend/tests/e2e/inventory-smoke.spec.ts` | New smoke test verifying persistence |
| `frontend/src/hooks/__tests__/useInventory.test.ts` | Hook unit tests |
| `frontend/src/components/inventory/__tests__/StockLevelIndicator.test.tsx` | Component unit tests |
