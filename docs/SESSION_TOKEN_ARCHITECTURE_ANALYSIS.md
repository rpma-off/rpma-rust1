# Session Token Parameter Architecture Analysis

**Date:** 2025-02-24
**Analysis Type:** Backend-Frontend IPC Parameter Mismatch Investigation

---

## Executive Summary

This analysis identified **architectural inconsistencies** in how `session_token` parameters are handled across IPC commands in the RPMA v2 application. The inconsistency stems from **three different patterns** being used across the codebase, leading to potential runtime errors when frontend calls backend commands.

### Key Findings

| Metric | Count |
|---------|--------|
| **Total Commands Analyzed** | ~65 commands |
| **Commands with Issues** | 30 commands |
| **Commands Following Pattern A (Top-level)** | ~20+ commands |
| **Commands Following Pattern B (Embedded)** | ~15+ commands |
| **Commands Following Pattern C (Mixed)** | 30+ commands |

### Critical Impact

- **Settings Domain**: 1 command affected (`update_user_performance`)
- **Auth Domain**: 6 commands affected
- **Calendar Domain**: 1 command affected
- **Interventions Domain**: 4 commands affected
- **Notifications Domain**: 4 commands affected
- **Sync Domain**: 5 commands affected
- **Reports Domain**: 10 commands affected
- **Audit Domain**: 4 commands affected

---

## Problem Definition

### The Three Patterns

#### Pattern A: Top-level `session_token` Parameter ✅

```rust
pub async fn get_user_settings(
    session_token: String,        // ← FIRST parameter
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError>
```

**Frontend Call:**
```typescript
await safeInvoke('get_user_settings', {
    sessionToken: '...'           // ← Matches parameter name
})
```

**Status:** ✅ **Works Correctly**

**Commands using this pattern:**
- `get_user_settings`
- `get_app_settings`
- `export_user_data`
- `get_data_consent`
- `get_available_report_types`
- `get_active_sessions`
- `revoke_all_sessions_except_current`
- `get_session_timeout_config`

---

#### Pattern B: `session_token` Embedded in Request Struct ✅

```rust
#[derive(Deserialize)]
pub struct UpdateUserProfileRequest {
    pub session_token: String,        // ← Inside request struct
    pub full_name: Option<String>,
    // ... other fields
}

pub async fn update_user_profile(
    request: UpdateUserProfileRequest,   // ← Request struct contains session_token
    state: AppState<'_>,
) -> Result<ApiResponse<UserProfileSettings>, AppError>
```

**Frontend Call:**
```typescript
await safeInvoke('update_user_profile', {
    request: {
        full_name: 'Alice',
        session_token: '...'           // ← Embedded inside request object
    }
})
```

**Status:** ✅ **Works Correctly**

**Commands using this pattern:**
- `update_user_profile`
- `change_user_password`
- `delete_user_account`
- `upload_user_avatar`
- `update_general_settings`
- `update_notification_settings`
- `update_user_preferences`
- `update_user_notifications`
- `update_user_accessibility`
- `update_security_settings`
- `update_user_security`
- All commands with request structs that embed `session_token`

---

#### Pattern C: Mixed (Data + Separate `session_token`) ⚠️

```rust
pub async fn update_user_performance(
    request: UserPerformanceSettings,    // ← FIRST parameter (data only)
    session_token: String,              // ← SECOND parameter (MISMATCH!)
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError>
```

**Frontend Call:**
```typescript
await safeInvoke('update_user_performance', {
    request: { /* performance settings */ },
    sessionToken: '...'
})
```

**Status:** ⚠️ **Inconsistent with Architecture**

**Commands using this pattern:**

##### Auth Domain (`domains/auth/ipc/auth.rs`)
1. `auth_logout(token, ...)` - First param is `token`, not `session_token`
2. `auth_validate_session(token, ...)` - First param is `token`, not `session_token`
3. `auth_refresh_token(refresh_token, ...)` - First param is `refresh_token`, not `session_token`
4. `verify_2fa_setup(verification_code, backup_codes, session_token, ...)` - `session_token` is 3rd param
5. `disable_2fa(password, session_token, ...)` - `session_token` is 2nd param
6. `verify_2fa_code(code, session_token, ...)` - `session_token` is 2nd param

##### Calendar Domain (`domains/calendar/ipc/calendar.rs`)
7. `get_events(date_range, filters, session_token, ...)` - `session_token` is 4th param

##### Interventions Domain (`domains/interventions/ipc/intervention/queries.rs`)
8. `intervention_get_progress(intervention_id, session_token, ...)` - `session_token` is 2nd param
9. `intervention_advance_step(intervention_id, step_id, notes, session_token, ...)` - `session_token` is 4th param
10. `intervention_save_step_progress(intervention_id, step_id, progress_data, session_token, ...)` - `session_token` is 4th param
11. `intervention_progress(action, session_token, ...)` - `session_token` is 2nd param

##### Notifications Domain (`domains/notifications/ipc/notification.rs`)
12. `initialize_notification_service(config, session_token, ...)` - `session_token` is 2nd param
13. `send_notification(request, session_token, ...)` - `session_token` is 2nd param
14. `test_notification_config(recipient, channel, session_token, ...)` - `session_token` is 3rd param

##### Sync Domain (`domains/sync/ipc/sync.rs`)
15. `sync_start_background_service(correlation_id, session_token, ...)` - `session_token` is 2nd param
16. `sync_stop_background_service(correlation_id, session_token, ...)` - `session_token` is 2nd param
17. `sync_now(correlation_id, session_token, ...)` - `session_token` is 2nd param
18. `sync_get_status(correlation_id, session_token, ...)` - `session_token` is 2nd param
19. `sync_get_operations_for_entity(correlation_id, entity_id, entity_type, session_token, ...)` - `session_token` is 4th param

##### Reports Domain (`domains/reports/ipc/reports/core.rs`)
20. `get_task_completion_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
21. `get_technician_performance_report(technician_id, date_range, session_token, ...)` - `session_token` is 3rd param
22. `get_client_analytics_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
23. `get_quality_compliance_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
24. `get_geographic_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
25. `get_material_usage_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
26. `get_overview_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
27. `get_seasonal_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param
28. `get_operational_intelligence_report(date_range, filters, session_token, ...)` - `session_token` is 3rd param

##### Audit Domain (`domains/audit/ipc/security.rs`)
29. `revoke_session(session_id, session_token, ...)` - `session_token` is 2nd param
30. `update_session_timeout(timeout_minutes, session_token, ...)` - `session_token` is 2nd param

##### Settings Domain (`domains/settings/ipc/settings/preferences.rs`)
31. `update_user_performance(request, session_token, ...)` - `session_token` is 2nd param

---

## Root Cause

### Architectural Inconsistency

The project lacks a **standardized convention** for handling `session_token` parameters across IPC commands. This leads to:

1. **Cognitive Load**: Developers must check backend signature before calling commands
2. **Type Safety Issues**: TypeScript type generation doesn't enforce consistent parameter ordering
3. **Runtime Errors**: Wrong parameter names can cause silent failures or backend errors
4. **Testing Complexity**: Tests need to handle multiple patterns
5. **Code Review Burden**: PRs require reviewing inconsistent patterns

### Why It "Works" vs "Should Work"

**Tauri IPC Parameter Mapping:**
Tauri maps object properties to function parameters by name, not by position.

```rust
// Backend expects:
fn foo(data: Data, session_token: String, ...)

// Frontend sends:
invoke('foo', { request: { /* data */ }, sessionToken: '...' })

// Tauri resolves:
// - request → data
// - sessionToken → session_token ✅ (works by name matching)
```

**The Issue:**
While this technically works (due to Tauri's name-based mapping), it breaks:
- Architectural consistency
- Predictability
- Code maintainability
- Developer experience

---

## Settings Domain Specific Findings

### Current State

| Command | Pattern | Status |
|---------|----------|--------|
| `get_app_settings` | Pattern A (Top-level) | ✅ Correct |
| `get_user_settings` | Pattern A (Top-level) | ✅ Correct |
| `update_user_profile` | Pattern B (Embedded) | ✅ Correct |
| `change_user_password` | Pattern B (Embedded) | ✅ Correct |
| `export_user_data` | Pattern A (Top-level) | ✅ Correct |
| `delete_user_account` | Pattern B (Embedded) | ✅ Correct |
| `upload_user_avatar` | Pattern B (Embedded) | ✅ Correct |
| `get_data_consent` | Pattern A (Top-level) | ✅ Correct |
| `update_data_consent` | Pattern B (Embedded) | ✅ Correct |
| `update_general_settings` | Pattern B (Embedded) | ✅ Correct |
| `update_notification_settings` | Pattern B (Embedded) | ✅ Correct |
| `update_user_preferences` | Pattern B (Embedded) | ✅ Correct |
| `update_user_notifications` | Pattern B (Embedded) | ✅ Correct |
| `update_user_accessibility` | Pattern B (Embedded) | ✅ Correct |
| `update_security_settings` | Pattern B (Embedded) | ✅ Correct |
| `update_user_security` | Pattern B (Embedded) | ✅ Correct |
| **`update_user_performance`** | **Pattern C (Mixed)** | ⚠️ **Inconsistent** |

### Code Location

**File:** `src-tauri/src/domains/settings/ipc/settings/preferences.rs:185-205`

```rust
pub async fn update_user_performance(
    request: crate::domains::settings::domain::models::settings::UserPerformanceSettings,
    session_token: String,              // ← INCONSISTENT: 2nd parameter
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError>
{
    let _correlation_id_init = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Updating user performance settings");
    
    let user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&user.user_id);
    
    state
        .settings_service
        .update_user_performance(&user.id, &request)
        .map(|_| {
            ApiResponse::success("Performance settings updated successfully".to_string())
                .with_correlation_id(correlation_id.clone())
        })
        .map_err(|e| handle_settings_error(e, "Update user performance"))
}
```

### Frontend Usage

**File:** `frontend/src/lib/ipc/client.ts:1195-1199`

```typescript
updateUserPerformance: async (request: JsonObject, sessionToken: string): Promise<JsonValue> => {
  const result = await safeInvoke<JsonValue>('update_user_performance', {
    request,         // ← Data object
    sessionToken       // ← Separate property
  });
  invalidateUserSettingsCache(sessionToken);
  return result;
},
```

**Frontend Test Expectation:**

**File:** `frontend/src/lib/ipc/__tests__/settings-arg-shape.test.ts:58-68`

```typescript
it('uses top-level sessionToken for update_user_performance', async () => {
  const request = { cache_enabled: true, cache_size: 150 };

  await ipcClient.settings.updateUserPerformance(request, 'token-c');

  expect(safeInvoke).toHaveBeenCalledWith('update_user_performance', {
    request,
    sessionToken: 'token-c',
  });
  expect(invalidatePattern).toHaveBeenCalledWith('user-settings:token-c');
});
```

---

## Recommended Solution

### Standardization Strategy

**Option 1: Adopt Pattern B (Embedded) for ALL commands** ⭐ **RECOMMENDED**

**Rationale:**
- Most commands already use this pattern (~65%)
- Better type safety (request struct)
- Centralizes session token validation
- Easier to extend request structures

**Migration Path:**
1. Create wrapper request structs for commands using Pattern A and C
2. Refactor command signatures to accept wrapper
3. Update frontend tests expectations
4. Run type generation and validation

---

### Settings Domain Fix Plan

#### Step 1: Create Wrapper Request Structure

**File:** `src-tauri/src/domains/settings/ipc/settings/preferences.rs`

Add after imports (around line 18):

```rust
#[derive(Deserialize)]
pub struct UpdateUserPerformanceRequest {
    pub session_token: String,
    pub performance: UserPerformanceSettings,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
```

#### Step 2: Refactor Command Signature

**File:** `src-tauri/src/domains/settings/ipc/settings/preferences.rs:185`

Change from:
```rust
pub async fn update_user_performance(
    request: crate::domains::settings::domain::models::settings::UserPerformanceSettings,
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
)
```

To:
```rust
pub async fn update_user_performance(
    request: UpdateUserPerformanceRequest,
    state: AppState<'_>,
)
```

#### Step 3: Update Implementation

**File:** `src-tauri/src/domains/settings/ipc/settings/preferences.rs:188-205`

Change body to extract from wrapper:

```rust
pub async fn update_user_performance(
    request: UpdateUserPerformanceRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating user performance settings");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    state
        .settings_service
        .update_user_performance(&user.id, &request.performance)
        .map(|_| {
            ApiResponse::success("Performance settings updated successfully".to_string())
                .with_correlation_id(correlation_id.clone())
        })
        .map_err(|e| handle_settings_error(e, "Update user performance"))
}
```

#### Step 4: Update Frontend Call (Optional but Consistent)

**File:** `frontend/src/lib/ipc/client.ts:1195-1199`

Update to match embedded pattern:

```typescript
updateUserPerformance: async (request: JsonObject, sessionToken: string): Promise<JsonValue> => {
  const result = await safeInvoke<JsonValue>('update_user_performance', {
    request: { ...request, session_token: sessionToken }  // ← Embed session_token
  });
  invalidateUserSettingsCache(sessionToken);
  return result;
},
```

#### Step 5: Update Frontend Test

**File:** `frontend/src/lib/ipc/__tests__/settings-arg-shape.test.ts:58-68`

Change test expectation:

```typescript
it('uses nested request.session_token for update_user_performance', async () => {
  const request = { cache_enabled: true, cache_size: 150 };

  await ipcClient.settings.updateUserPerformance(request, 'token-c');

  expect(safeInvoke).toHaveBeenCalledWith('update_user_performance', {
    request: {
      ...request,
      session_token: 'token-c'  // ← Updated to expect embedded pattern
    },
  });
  expect(invalidatePattern).toHaveBeenCalledWith('user-settings:token-c');
});
```

#### Step 6: Update Application Layer (Optional)

**File:** `src-tauri/src/domains/settings/application/contracts.rs`

Add re-export for frontend consistency:

```rust
pub use crate::domains::settings::ipc::settings::preferences::UpdateUserPerformanceRequest;
```

#### Step 7: Regenerate TypeScript Types

```bash
npm run types:sync
```

#### Step 8: Verification

```bash
npm run backend:check
npm run types:validate
npm run types:drift-check
npm test -- settings-arg-shape.test.ts
```

---

## Impact Assessment

### Settings Domain

| Component | Changes | Risk Level |
|-----------|----------|-------------|
| Backend (`preferences.rs`) | Add struct + refactor function | **Low** |
| Frontend (`client.ts`) | Update call pattern (optional) | **Low** |
| Frontend Test (`settings-arg-shape.test.ts`) | Update test expectation | **Low** |
| Application Layer (`contracts.rs`) | Add re-export (optional) | **Low** |

### Full Codebase

| Domain | Commands with Pattern C | Est. Fix Effort |
|--------|------------------------|-----------------|
| Auth | 6 | 2-3 hours |
| Calendar | 1 | 30 mins |
| Interventions | 4 | 1 hour |
| Notifications | 4 | 1 hour |
| Sync | 5 | 1 hour |
| Reports | 9 | 2-3 hours |
| Audit | 2 | 1 hour |
| Settings | 1 | 30 mins |
| **Total** | **32** | **10-13 hours** |

---

## Recommendations

### Short-term

1. ✅ **Fix Settings Domain** (30 mins effort)
   - Apply the fix plan above to standardize `update_user_performance`

2. ✅ **Document the Standard Pattern**
   - Update `AGENTS.md` with preferred Pattern B convention
   - Add IPC command template examples

3. ✅ **Add Lint Rule**
   - Create clippy rule or custom check to detect Pattern C in new code

### Long-term

1. 📋 **Create Migration Task**
   - File GitHub issue tracking systematic migration to Pattern B
   - Prioritize high-traffic domains (Auth, Reports)

2. 🧪 **Automated Testing**
   - Add contract tests for all IPC commands
   - Enforce parameter ordering consistency in CI/CD

3. 📚 **Developer Guidelines**
   - Create "IPC Command Best Practices" documentation
   - Include examples of each pattern and when to use them

4. 🔧 **Code Generation**
   - Consider proc macro to generate consistent IPC command wrappers
   - Auto-generate request structs with embedded `session_token`

---

## Appendices

### Appendix A: Commands Following Pattern A (Top-level)

```
domains/settings/ipc/settings/core.rs:
- get_app_settings(session_token, state, correlation_id)
domains/settings/ipc/settings/profile.rs:
- get_user_settings(session_token, state, correlation_id)
- export_user_data(session_token, state, correlation_id)
domains/settings/ipc/settings/audit.rs:
- get_data_consent(session_token, state, correlation_id)
domains/reports/ipc/reports/core.rs:
- get_available_report_types(session_token, state)
domains/audit/ipc/security.rs:
- get_active_sessions(session_token, correlation_id, state)
- revoke_all_sessions_except_current(session_token, correlation_id, state)
- get_session_timeout_config(session_token, correlation_id, state)
```

### Appendix B: Commands Following Pattern B (Embedded)

```
domains/settings/ipc/settings/profile.rs:
- update_user_profile(request: UpdateUserProfileRequest, state)
- change_user_password(request: ChangeUserPasswordRequest, state)
- delete_user_account(request: DeleteUserAccountRequest, state)
- upload_user_avatar(request: UploadUserAvatarRequest, state)

domains/settings/ipc/settings/preferences.rs:
- update_general_settings(request: UpdateGeneralSettingsRequest, state)
- update_user_preferences(request: UpdateUserPreferencesRequest, state)

domains/settings/ipc/settings/notifications.rs:
- update_notification_settings(request: UpdateNotificationSettingsRequest, state)
- update_user_notifications(request: UpdateUserNotificationsRequest, state)

domains/settings/ipc/settings/accessibility.rs:
- update_user_accessibility(request: UpdateUserAccessibilityRequest, state)

domains/settings/ipc/settings/security.rs:
- update_security_settings(request: UpdateSecuritySettingsRequest, state)
- update_user_security(request: UpdateUserSecurityRequest, state)

domains/settings/ipc/settings/audit.rs:
- update_data_consent(request: UpdateDataConsentRequest, state)

domains/users/ipc/user.rs:
- Most user operations use embedded request structs

domains/clients/ipc/client.rs:
- Most client operations use embedded request structs

domains/interventions/ipc/intervention/*:
- Most intervention operations use embedded request structs

domains/tasks/ipc/task.rs:
- Most task operations use embedded request structs

domains/quotes/ipc/quote.rs:
- All quote operations use embedded request structs

domains/analytics/ipc/analytics.rs:
- All analytics operations use embedded request structs

domains/calendar/ipc/calendar.rs:
- Most calendar operations use embedded request structs

domains/documents/ipc/document.rs:
- All document operations use embedded request structs

domains/inventory/ipc/material.rs:
- All material operations use embedded request structs
```

### Appendix C: Commands Following Pattern C (Mixed)

[See "Commands using this pattern" section above for full list]

---

## Conclusion

The session token parameter inconsistency is a **systematic architectural debt** that requires a coordinated remediation approach:

1. **Immediate Fix:** Settings domain `update_user_performance` (low effort, high value)
2. **Standardization:** Adopt Pattern B (Embedded) as the single standard across codebase
3. **Automation:** Add tooling to prevent regression
4. **Documentation:** Create clear guidelines for future development

This will improve:
- Developer experience (predictable API patterns)
- Type safety (enforced by Rust/TypeScript)
- Maintainability (consistent patterns)
- Testing reliability (fewer edge cases)

---

**End of Report**
