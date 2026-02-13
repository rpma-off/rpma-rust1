# Configuration Page — Scope Files

## Frontend Route
| File | Reason |
|------|--------|
| `frontend/src/app/configuration/page.tsx` | Main Configuration page component |

## Frontend Tab Components
| File | Reason |
|------|--------|
| `frontend/src/app/configuration/components/SystemSettingsTab.tsx` | System settings (general, business hours, localization, notifications) |
| `frontend/src/app/configuration/components/BusinessRulesTab.tsx` | Business rules CRUD |
| `frontend/src/app/configuration/components/SecurityPoliciesTab.tsx` | Security policies CRUD |
| `frontend/src/app/configuration/components/IntegrationsTab.tsx` | Integration configs CRUD + test |
| `frontend/src/app/configuration/components/PerformanceTab.tsx` | Performance tuning configs |
| `frontend/src/app/configuration/components/MonitoringTab.tsx` | System monitoring & alerts |

## IPC / Domain Layer
| File | Reason |
|------|--------|
| `frontend/src/lib/ipc/domains/settings.ts` | IPC wrappers for settings operations |
| `frontend/src/lib/ipc/commands.ts` | Centralized IPC command name registry |
| `frontend/src/lib/ipc/core/index.ts` | Core `safeInvoke`, `cachedInvoke`, `invalidatePattern` |
| `frontend/src/lib/ipc/utils.ts` | `safeInvoke` implementation |
| `frontend/src/lib/ipc/cache.ts` | `cachedInvoke` implementation |

## Types
| File | Reason |
|------|--------|
| `frontend/src/types/configuration.types.ts` | All configuration-related TS types |
| `frontend/src/lib/ipc/types/settings.types.ts` | UserSettings type re-export |

## Backend Commands
| File | Reason |
|------|--------|
| `src-tauri/src/commands/settings/core.rs` | `get_app_settings`, `update_app_settings` (helper), `load_app_settings` |
| `src-tauri/src/commands/settings/preferences.rs` | `update_general_settings`, `update_user_preferences`, `update_user_performance` |
| `src-tauri/src/commands/settings/notifications.rs` | `update_notification_settings`, `update_user_notifications` |
| `src-tauri/src/commands/settings/security.rs` | `update_security_settings`, `update_user_security` |
| `src-tauri/src/commands/settings/profile.rs` | `get_user_settings`, `update_user_profile`, etc. |
| `src-tauri/src/commands/settings/accessibility.rs` | `update_user_accessibility` |
| `src-tauri/src/commands/settings/audit.rs` | `get_data_consent`, `update_data_consent` |

## Backend Services & Models
| File | Reason |
|------|--------|
| `src-tauri/src/services/settings.rs` | Settings business logic |
| `src-tauri/src/models/settings.rs` | Settings data models (AppSettings, SystemConfiguration, etc.) |

## Backend Registration
| File | Reason |
|------|--------|
| `src-tauri/src/main.rs` | Tauri `generate_handler![]` — registers all IPC commands |

## Shared / Supporting
| File | Reason |
|------|--------|
| `frontend/src/hooks/useLogger.ts` | Logging hook used in SystemSettingsTab, BusinessRulesTab |
| `frontend/src/contexts/AuthContext.tsx` | Provides `session` with auth token |
| `frontend/src/components/layout/PageShell.tsx` | Page layout wrapper |
| `frontend/src/components/layout/LoadingState.tsx` | Loading fallback component |
| `frontend/src/components/ui/page-header.tsx` | PageHeader + StatCard |
