# Inventory Page — Connectivity Map

## User Actions Trace

| # | UI Element | Location (component) | Handler | Backend call/command | Persisted? | Status | Notes |
|---|-----------|----------------------|---------|---------------------|------------|--------|-------|
| 1 | Materials tab → table loads | `MaterialCatalog.tsx` | `useMaterials.fetchMaterials` | `material_list` | ✅ Yes | OK | Reads from backend, shows loading/error/empty |
| 2 | Search input (materials) | `MaterialCatalog.tsx` | `setSearchTerm` → `useMaterials` | `material_list` + client filter | ✅ Yes | OK | Backend fetch + client-side filter on name/SKU |
| 3 | Material type filter | `MaterialCatalog.tsx` | `setMaterialTypeFilter` → `useMaterials` | `material_list` | ✅ Yes | OK | Passed as query param to backend |
| 4 | Category filter | `MaterialCatalog.tsx` | `setCategoryFilter` → `useMaterials` | `material_list` | ✅ Yes | OK | Passed as query param to backend |
| 5 | Add material button → form | `MaterialCatalog.tsx` | `setShowForm(true)` → `MaterialForm` | — | — | OK | Opens dialog |
| 6 | Submit new material form | `MaterialForm.tsx` | `handleSubmit` → `useMaterialForm.saveMaterial` | `material_create` | ✅ Yes | OK | Creates via backend, closes dialog, refetches |
| 7 | Edit material button → form | `MaterialCatalog.tsx` | `handleEdit` → `MaterialForm` | — | — | OK | Opens dialog with pre-filled data |
| 8 | Submit edit material form | `MaterialForm.tsx` | `handleSubmit` → `useMaterialForm.saveMaterial` | `material_update` | ✅ Yes | OK | Updates via backend, closes dialog, refetches |
| 9 | Delete/archive material | `MaterialCatalog.tsx` | — | `material_delete` | ❌ No | MISSING_BACKEND | No delete button exists; backend command missing from Tauri registration |
| 10 | Stock adjust (IN/OUT) | — | — | `material_adjust_stock` | ❌ No | MISSING_BACKEND | No stock adjust UI; backend command missing from Tauri registration |
| 11 | Dashboard stats cards | `InventoryDashboard.tsx` | `useInventoryStats.fetchStats` | `inventory_get_stats` | ✅ Yes | OK | Reads from backend, shows loading/error/empty |
| 12 | Dashboard recent transactions | `InventoryDashboard.tsx` | `useInventoryStats.fetchStats` | `inventory_get_stats` (includes transactions) | ✅ Yes | OK | Rendered from stats response |
| 13 | Suppliers tab | `SupplierManagement.tsx` | — | — | ❌ No | DEAD | Shows "coming soon..." placeholder |
| 14 | Reports tab | `InventoryReports.tsx` | — | — | ❌ No | DEAD | Shows "coming soon..." placeholder |
| 15 | Settings tab | `InventorySettings.tsx` | — | — | ❌ No | DEAD | Shows "coming soon..." placeholder |
| 16 | Search button (header) | `InventoryLayout.tsx` | — | — | ❌ No | DEAD | Button has no onClick handler |
| 17 | Low stock alert indicator | `MaterialCatalog.tsx` (table row) | inline comparison | `material_list` (field data) | ✅ Yes | OK | Shows warning icon when stock ≤ minimum_stock |
| 18 | Record consumption | `useInventory.recordConsumption` | `invoke('material_record_consumption')` | `material_record_consumption` | ✅ Yes | OK | Works but no dedicated UI on inventory page |
| 19 | Update stock | `useInventory.updateStock` | `invoke('material_update_stock')` | `material_update_stock` | ✅ Yes | OK | Hook wired but no UI trigger on inventory page |
| 20 | Create supplier | IPC wrapper exists | `supplierOperations.createSupplier` | `material_create_supplier` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 21 | List suppliers | IPC wrapper exists | `supplierOperations.listSuppliers` | `material_list_suppliers` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 22 | Create category | IPC wrapper exists | `categoryOperations.createCategory` | `material_create_category` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 23 | List categories | IPC wrapper exists | `categoryOperations.listCategories` | `material_list_categories` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 24 | Get transaction history | IPC wrapper exists | `transactionOperations.getTransactionHistory` | `material_get_transaction_history` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 25 | Create inventory transaction | IPC wrapper exists | `transactionOperations.createInventoryTransaction` | `material_create_inventory_transaction` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 26 | Get consumption history | IPC wrapper exists | `consumptionOperations.getConsumptionHistory` | `material_get_consumption_history` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |
| 27 | Get inventory movement summary | IPC wrapper exists | `reportingOperations.getInventoryMovementSummary` | `material_get_inventory_movement_summary` | ❌ No | MISSING_BACKEND | IPC wrapper exists but command not in Tauri |

## Summary

| Status | Count |
|--------|-------|
| OK | 12 |
| DEAD | 4 |
| MISSING_BACKEND | 11 |
| MOCK | 0 |
| MISSING_WRAPPER | 0 |
