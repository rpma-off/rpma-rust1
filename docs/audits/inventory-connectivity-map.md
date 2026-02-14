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
| 9 | Delete/archive material | `MaterialCatalog.tsx` | `handleArchive` → `invoke('material_delete')` | `material_delete` | ✅ Yes | OK | Soft-delete with AlertDialog confirmation |
| 10 | Stock adjust (IN/OUT) | `MaterialCatalog.tsx` | `handleStockAdjust` → `submitStockAdjustment` | `material_update_stock` | ✅ Yes | OK | Dialog with quantity+reason, persists via backend |
| 11 | Dashboard stats cards | `InventoryDashboard.tsx` | `useInventoryStats.fetchStats` | `inventory_get_stats` | ✅ Yes | OK | Reads from backend, shows loading/error/empty |
| 12 | Dashboard recent transactions | `InventoryDashboard.tsx` | `useInventoryStats.fetchStats` | `inventory_get_stats` (includes transactions) | ✅ Yes | OK | Rendered from stats response |
| 13 | Suppliers tab | `SupplierManagement.tsx` | `fetchSuppliers` + `handleSubmit` | `material_list_suppliers`, `material_create_supplier` | ✅ Yes | OK | Full CRUD: list, create form, table |
| 14 | Reports tab | `InventoryReports.tsx` | `fetchReports` | `material_get_low_stock`, `material_get_inventory_movement_summary` | ✅ Yes | OK | Low stock alerts + movement summary from backend |
| 15 | Settings tab | `InventorySettings.tsx` | `fetchCategories` + `handleSubmit` | `material_list_categories`, `material_create_category` | ✅ Yes | OK | Category management CRUD |
| 16 | Search button (header) | `InventoryLayout.tsx` | — | — | — | OK | Removed dead button; search is in MaterialCatalog filter bar |
| 17 | Low stock alert indicator | `MaterialCatalog.tsx` (table row) | inline comparison | `material_list` (field data) | ✅ Yes | OK | Shows warning icon when stock ≤ minimum_stock |
| 18 | Record consumption | `useInventory.recordConsumption` | `invoke('material_record_consumption')` | `material_record_consumption` | ✅ Yes | OK | Works but no dedicated UI on inventory page |
| 19 | Update stock | `useInventory.updateStock` | `invoke('material_update_stock')` | `material_update_stock` | ✅ Yes | OK | Hook wired but no UI trigger on inventory page |
| 20 | Create supplier | `SupplierManagement.tsx` | `handleSubmit` | `material_create_supplier` | ✅ Yes | OK | Form with validation, persists via backend |
| 21 | List suppliers | `SupplierManagement.tsx` | `fetchSuppliers` | `material_list_suppliers` | ✅ Yes | OK | Loads from backend, table display |
| 22 | Create category | `InventorySettings.tsx` | `handleSubmit` | `material_create_category` | ✅ Yes | OK | Form with validation, persists via backend |
| 23 | List categories | `InventorySettings.tsx` | `fetchCategories` | `material_list_categories` | ✅ Yes | OK | Loads from backend, table display |
| 24 | Get transaction history | IPC wrapper exists | `transactionOperations.getTransactionHistory` | `material_get_transaction_history` | ✅ Yes | OK | Backend command registered and wired |
| 25 | Create inventory transaction | IPC wrapper exists | `transactionOperations.createInventoryTransaction` | `material_create_inventory_transaction` | ✅ Yes | OK | Backend command registered and wired |
| 26 | Get consumption history | IPC wrapper exists | `consumptionOperations.getConsumptionHistory` | `material_get_consumption_history` | ✅ Yes | OK | Backend command + service method added |
| 27 | Get inventory movement summary | `InventoryReports.tsx` | `fetchReports` | `material_get_inventory_movement_summary` | ✅ Yes | OK | Backend command registered, shown in Reports tab |

## Summary

| Status | Count |
|--------|-------|
| OK | 27 |
| DEAD | 0 |
| MISSING_BACKEND | 0 |
| MOCK | 0 |
| MISSING_WRAPPER | 0 |
