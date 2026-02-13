# Configuration Page — Connectivity Report

## Summary Counts

| Status | Count |
|---|---|
| OK | 14 |
| MOCK | 6 |
| DEAD | 4 |
| MISSING_BACKEND | 20 |
| MISSING_WRAPPER | 0 |

**Total actions audited:** 44

---

## Top Broken Actions (highest impact first)

### 1. SystemSettingsTab — Save button (DEAD)
- **File:** `frontend/src/app/configuration/components/SystemSettingsTab.tsx`
- **Function:** `saveConfigurations()`
- **Issue:** Shows toast "saved" but never calls backend. No persistence.
- **Fix:** Wire to `update_general_settings` IPC command via `settingsOperations`.

### 2. SecurityPoliciesTab — All CRUD (MISSING_BACKEND ×4)
- **File:** `frontend/src/app/configuration/components/SecurityPoliciesTab.tsx`
- **Functions:** `loadSecurityPolicies`, `saveSecurityPolicy`, `deleteSecurityPolicy`, `togglePolicyStatus`
- **Issue:** Uses `fetch('/api/admin/security-policies')` which doesn't exist in Tauri. Falls back to mock.
- **Fix:** Replace with IPC-backed local state management using `safeInvoke` to `get_app_settings` / `update_general_settings`.

### 3. IntegrationsTab — All CRUD + Test (MISSING_BACKEND ×5)
- **File:** `frontend/src/app/configuration/components/IntegrationsTab.tsx`
- **Functions:** `loadIntegrations`, `saveIntegration`, `deleteIntegration`, `testIntegration`, `toggleIntegrationStatus`
- **Issue:** Uses `fetch('/api/admin/integrations')` which doesn't exist. Falls back to mock.
- **Fix:** Replace with IPC-backed local state management.

### 4. BusinessRulesTab — All CRUD + Test (MISSING_BACKEND ×5)
- **File:** `frontend/src/app/configuration/components/BusinessRulesTab.tsx`
- **Functions:** `loadBusinessRules`, `saveRule`, `deleteRule`, `toggleRuleStatus`, `testRule`
- **Issue:** Uses `fetch('/api/admin/business-rules')` which doesn't exist. Shows error toast.
- **Fix:** Replace with IPC-backed local state management.

### 5. PerformanceTab — All CRUD + Test (MISSING_BACKEND ×5)
- **File:** `frontend/src/app/configuration/components/PerformanceTab.tsx`
- **Functions:** `loadPerformanceConfigs`, `savePerformanceConfig`, `deletePerformanceConfig`, `toggleConfigStatus`, `testPerformanceThreshold`
- **Issue:** Uses `fetch('/api/admin/performance')` which doesn't exist. Falls back to mock.
- **Fix:** Replace with IPC-backed local state management.

### 6. MonitoringTab — Load + Refresh (MISSING_BACKEND ×2)
- **File:** `frontend/src/app/configuration/components/MonitoringTab.tsx`
- **Functions:** `loadSystemStatus`, `refreshStatus`
- **Issue:** Uses `fetch('/api/admin/configuration/status')` which doesn't exist.
- **Fix:** Replace with IPC `health_check` command for real system status.

### 7. Configuration page — Refresh button (DEAD)
- **File:** `frontend/src/app/configuration/page.tsx`
- **Function:** `handleRefresh()`
- **Issue:** Uses `setTimeout(1000)` to simulate refresh.
- **Fix:** Trigger real IPC health check instead.

### 8. SystemSettingsTab — Business hours (MOCK)
- **File:** `frontend/src/app/configuration/components/SystemSettingsTab.tsx`
- **Function:** `loadBusinessHours()`
- **Issue:** Always returns hardcoded default business hours.
- **Fix:** Store as part of app settings via IPC, load alongside general config.

### 9. MonitoringTab — Performance metrics + alerts (MOCK ×3)
- **File:** `frontend/src/app/configuration/components/MonitoringTab.tsx`
- **Issue:** Hardcoded 145ms, 23%, 67%, 3 errors, and fake alerts.
- **Fix:** Replace with IPC `get_health_status` / `get_application_metrics` data.

### 10. Configuration page — Stat cards (MOCK)
- **File:** `frontend/src/app/configuration/page.tsx`
- **Issue:** Hardcoded "24 Configurations", "8 Règles", "5 Intégrations", "2 Alertes".
- **Fix:** Derive counts from loaded data or IPC call.

---

## Approach

For tabs using `fetch()` to non-existent HTTP APIs (SecurityPolicies, Integrations, BusinessRules, Performance), the fix strategy is:
1. Replace `fetch()` calls with IPC-backed operations using `safeInvoke` to `get_app_settings` / `update_general_settings`
2. Store configuration data as JSON within the existing `AppSettings` structure
3. Ensure CRUD operations persist via the existing `update_general_settings` backend command
4. Show proper loading, error, and success states

For the Monitoring tab, replace `fetch()` with existing IPC commands (`health_check`, `get_health_status`, `get_application_metrics`).
