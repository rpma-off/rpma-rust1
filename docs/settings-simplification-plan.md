# Settings Simplification Implementation Plan

## Overview

This plan consolidates and simplifies the settings functionality by:
1. Removing placeholder implementations (GDPR, sessions, avatar)
2. Consolidating overlapping models
3. Reducing frontend tabs from 10 to 4
4. Adding ADR-008 validation
5. Moving password change to auth domain

---

## Phase 1: Backend - Validation

### 1.1 Add Phone Validator

**File**: `src-tauri/src/shared/services/validation/field_validators.rs`

Add to `impl ValidationService`:

```rust
/// Validate phone number (French format with international support)
pub fn validate_phone(&self, phone: &str) -> Result<Option<String>, ValidationError> {
    let trimmed = phone.trim();
    
    // Phone is optional
    if trimmed.is_empty() {
        return Ok(None);
    }
    
    if trimmed.len() > 20 {
        return Err(ValidationError::InputTooLong {
            field: "phone".to_string(),
            max: 20,
        });
    }
    
    // Allow: +33, 0X, international formats
    // Pattern: optional +, digits, spaces, dots, hyphens
    let phone_regex = Regex::new(r"^\+?[0-9\s\.\-]+$")
        .map_err(|_| ValidationError::Message("Invalid regex pattern".to_string()))?;
    
    if !phone_regex.is_match(trimmed) {
        return Err(ValidationError::Message(
            "Phone number can only contain digits, spaces, dots and hyphens".to_string()
        ));
    }
    
    // Remove spaces and formatting for storage
    let cleaned = trimmed.chars().filter(|c| c.is_numeric() || *c == '+').collect();
    Ok(Some(cleaned))
}
```

---

## Phase 2: Backend - Auth Domain Password Change

### 2.1 Add Password Change Request Type

**File**: `src-tauri/src/domains/auth/domain/models/auth.rs`

Add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}
```

### 2.2 Add Password Change IPC Command

**File**: `src-tauri/src/domains/auth/ipc/auth.rs`

Add:

```rust
#[tauri::command]
#[instrument(skip(state))]
pub async fn change_password(
    request: ChangePasswordRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, Some(&ctx.auth.user_id));
    
    // Validate new password strength
    let validation = ValidationService::new();
    let new_password = validation.validate_password(&request.new_password)
        .map_err(|e| AppError::Validation(e.to_string()))?;
    
    // Verify current password
    let auth_service = state.auth_service.clone();
    let is_valid = auth_service.verify_user_password(&ctx.auth.user_id, &request.current_password)
        .map_err(|e| AppError::Authentication(format!("Invalid current password: {}", e)))?;
    
    if !is_valid {
        return Err(AppError::Authentication("Current password is incorrect".to_string()));
    }
    
    // Update password
    auth_service.change_password(&ctx.auth.user_id, &new_password)
        .map_err(|e| AppError::Internal(format!("Failed to change password: {}", e)))?;
    
    info!(user_id =% ctx.auth.user_id, "Password changed successfully");
    
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}
```

### 2.3 Register Command in main.rs

**File**: `src-tauri/src/main.rs`

Add to invoke handler:
```rust
domains::auth::ipc::auth::change_password,
```

### 2.4 Export Request Type

**File**: `src-tauri/src/domains/auth/mod.rs`

Ensure `ChangePasswordRequest` is exported publicly.

---

## Phase 3: Backend - Remove Placeholders

### 3.1 Remove Placeholder Handlers

**File**: `src-tauri/src/domains/settings/user_settings_handler.rs`

Remove these functions entirely:
- `change_user_password` (lines ~108-115)
- `export_user_data` (lines ~118-125)
- `delete_user_account` (lines ~128-135)
- `get_data_consent` (lines ~98-105)
- `update_data_consent` (lines ~138-145)
- `upload_user_avatar` (lines ~148-155)

### 3.2 Remove Commands from main.rs

**File**: `src-tauri/src/main.rs`

Remove from invoke handler:
```rust
// Remove these:
domains::settings::user_settings_handler::change_user_password,
domains::settings::user_settings_handler::export_user_data,
domains::settings::user_settings_handler::delete_user_account,
domains::settings::user_settings_handler::get_data_consent,
domains::settings::user_settings_handler::update_data_consent,
domains::settings::user_settings_handler::upload_user_avatar,
```

### 3.3 Remove DataConsent Model

**File**: `src-tauri/src/domains/settings/models.rs`

Remove the `DataConsent` struct (lines ~917-928).

### 3.4 Update Repository Trait

**File**: `src-tauri/src/domains/settings/infrastructure/repository_traits.rs`

Remove from `UserSettingsPort` trait:
```rust
fn get_data_consent(&self, user_id: &str) -> Result<Option<DataConsent>, AppError>;
```

### 3.5 Update Service

**File**: `src-tauri/src/domains/settings/application/settings_service.rs`

Remove:
- `get_data_consent` method (lines ~408-412)

---

## Phase 4: Backend - Add Validation

### 4.1 Update Settings Service

**File**: `src-tauri/src/domains/settings/application/settings_service.rs`

Add import:
```rust
use crate::shared::services::validation::ValidationService;
```

Update `update_user_profile`:
```rust
pub fn update_user_profile(
    &self,
    ctx: &RequestContext,
    profile: UserProfileSettings,
) -> Result<UserSettings, AppError> {
    require_at_least_viewer(ctx)?;
    
    // ADR-008: Validate inputs
    let validation = ValidationService::new();
    let mut profile = profile;
    
    // Validate and normalize name
    if !profile.full_name.trim().is_empty() {
        profile.full_name = validation.validate_name(&profile.full_name, "Full name")
            .map_err(|e| AppError::Validation(e.to_string()))?;
    }
    
    // Validate email if provided
    if !profile.email.trim().is_empty() {
        profile.email = validation.validate_email(&profile.email)
            .map_err(|e| AppError::Validation(e.to_string()))?;
    }
    
    // Validate phone if provided
    if let Some(ref phone) = profile.phone {
        if !phone.trim().is_empty() {
            profile.phone = validation.validate_phone(phone)
                .map_err(|e| AppError::Validation(e.to_string()))?;
        }
    }
    
    // ... rest of existing logic
    let repo = &self.user_settings_repo;
    let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
    current.profile = profile;
    repo.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(current)
}
```

### 4.2 Update Organization Validation

**File**: `src-tauri/src/domains/settings/models.rs`

The `CreateOrganizationRequest.validate()` method already exists. Ensure it uses ValidationService:

```rust
impl CreateOrganizationRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Organization name is required".to_string());
        }
        if self.name.len() > 200 {
            return Err("Organization name must be 200 characters or less".to_string());
        }
        if let Some(ref email) = self.email {
            if !email.is_empty() {
                // Use ValidationService pattern
                if !is_valid_email(email) {
                    return Err("Invalid email format".to_string());
                }
            }
        }
        Ok(())
    }
}
```

---

## Phase 5: Frontend - IPC Changes

### 5.1 Update IPC Commands File

**File**: `src-tauri/src/shared/ipc/commands.rs` (or equivalent)

Remove:
```rust
// Remove from IPC_COMMANDS:
CHANGE_USER_PASSWORD,
EXPORT_USER_DATA,
DELETE_USER_ACCOUNT,
GET_DATA_CONSENT,
UPDATE_DATA_CONSENT,
UPLOAD_USER_AVATAR,
```

Add:
```rust
CHANGE_PASSWORD: "change_password",
```

### 5.2 Update Frontend IPC

**File**: `frontend/src/lib/ipc/commands.ts`

Update command mappings accordingly.

### 5.3 Update Settings IPC Client

**File**: `frontend/src/domains/settings/ipc/settings.ipc.ts`

Remove methods:
- `changeUserPassword`
- `exportUserData`
- `deleteUserAccount`
- `getDataConsent`
- `updateDataConsent`
- `uploadUserAvatar`

Remove session methods:
- `getActiveSessions`
- `revokeSession`
- `revokeAllSessionsExceptCurrent`
- `updateSessionTimeout`
- `getSessionTimeoutConfig`

### 5.4 Add Auth IPC for Password Change

**File**: `frontend/src/domains/auth/ipc/auth.ipc.ts` (create if needed)

Add:
```typescript
export const authIpc = {
  changePassword: (currentPassword: string, newPassword: string) =>
    safeInvoke<void>(IPC_COMMANDS.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    },
  // ... other auth methods
};
```

---

## Phase 6: Frontend - Simplify Components

### 6.1 Simplify SettingsPageContent

**File**: `frontend/src/domains/settings/components/SettingsPageContent.tsx`

**Changes**:

1. Remove lazy imports for admin tabs:
```typescript
// REMOVE these imports
const SystemSettingsTabLazy = dynamic(...)
const BusinessRulesTabLazy = dynamic(...)
const SecurityPoliciesTabLazy = dynamic(...)
const IntegrationsTabLazy = dynamic(...)
const PerformanceTabLazy = dynamic(...)
const MonitoringTabLazy = dynamic(...)
```

2. Simplify `TabConfig`:
```typescript
type TabId = "profile" | "preferences" | "security" | "organization";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const getTabConfig = (
  t: (key: string, params?: Record<string, string | number>) => string,
  isAdmin: boolean,
): TabConfig[] => {
  const all: TabConfig[] = [
    { id: "profile", label: t("nav.profile"), icon: User },
    { id: "preferences", label: t("settings.preferences"), icon: Settings },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "organization", label: "Atelier", icon: Building2, adminOnly: true },
  ];
  return all.filter((tab) => !tab.adminOnly || isAdmin);
};
```

3. Remove `TabsContent` for removed tabs:
```typescript
// REMOVE these TabContent blocks
<TabsContent value="system" ... />
<TabsContent value="business" ... />
<TabsContent value="security-policies" ... />
<TabsContent value="integrations" ... />
<TabsContent value="performance" ... />
<TabsContent value="monitoring" ... />
```

4. Remove `useSystemHealth` hook usage

### 6.2 Simplify SecurityTab

**File**: `frontend/src/domains/settings/components/SecurityTab.tsx`

**Changes**:

1. Remove session-related state and hooks
2. Keep only password change form
3. Use auth IPC instead of settings IPC:

```typescript
'use client';

import React, { useState } from 'react';
import { Shield, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserSession } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';

export interface SecurityTabProps {
  user: UserSession;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'SecurityTab',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsChanging(true);
    logUserAction('Password change initiated', { userId: user.user_id });

    try {
      await ipcClient.auth.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      logInfo('Password changed successfully', { userId: user.user_id });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe';
      setError(message);
      logError('Password change failed', { error: message, userId: user.user_id });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Mot de passe modifié avec succès
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>
            Modifiez votre mot de passe de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 caractères, avec majuscules, minuscules et chiffres
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChanging ||!currentPassword || !newPassword || !confirmPassword}
            >
              {isChanging ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {isChanging ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 6.3 Simplify PreferencesTab

**File**: `frontend/src/domains/settings/components/PreferencesTab.tsx`

**Changes**:

1. Merge accessibility settings into preferences form
2. Remove unused notification channels (email, SMS, push - keep in_app only)
3. Simplify quiet hours UI

The accessibility fields (`high_contrast`, `large_text`, `reduce_motion`) are already in `UserPreferences` model, so just add them to the form if not present.

### 6.4 Remove useSecurityTabData Hook

**File**: `frontend/src/domains/settings/hooks/useSecurityTabData.ts`

Remove file entirely (session management removed).

### 6.5 Update useSettingsActions

**File**: `frontend/src/domains/settings/api/useSettingsActions.ts`

Remove:
- `changePassword` mutation -> moved to auth domain
- Remove session-related mutations if any

### 6.6 Remove Session-Related Types

**File**: `frontend/src/domains/settings/api/types.ts`

Remove session-related types if present.

---

## Phase 7: Type Sync

### 7.1 Run Type Sync

```bash
npm run types:sync
```

This will regenerate TypeScript types from Rust models, removing:
- `DataConsent` type
- Session-related types
- Adding `ChangePasswordRequest` type from auth domain

### 7.2 Update Frontend Types

**File**: `frontend/src/lib/backend.ts` (auto-generated)

Verify that removed types are gone and new types are present.

---

## Phase 8: Remove Unused Hooks and Files

### 8.1 Files to Remove

```
frontend/src/domains/settings/hooks/useSecurityTabData.ts
frontend/src/domains/settings/api/configurationService.ts (if unused)
```

### 8.2 Files to Keep (Simplified)

- `frontend/src/domains/settings/components/SettingsPageContent.tsx`
- `frontend/src/domains/settings/components/ProfileSettingsTab.tsx`
- `frontend/src/domains/settings/components/PreferencesTab.tsx`
- `frontend/src/domains/settings/components/SecurityTab.tsx`
- `frontend/src/domains/settings/components/OrganizationSettingsTab.tsx`
- `frontend/src/domains/settings/api/useSettings.ts`
- `frontend/src/domains/settings/api/useSettingsActions.ts`
- `frontend/src/domains/settings/api/useOrganization.ts`
- `frontend/src/domains/settings/hooks/usePreferencesForm.ts`
- `frontend/src/domains/settings/hooks/useProfileSettingsActions.ts`

---

## Phase 9: Database (No Changes Required)

The database schema already supports the simplified models. No migrations needed because:
- `user_settings` table keeps all fields (no schema change)
- `DataConsent` was never persisted (placeholder)
- Sessions are managed in auth domain

---

## Phase 10: Tests

### 10.1 Add Validation Tests

**File**: `src-tauri/src/shared/services/validation/tests.rs`

Add tests for `validate_phone`:

```rust
#[test]
fn test_validate_phone_valid() {
    let svc = ValidationService::new();
    assert!(svc.validate_phone("+33612345678").is_ok());
    assert!(svc.validate_phone("0612345678").is_ok());
    assert!(svc.validate_phone("").is_ok()); // Optional
}

#[test]
fn test_validate_phone_invalid() {
    let svc = ValidationService::new();
    assert!(svc.validate_phone("abc").is_err());
    assert!(svc.validate_phone("12345678901234567890123").is_err()); // Too long
}
```

### 10.2 Add Password Change Tests

**File**: `src-tauri/src/domains/auth/tests/password_change.rs` (create)

```rust
#[tokio::test]
async fn test_change_password_success() {
    // Setup: create user with known password
    // Exercise: call change_password
    // Assert: password changed successfully
}

#[tokio::test]
async fn test_change_password_wrong_current() {
    // Setup: create user
    // Exercise: call change_password with wrong current password
    // Assert: returns Authentication error
}

#[tokio::test]
async fn test_change_password_weak_new() {
    // Setup: create user
    // Exercise: call change_password with weak new password
    // Assert: returns Validation error
}
```

### 10.3 Update Settings Tests

**File**: `src-tauri/src/domains/settings/tests/unit.rs`

Remove tests for:
- `get_data_consent`
- Any removed functionality

---

## Verification Checklist

After implementation, verify:

### Backend
- [ ] `cargo check` passes
- [ ] `cargo test --workspace` passes
- [ ] All ADRs satisfied:
  - [ ] ADR-001: Four-layer architecture maintained
  - [ ] ADR-005: Repository pattern preserved
  - [ ] ADR-006: RequestContext pattern followed
  - [ ] ADR-007: RBAC enforced correctly
  - [ ] ADR-008: Validation uses ValidationService
  - [ ] ADR-018: IPC handlers are thin
  - [ ] ADR-019: Errors use AppError

### Frontend
- [ ] `npm run frontend:type-check` passes
- [ ] `npm run frontend:lint` passes
- [ ] Only 4 tabs visible in Settings
- [ ] Password change works via Auth IPC
- [ ] Preferences save correctly
- [ ] Organization settings save correctly

### Integration
- [ ] `npm run types:sync` completes without errors
- [ ] Type definitions match backend models
- [ ] IPC commands registered correctly

---

## Rollback Plan

If issues arise:

1. **Phase 1-2 (Validation + Password)**: Can be reverted independently
2. **Phase 3-5 (Removals)**: Git revert the commit
3. **Phase 6 (Frontend)**: Restore deleted components from git

Key files to restore:
- `frontend/src/domains/settings/hooks/useSecurityTabData.ts`
- `frontend/src/domains/settings/api/configurationService.ts`

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Validation | 1 hour |
| Phase 2: Auth Password | 2 hours |
| Phase 3: Remove Placeholders | 1 hour |
| Phase 4: Add Validation | 2 hours |
| Phase 5: Frontend IPC | 1 hour |
| Phase 6: Simplify Components | 3 hours |
| Phase 7: Type Sync | 30 min |
| Phase 8: Cleanup | 30 min |
| Phase 9: Database | 0 (no changes) |
| Phase 10: Tests | 2 hours |
| **Total** | **~13 hours** |

---

## Command Execution Order

```bash
# 1. Backend changes
cd src-tauri
cargo check

# 2. Type sync
cd ..
npm run types:sync

# 3. Frontend changes
cd frontend
npm run type-check
npm run lint

# 4. Run tests
cd ../src-tauri
cargo test

# 5. Integration test
cd ..
npm run doctor -- --full
```