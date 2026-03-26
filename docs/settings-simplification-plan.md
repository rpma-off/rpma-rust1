# Settings Simplification Implementation Plan

## Overview

This plan cleans up placeholder implementations and moves password change to the correctdomain boundary:

1. **Move password change to auth domain** (correct bounded context)
2. **Remove GDPR placeholder implementations** (not needed for offline desktop app)
3. **Remove DataConsent model** (unused)
4. **Implement avatar upload with local file storage** (store on user's computer)
5. **Use app logo as avatar fallback** (when user hasn't uploaded avatar)

### What We Keep

- **Session management** - Fully working, useful security feature
- **Admin configuration tabs** - Used by admin users, properly gated
- **Avatar upload UI** - Will store locally instead of placeholder

### What We Remove

- `change_user_password` placeholder → moved to auth domain
- `export_user_data` placeholder → GDPR, not needed
- `delete_user_account` placeholder → GDPR, not needed  
- `get_data_consent` placeholder → GDPR, not needed
- `update_data_consent` placeholder → GDPR, not needed
- `DataConsent` model → unused

---

## Phase 1: Backend - Add Password Change to Auth Domain

### 1.1 Add Password Change Request Type

**File**: `src-tauri/src/domains/auth/domain/models/auth.rs`

Add after `SessionTimeoutConfig`:

```rust
/// Request payload for password change.
/// User must provide current password for verification before setting new password.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}
```

### 1.2 Add Password Change IPC Command

**File**: `src-tauri/src/domains/auth/ipc/auth.rs`

Add the following command:

```rust
/// Change user password.
/// ADR-018: Thin IPC layer — validation and password update delegated to AuthService.
#[tauri::command]
#[instrument(skip(state))]
pub async fn change_password(
    request: ChangePasswordRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, Some(&ctx.auth.user_id));
    
    // ADR-008: Validate new password strength
    let validation = ValidationService::new();
    let new_password = validation.validate_password(&request.new_password)
        .map_err(|e| AppError::Validation(e.to_string()))?;
    
    // Verify current password
    let auth_service = state.auth_service.clone();
    let is_valid = auth_service.verify_password(&ctx.auth.user_id, &request.current_password)
        .map_err(|e| AppError::Authentication(format!("Invalid current password: {}", e)))?;
    
    if !is_valid {
        return Err(AppError::Authentication("Current password is incorrect".to_string()));
    }
    
    // Update password
    auth_service.change_password(&ctx.auth.user_id, &new_password)
        .map_err(|e| AppError::Internal(format!("Failed to change password: {}", e)))?;
    
    info!(user_id = %ctx.auth.user_id, "Password changed successfully");
    
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}
```

**Note**: This requires `ValidationService` to be imported:
```rust
use crate::shared::services::validation::ValidationService;
```

### 1.3 Register Command in main.rs

**File**: `src-tauri/src/main.rs`

Add to invoke handler after `auth_validate_session`:
```rust
domains::auth::ipc::auth::change_password,
```

### 1.4 Export Request Type from Auth Module

**File**: `src-tauri/src/domains/auth/mod.rs`

Add export:
```rust
pub use domain::models::auth::ChangePasswordRequest;
```

---

## Phase 2: Backend - Remove Placeholder Handlers

### 2.1 Delete User Settings Handler File

**File**: `src-tauri/src/domains/settings/user_settings_handler.rs`

**Action**: Delete entire file.

This file contains only placeholder implementations:
- `get_data_consent` - lines97-105
- `change_user_password` - lines108-115
- `export_user_data` - lines118-125
- `delete_user_account` - lines128-135
- `update_data_consent` - lines138-145

**Note**: `upload_user_avatar` is removed from this file but will be reimplemented properly in Phase 3.

### 2.2 Update Settings Module Exports

**File**: `src-tauri/src/domains/settings/mod.rs`

Remove the `user_settings_handler` module and its re-exports.

### 2.3 Remove Commands from main.rs

**File**: `src-tauri/src/main.rs`

Remove these lines from the invoke_handler:
```rust
domains::settings::change_user_password,
domains::settings::export_user_data,
domains::settings::delete_user_account,
domains::settings::get_data_consent,
domains::settings::update_data_consent,
// Note: upload_user_avatar will be reimplemented in Phase 3
```

### 2.4 Remove DataConsent Model

**File**: `src-tauri/src/domains/settings/models.rs`

Remove the `DataConsent` struct (lines ~917-928):
```rust
// DELETE THIS:
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DataConsent {
    pub user_id: String,
    pub analytics_consent: bool,
    pub marketing_consent: bool,
    pub third_party_sharing: bool,
    pub data_retention_period: u32,
    #[ts(type = "string")]
    pub consent_given_at: chrono::DateTime<chrono::Utc>,
    pub consent_version: String,
}
```

### 2.5 Update Repository Trait

**File**: `src-tauri/src/domains/settings/infrastructure/repository_traits.rs`

Remove from `UserSettingsPort` trait:
```rust
fn get_data_consent(&self, user_id: &str) -> Result<Option<DataConsent>, AppError>;
```

### 2.6 Update Repository Implementation

**File**: `src-tauri/src/domains/settings/user_settings_repository.rs`

Remove `get_data_consent` implementation.

### 2.7 Update Settings Service

**File**: `src-tauri/src/domains/settings/application/settings_service.rs`

1. Remove `DataConsent` from imports
2. Remove `get_data_consent` method (lines ~408-412)

---

## Phase 3: Backend - Implement Avatar Upload

### 3.1 Create Avatar Storage Module

**File**: `src-tauri/src/domains/settings/avatar_handler.rs` (create new)

```rust
//! Avatar upload handler with local file storage.
//!
//! Stores avatar images in the app's data directory on the user's computer.
//! ADR-018: Thin IPC layer — file operations delegated to dedicated module.

use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use tracing::{info, warn, instrument};

use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::shared::services::validation::ValidationService;

/// Request payload for avatar upload.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct UploadAvatarRequest {
    /// Base64-encoded image data (without data URL prefix)
    pub avatar_data: String,
    /// MIME type (e.g., "image/png", "image/jpeg")
    pub mime_type: String,
}

/// Response after successful avatar upload.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct UploadAvatarResponse {
    /// Path to the stored avatar file (for frontend display)
    pub avatar_url: String,
}

/// Supported image formats for avatar upload.
const SUPPORTED_FORMATS: [&str; 3] = ["image/png", "image/jpeg", "image/gif"];
const MAX_FILE_SIZE_BYTES: usize = 5* 1024 * 1024; // 5MB

/// Get the avatar storage directory.
fn get_avatar_directory() -> Result<PathBuf, AppError> {
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| AppError::Internal("Could not determine app data directory".to_string()))?
        .join("rpma-rust")
        .join("avatars");
    
    // Ensure directory exists
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| AppError::Internal(format!("Failed to create avatar directory: {}", e)))?;
    }
    
    Ok(app_data_dir)
}

/// Get file extension from MIME type.
fn get_extension(mime_type: &str) -> Result<&'static str, AppError> {
    match mime_type {
        "image/png" => Ok("png"),
        "image/jpeg" => Ok("jpg"),
        "image/gif" => Ok("gif"),
        _ => Err(AppError::Validation(format!("Unsupported image format: {}. Supported formats: PNG, JPEG, GIF", mime_type))),
    }
}

/// Upload and store user avatar.
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn upload_user_avatar(
    request: UploadAvatarRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, Some(&ctx.auth.user_id));
    
    // Validate MIME type
    if !SUPPORTED_FORMATS.contains(&request.mime_type.as_str()) {
        return Err(AppError::Validation(
            format!("Unsupported image format: {}. Supported formats: PNG, JPEG, GIF", request.mime_type)
        ));
    }
    
    // Decode base64 data
    let image_data = general_purpose::STANDARD
        .decode(&request.avatar_data)
        .map_err(|e| AppError::Validation(format!("Invalid image data: {}", e)))?;
    
    // Validate file size
    if image_data.len() > MAX_FILE_SIZE_BYTES {
        return Err(AppError::Validation(format!(
            "Image too large. Maximum size is {}MB",
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
        )));
    }
    
    // Get file extension
    let extension = get_extension(&request.mime_type)?;
    
    // Generate file path
    let avatar_dir = get_avatar_directory()?;
    let filename = format!("{}.{}", ctx.auth.user_id, extension);
    let file_path = avatar_dir.join(&filename);
    
    // Write file
    fs::write(&file_path, &image_data)
        .map_err(|e| AppError::Internal(format!("Failed to save avatar: {}", e)))?;
    
    // Generate URL for frontend
    // Use tauri://localhost or file:// protocol for local files
    let avatar_url = format!("local-avatar://{}", filename);
    
    info!(user_id = %ctx.auth.user_id, avatar_url = %avatar_url, "Avatar uploaded successfully");
    
    Ok(ApiResponse::success(avatar_url).with_correlation_id(Some(correlation_id)))
}
```

### 3.2 Add to Settings Module

**File**: `src-tauri/src/domains/settings/mod.rs`

Add:
```rust
pub mod avatar_handler;
pub use avatar_handler::upload_user_avatar;
```

### 3.3 Update main.rs

**File**: `src-tauri/src/main.rs`

Add after other settings commands:
```rust
domains::settings::avatar_handler::upload_user_avatar,
```

### 3.4 Add base64 Dependency

**File**: `src-tauri/Cargo.toml`

Add to dependencies:
```toml
base64 = "0.22"
```

---

## Phase 4: Frontend - Update IPC Commands

### 4.1 Update Commands File

**File**: `frontend/src/lib/ipc/commands.ts`

Remove these commands:
```typescript
CHANGE_USER_PASSWORD,
EXPORT_USER_DATA,
DELETE_USER_ACCOUNT,
GET_DATA_CONSENT,
UPDATE_DATA_CONSENT,
```

Add new command:
```typescript
CHANGE_PASSWORD: "change_password",
```

### 4.2 Keep Upload Avatar Command

The `UPLOAD_USER_AVATAR` command remains but will use the new local storage implementation.

---

## Phase 5: Frontend - Update IPC Clients

### 5.1 Create/Update Auth IPC Client

**File**: `frontend/src/domains/auth/ipc/auth.ipc.ts`

Add password change method:

```typescript
import { safeInvoke } from "@/lib/ipc/core";
import { IPC_COMMANDS } from "@/lib/ipc/commands";

export const authIpc = {
  changePassword: (currentPassword: string, newPassword: string) =>
    safeInvoke<void>(IPC_COMMANDS.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  // ... other auth methods (login, logout, etc.)
};
```

### 5.2 Update Settings IPC Client

**File**: `frontend/src/domains/settings/ipc/settings.ipc.ts`

Remove these methods:
- `changeUserPassword`
- `exportUserData`
- `deleteUserAccount`
- `getDataConsent`
- `updateDataConsent`

Keep these methods:
- `uploadUserAvatar` - will use new local storage backend
- All session methods - `getActiveSessions`, `revokeSession`, `revokeAllSessionsExceptCurrent`, `updateSessionTimeout`, `getSessionTimeoutConfig`

---

## Phase 6: Frontend - Update SecurityTab

### 6.1 Update Password Change to Use Auth IPC

**File**: `frontend/src/domains/settings/hooks/useSecurityTabData.ts`

Remove the `changePassword` mutation (it will use auth IPC directly).

Keep all session-related functionality:
- `sessionsQuery`
- `timeoutQuery`
- `revokeMutation`
- `revokeAllMutation`
- `saveTimeoutMutation`

### 6.2 Update SecurityTab Component

**File**: `frontend/src/domains/settings/components/SecurityTab.tsx`

Update the password change handler to use auth IPC:

```typescript
// In handleChangePassword function, replace:
await changePassword({ current_password, new_password, confirm_password });

// With:
import { authIpc } from "@/domains/auth/ipc/auth.ipc";
// ...
await authIpc.changePassword(currentPassword, newPassword);
```

**Important**: Keep all session management UI (sessions list, revoke buttons, timeout selector). Do NOT remove these.

---

## Phase 7: Frontend - Update Avatar Fallback

### 7.1 Update ProfileSettingsTab

**File**: `frontend/src/domains/settings/components/ProfileSettingsTab.tsx`

Update the avatar display to use app logo as fallback:

```typescript
<Avatar className="h-20 w-20">
  <AvatarImage
    src={userSettings?.profile?.avatar_url || "/images/logo.png"}
    alt={`${profile?.first_name} ${profile?.last_name}`}
  />
  <AvatarFallback className="text-lg">
    {`${profile?.first_name} ${profile?.last_name}`
      .split(" ")
      .map((n: string) => n[0])
      .join("") || "U"}
  </AvatarFallback>
</Avatar>
```

The fallback chain is now:
1. User's uploaded avatar (`avatar_url`)
2. App logo (`/images/logo.png`)
3. Initials (`AvatarFallback`)

---

## Phase 8: Type Sync

### 8.1 Run Type Sync

```bash
npm run types:sync
```

This will:
- Generate `ChangePasswordRequest` TypeScript type
- Remove `DataConsent` type (if it was exported)
- Update any other type changes

### 8.2 Verify Generated Types

**File**: `frontend/src/lib/backend.ts` (auto-generated)

Verify:
- `ChangePasswordRequest` is present
- `DataConsent` is removed (if it was there)

---

## Phase 9: Tests

### 9.1 Add Password Change Tests

**File**: `src-tauri/src/domains/auth/tests/password_change.rs` (create)

```rust
use crate::domains::auth::domain::models::auth::ChangePasswordRequest;
use crate::shared::services::validation::ValidationService;

#[test]
fn test_password_validation_passes_strong_password() {
    let svc = ValidationService::new();
    let result = svc.validate_password("StrongPass123!");
    assert!(result.is_ok());
}

#[test]
fn test_password_validation_fails_weak_password() {
    let svc = ValidationService::new();
    let result = svc.validate_password("weak");
    assert!(result.is_err());
}

#[test]
fn test_change_password_request_deserialization() {
    let json = r#"{"currentPassword":"oldPass123","newPassword":"newPass456!"}"#;
    let request: ChangePasswordRequest = serde_json::from_str(json).unwrap();
    assert_eq!(request.current_password, "oldPass123");
    assert_eq!(request.new_password, "newPass456!");
}
```

### 9.2 Remove DataConsent Tests

**File**: `src-tauri/src/domains/settings/tests/` (various)

Remove any tests related to:
- `get_data_consent`
- `DataConsent` model

---

## Phase 10: Update Dependencies

### 10.1 Add base64 Crate

**File**: `src-tauri/Cargo.toml`

```toml
[dependencies]
# ... existing dependencies
base64 = "0.22"
```

---

## Verification Checklist

### Backend
- [ ] `cargo check` passes
- [ ] `cargo test --workspace` passes
- [ ] Password change works via auth domain
- [ ] Avatar upload stores file locally
- [ ] GDPR endpoints return 404 (removed)

### Frontend
- [ ] `npm run frontend:type-check` passes
- [ ] `npm run frontend:lint` passes
- [ ] Password change uses auth IPC
- [ ] Session management still works
- [ ] Avatar fallback shows app logo

### Integration
- [ ] `npm run types:sync` completes without errors
- [ ] `npm run doctor -- --full` passes

---

## Files Changed Summary

### Backend Files

| Action | File |
|--------|------|
| Create | `src-tauri/src/domains/settings/avatar_handler.rs` |
| Modify | `src-tauri/src/domains/auth/domain/models/auth.rs` |
| Modify | `src-tauri/src/domains/auth/ipc/auth.rs` |
| Modify | `src-tauri/src/domains/auth/mod.rs` |
| Modify | `src-tauri/src/domains/settings/mod.rs` |
| Modify | `src-tauri/src/domains/settings/models.rs` |
| Modify | `src-tauri/src/domains/settings/infrastructure/repository_traits.rs` |
| Modify | `src-tauri/src/domains/settings/user_settings_repository.rs` |
| Modify | `src-tauri/src/domains/settings/application/settings_service.rs` |
| Modify | `src-tauri/src/main.rs` |
| Modify | `src-tauri/Cargo.toml` |
| Delete | `src-tauri/src/domains/settings/user_settings_handler.rs` |

### Frontend Files

| Action | File |
|--------|------|
| Create | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| Modify | `frontend/src/lib/ipc/commands.ts` |
| Modify | `frontend/src/domains/settings/ipc/settings.ipc.ts` |
| Modify | `frontend/src/domains/settings/components/SecurityTab.tsx` |
| Modify | `frontend/src/domains/settings/hooks/useSecurityTabData.ts` |
| Modify | `frontend/src/domains/settings/components/ProfileSettingsTab.tsx` |

---

## Rollback Plan

If issues arise:

1. **Git revert** the commit
2. **Restore deleted file**: `git checkout HEAD~1 -- src-tauri/src/domains/settings/user_settings_handler.rs`
3. **Re-run type sync**: `npm run types:sync`

---

## Estimated Effort

| Phase | Time |
|-------|------|
| Phase 1: Auth Password Change | 1.5 hours |
| Phase 2: Remove Placeholders | 1 hour |
| Phase 3: Avatar Upload | 2 hours |
| Phase 4: Frontend IPC | 1 hour |
| Phase 5: Frontend IPC Clients | 1 hour |
| Phase 6: SecurityTab Update | 30 min |
| Phase 7: Avatar Fallback | 15 min |
| Phase 8: Type Sync | 15 min |
| Phase 9: Tests | 1 hour |
| Phase 10: Dependencies | 15 min |
| **Total** | **~8.5 hours** |

---

## Command Execution Order

```bash
# 1. Backend changes
cd src-tauri
cargo check

# 2. Add base64 dependency (if not already present)
# Already done in Phase 10

# 3. Type sync
cd ..
npm run types:sync

# 4. Frontend changes
cd frontend
npm run type-check
npm run lint

# 5. Run tests
cd ../src-tauri
cargo test

# 6. Integration test
cd ..
npm run doctor -- --full
```