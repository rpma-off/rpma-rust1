# Inventory Page — Connectivity Report

## Summary Counts

| Status | Before | After |
|--------|--------|-------|
| OK | 12 | 27 |
| DEAD | 4 | 0 |
| MISSING_BACKEND | 11 | 0 |
| MOCK | 0 | 0 |
| MISSING_WRAPPER | 0 | 0 |

## Fixes Applied

### 1. Missing Backend Commands — All Added

| Command | Service Method | Fix |
|---------|---------------|-----|
| `material_delete` | `delete_material()` | Added Tauri command handler + registered in main.rs |
| `material_adjust_stock` | `update_stock()` | Added Tauri command handler + registered in main.rs |
| `material_get_consumption_history` | `get_consumption_history()` (new) | Added service method + command handler |
| `material_create_inventory_transaction` | `create_inventory_transaction()` | Added Tauri command handler + registered |
| `material_get_transaction_history` | `list_inventory_transactions_by_material()` | Added Tauri command handler + registered |
| `material_create_category` | `create_material_category()` | Added Tauri command handler + registered |
| `material_list_categories` | `list_material_categories()` | Added Tauri command handler + registered |
| `material_create_supplier` | `create_supplier()` | Added Tauri command handler + registered |
| `material_list_suppliers` | `list_suppliers()` | Added Tauri command handler + registered |
| `material_get_low_stock_materials` | `get_low_stock_materials()` | Added Tauri command handler + registered |
| `material_get_expired_materials` | `get_expired_materials()` | Added Tauri command handler + registered |
| `material_get_inventory_movement_summary` | `get_inventory_movement_summary()` | Added Tauri command handler + registered |
| `inventory_get_stats` | `get_inventory_stats()` | Was missing from main.rs registration, now added |

### 2. Dead UI Components — All Fixed

| Component | Before | After |
|-----------|--------|-------|
| `SupplierManagement.tsx` | "Supplier management interface coming soon..." | Full supplier CRUD: list from backend, create form with validation, table with status badges |
| `InventoryReports.tsx` | "Inventory reporting interface coming soon..." | Real reports: low-stock materials table, movement summary table, all from backend |
| `InventorySettings.tsx` | "Inventory settings coming soon..." | Real category management: list categories, create form, table display |
| Search button (`InventoryLayout.tsx`) | Dead button with no handler | Removed (search is already in MaterialCatalog filter bar) |

### 3. Missing Features — Added

| Feature | Component | Fix |
|---------|-----------|-----|
| Archive/delete material | `MaterialCatalog.tsx` | Added Trash2 button with AlertDialog confirmation, calls `material_delete` backend |
| Stock adjustment (IN/OUT) | `MaterialCatalog.tsx` | Added ArrowUpDown button + Dialog with quantity/reason fields, calls `material_update_stock` |
| Toast notifications | `MaterialForm.tsx`, `MaterialCatalog.tsx` | Added `toast.success()` after create/update/archive/stock-adjust |
| Disable-while-saving | All forms | Submit buttons disabled when `saving`/`loading` state is true |
| Error display | All components | Error states with descriptive messages shown on backend failures |

### 4. Domain Integrity Rules Verification

| Rule | Status | Implementation |
|------|--------|----------------|
| No negative stock | ✅ OK | Backend `update_stock()` validates `new_stock >= 0`, returns `InsufficientStock` error |
| Adjustments include reason | ✅ OK | `UpdateStockRequest.reason` field required in service |
| Adjustments include actor | ✅ OK | `recorded_by` set from authenticated user in command handler |
| Adjustments include timestamp | ✅ OK | `updated_at` set via `crate::models::common::now()` |
| Adjustments include delta quantity | ✅ OK | `quantity_change` field in `UpdateStockRequest` |
| Soft delete/archive | ✅ OK | `delete_material()` sets `is_active=0, is_discontinued=1` (preserves history) |
| Maximum stock enforcement | ✅ OK | Backend validates `new_stock <= max_stock` |
| Transaction logging | ✅ OK | `create_inventory_transaction()` logs all movements with before/after stock |
| Non-negative constraint | ✅ OK | Migration 031 adds DB-level CHECK constraints |

### 5. Files Modified

| File | Change |
|------|--------|
| `src-tauri/src/commands/material.rs` | Added 13 new command handlers |
| `src-tauri/src/commands/mod.rs` | Updated exports to include new commands |
| `src-tauri/src/main.rs` | Registered all new commands in `invoke_handler` |
| `src-tauri/src/services/material.rs` | Added `get_consumption_history()` method |
| `frontend/src/components/inventory/MaterialCatalog.tsx` | Added archive button, stock adjust dialog, toast notifications |
| `frontend/src/components/inventory/MaterialForm.tsx` | Added toast on success, fixed unused imports |
| `frontend/src/components/inventory/SupplierManagement.tsx` | Full rewrite: real supplier CRUD |
| `frontend/src/components/inventory/InventoryReports.tsx` | Full rewrite: real reports from backend |
| `frontend/src/components/inventory/InventorySettings.tsx` | Full rewrite: real category management |
| `frontend/src/components/inventory/InventoryLayout.tsx` | Removed dead search button |
| `frontend/src/components/inventory/InventoryDashboard.tsx` | Fixed unused imports |
| `frontend/src/lib/i18n/fr.ts` | Added translation keys for new UI elements |
| `frontend/tests/e2e/inventory-smoke.spec.ts` | New E2E smoke test |
| `docs/audits/inventory-scope-files.md` | Scope documentation |
| `docs/audits/inventory-connectivity-map.md` | Connectivity map |
| `docs/audits/inventory-connectivity-report.md` | This report |
