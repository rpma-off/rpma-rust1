# Configuration Page — Connectivity Map

## Legend
- **OK** — reads from backend on load, writes to backend on save, persists to SQLite/in-memory, shows loading+error+success feedback
- **MOCK** — loads or falls back to hardcoded mock data
- **DEAD** — handler exists but does nothing / only logs / simulates with `setTimeout`
- **MISSING_BACKEND** — frontend handler calls a backend endpoint that does not exist
- **MISSING_WRAPPER** — backend command exists but frontend has no IPC wrapper for it

---

## Configuration Page (`page.tsx`)

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Tab navigation (click) | page.tsx | `handleTabChange` | None (local state) | No | OK | Tab switch is UI-only, correct |
| Tab navigation (Ctrl+1-6) | page.tsx | keyboard handler | None (local state) | No | OK | UI-only, correct |
| Refresh button | page.tsx | `handleRefresh` | None | No | **DEAD** | Uses `setTimeout(1000)` simulated refresh |
| System status indicator | page.tsx | useEffect | `safeInvoke(HEALTH_CHECK)` | No | OK | Real IPC call to health_check |
| Help button | page.tsx | — | — | — | **DEAD** | No handler, purely decorative |
| Stat cards (24/8/5/2) | page.tsx | — | — | — | **MOCK** | Hardcoded values |
| Mobile sheet navigation | page.tsx | `handleTabChange` | None | No | OK | Same as tab nav |

## SystemSettingsTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load configurations | SystemSettingsTab | `loadConfigurations` | `settingsOperations.getAppSettings()` | Yes (read) | OK | Reads from backend |
| Load business hours | SystemSettingsTab | `loadBusinessHours` | None | No | **MOCK** | Hardcoded default values |
| Config field change | SystemSettingsTab | `updateConfiguration` | None | No | OK | Local state update, correct (before save) |
| Save button | SystemSettingsTab | `saveConfigurations` | None | No | **DEAD** | Only toasts success, never calls backend |
| Reset button | SystemSettingsTab | `resetChanges` | `loadConfigurations` (re-fetch) | No | OK | Reloads from backend |
| Sub-tab navigation | SystemSettingsTab | `setActiveSubTab` | None | No | OK | UI-only |
| Business hours toggle | SystemSettingsTab | inline setState | None | No | **DEAD** | Local state only, no save path |

## SecurityPoliciesTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load policies | SecurityPoliciesTab | `loadSecurityPolicies` | `fetch('/api/admin/security-policies')` | No | **MISSING_BACKEND** | Uses HTTP fetch — no such API in Tauri. Falls back to mock |
| Save policy | SecurityPoliciesTab | `saveSecurityPolicy` | `fetch(POST/PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Delete policy | SecurityPoliciesTab | `deleteSecurityPolicy` | `fetch(DELETE)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Toggle policy status | SecurityPoliciesTab | `togglePolicyStatus` | `fetch(PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Create dialog open/close | SecurityPoliciesTab | state toggle | None | No | OK | UI-only |
| Policy settings form | SecurityPoliciesTab | `setFormData` | None | No | OK | Local state before save |

## IntegrationsTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load integrations | IntegrationsTab | `loadIntegrations` | `fetch('/api/admin/integrations')` | No | **MISSING_BACKEND** | Falls back to mock data |
| Save integration | IntegrationsTab | `saveIntegration` | `fetch(POST/PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Delete integration | IntegrationsTab | `deleteIntegration` | `fetch(DELETE)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Test integration | IntegrationsTab | `testIntegration` | `fetch(POST .../test)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Toggle status | IntegrationsTab | `toggleIntegrationStatus` | `fetch(PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Create dialog | IntegrationsTab | state toggle | None | No | OK | UI-only |

## BusinessRulesTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load rules | BusinessRulesTab | `loadBusinessRules` | `fetch('/api/admin/business-rules')` | No | **MISSING_BACKEND** | HTTP fetch fails, shows error toast |
| Save rule | BusinessRulesTab | `saveRule` | `fetch(POST/PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Delete rule | BusinessRulesTab | `deleteRule` | `fetch(DELETE)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Toggle rule | BusinessRulesTab | `toggleRuleStatus` | `fetch(PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Test rule | BusinessRulesTab | `testRule` | `fetch(POST .../test)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Search & filter | BusinessRulesTab | local state | None | No | OK | UI-only filtering |

## PerformanceTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load configs | PerformanceTab | `loadPerformanceConfigs` | `fetch('/api/admin/performance')` | No | **MISSING_BACKEND** | Falls back to mock data |
| Save config | PerformanceTab | `savePerformanceConfig` | `fetch(POST/PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Delete config | PerformanceTab | `deletePerformanceConfig` | `fetch(DELETE)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Toggle config | PerformanceTab | `toggleConfigStatus` | `fetch(PUT)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |
| Test threshold | PerformanceTab | `testPerformanceThreshold` | `fetch(POST .../test)` | No | **MISSING_BACKEND** | HTTP fetch to non-existent endpoint |

## MonitoringTab

| UI Element | Location | Handler | Backend call | Persisted? | Status | Notes |
|---|---|---|---|---|---|---|
| Load system status | MonitoringTab | `loadSystemStatus` | `fetch('/api/admin/configuration/status')` | No | **MISSING_BACKEND** | Shows nothing on failure |
| Refresh button | MonitoringTab | `refreshStatus` | `fetch(...)` | No | **MISSING_BACKEND** | Same as load |
| Performance metrics cards | MonitoringTab | None | None | No | **MOCK** | Hardcoded values (145ms, 23%, 67%, 3) |
| Recent alerts list | MonitoringTab | None | None | No | **MOCK** | Hardcoded alerts |
| Trend icons | MonitoringTab | `getTrendIcon` | None | No | **MOCK** | Random Math.random() values |
