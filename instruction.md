﻿# User Settings Database Error - Fix Plan

## 🎯 Executive Summary

**Issue**: Database error when loading user settings: "Failed to create user settings"  
**Root Cause**: Missing or incomplete `user_settings` table record for user `a2975c76-eeda-41f8-9efe-d0741c9785a5`  
**Impact**: Users cannot access profile settings page  
**Severity**: HIGH - Blocks core user functionality

---

## 📋 Problem Analysis

### Error Details

```
Database error: Get user settings failed: Database error: Failed to create user settings
User ID: a2975c76-eeda-41f8-9efe-d0741c9785a5
Correlation ID: req-mlct1v6i-0002-tfopna
Location: ProfileSettingsTab.tsx:68 (loadUserSettings function)
```

### Affected Components

1. **Backend**: `user_settings` table and repository
2. **Frontend**: `ProfileSettingsTab.tsx` component
3. **Database**: Missing or incomplete `user_settings` record

### Current Schema (from DATABASE.md)

```sql
CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    avatar_url TEXT NULL,
    updated_at INTEGER NOT NULL DEFAULT 0
);
```

---

## 🔍 Root Cause Analysis

### Potential Issues

1. **Missing user_settings record**: User exists but no settings record created
2. **Database constraint violation**: Foreign key or primary key issue
3. **Migration failure**: Settings table not properly initialized
4. **Race condition**: Settings accessed before creation
5. **Error handling gap**: Backend not creating default settings on first access

### Investigation Steps Needed

```bash
# 1. Check if user exists
SELECT * FROM users WHERE id = 'a2975c76-eeda-41f8-9efe-d0741c9785a5';

# 2. Check if user_settings record exists
SELECT * FROM user_settings WHERE user_id = 'a2975c76-eeda-41f8-9efe-d0741c9785a5';

# 3. Check table schema
PRAGMA table_info(user_settings);

# 4. Check foreign key constraints
PRAGMA foreign_keys;
PRAGMA foreign_key_check(user_settings);
```

---

## 🛠️ Fix Plan

### Phase 1: Immediate Hotfix (1-2 hours)

#### 1.1 Database Verification Script

**File**: `scripts/verify_user_settings.js`

```javascript
const Database = require('better-sqlite3');
const db = new Database('./rpma.db', { verbose: console.log });

console.log('=== User Settings Verification ===\n');

// Check users without settings
const usersWithoutSettings = db.prepare(`
  SELECT u.id, u.email, u.username, u.full_name
  FROM users u
  LEFT JOIN user_settings us ON u.id = us.user_id
  WHERE us.user_id IS NULL
    AND u.deleted_at IS NULL
`).all();

console.log(`Found ${usersWithoutSettings.length} users without settings:\n`);
usersWithoutSettings.forEach(user => {
  console.log(`- ${user.email} (${user.id})`);
});

// Create missing settings
if (usersWithoutSettings.length > 0) {
  console.log('\n=== Creating Missing Settings ===\n');
  
  const insertStmt = db.prepare(`
    INSERT INTO user_settings (user_id, avatar_url, updated_at)
    VALUES (?, NULL, ?)
  `);
  
  const now = Date.now();
  usersWithoutSettings.forEach(user => {
    try {
      insertStmt.run(user.id, now);
      console.log(`✓ Created settings for ${user.email}`);
    } catch (error) {
      console.error(`✗ Failed to create settings for ${user.email}:`, error.message);
    }
  });
}

console.log('\n=== Verification Complete ===');
db.close();
```

**Usage**:
```bash
node scripts/verify_user_settings.js
```

---

#### 1.2 Backend Fix: Auto-Create Settings

**File**: `src-tauri/src/repositories/user_repository.rs`

```rust
// Add new method to ensure settings exist
impl UserRepository {
    pub async fn ensure_user_settings(&self, user_id: &str) -> RepoResult<()> {
        // Check if settings exist
        let exists = self.db.query_row(
            "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
            &[user_id],
            |row| row.get::<_, i64>(0)
        )?;
        
        if exists == 0 {
            // Create default settings
            let now = chrono::Utc::now().timestamp_millis();
            self.db.execute(
                "INSERT INTO user_settings (user_id, avatar_url, updated_at) VALUES (?, NULL, ?)",
                &[user_id, &now.to_string()]
            )?;
            
            tracing::info!("Created default user settings for user_id: {}", user_id);
        }
        
        Ok(())
    }
    
    pub async fn get_user_settings(&self, user_id: &str) -> RepoResult<Option<UserSettings>> {
        // Ensure settings exist before querying
        self.ensure_user_settings(user_id).await?;
        
        let query = "SELECT user_id, avatar_url, updated_at FROM user_settings WHERE user_id = ?";
        self.db.query_row_optional(query, &[user_id], |row| {
            Ok(UserSettings {
                user_id: row.get(0)?,
                avatar_url: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
    }
}
```

---

#### 1.3 Frontend Fix: Better Error Handling

**File**: `frontend/src/components/settings/ProfileSettingsTab.tsx`

```typescript
const loadUserSettings = async () => {
  if (!userId) return;

  try {
    setLoading(true);
    setError(null);
    
    const response = await ipcClient.users.getSettings(userId, sessionToken);
    
    if (response.success && response.data) {
      setSettings(response.data);
    } else {
      // Settings not found - this is OK, we'll use defaults
      logger.warn('User settings not found, using defaults', {
        userId,
        correlation_id,
      });
      
      // Set default settings
      setSettings({
        user_id: userId,
        avatar_url: null,
        updated_at: Date.now(),
      });
    }
  } catch (err: any) {
    logger.error('Failed to load user settings', {
      userId,
      data: { error: err, userId },
      correlation_id,
    });
    
    // Don't block the UI - use defaults
    setSettings({
      user_id: userId,
      avatar_url: null,
      updated_at: Date.now(),
    });
    
    // Show non-blocking error toast
    toast.error('Could not load saved settings. Using defaults.');
  } finally {
    setLoading(false);
  }
};
```

---

### Phase 2: Database Migration (2-3 hours)

#### 2.1 Create Migration to Fix Existing Data

**File**: `src-tauri/migrations/028_fix_user_settings.sql`

```sql
-- Migration 028: Fix User Settings
-- Description: Ensure all users have user_settings records
-- Author: System
-- Date: 2026-02-07

-- Create user_settings for users that don't have them
INSERT INTO user_settings (user_id, avatar_url, updated_at)
SELECT 
    u.id,
    NULL,
    strftime('%s', 'now') * 1000
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
WHERE us.user_id IS NULL
  AND u.deleted_at IS NULL;

-- Log the fix
INSERT INTO schema_version (version, applied_at, migration_hash, description, migration_time_ms)
VALUES (
    28,
    strftime('%s', 'now') * 1000,
    'fix_user_settings_baseline',
    'Created missing user_settings records for existing users',
    0
);
```

---

#### 2.2 Add Trigger to Auto-Create Settings

**File**: `src-tauri/migrations/029_user_settings_trigger.sql`

```sql
-- Migration 029: Add Trigger for User Settings Auto-Creation
-- Description: Automatically create user_settings when user is created
-- Author: System
-- Date: 2026-02-07

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS user_insert_create_settings;

-- Create trigger to auto-create user_settings on user insert
CREATE TRIGGER user_insert_create_settings
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_settings (user_id, avatar_url, updated_at)
    VALUES (
        NEW.id,
        NULL,
        strftime('%s', 'now') * 1000
    );
END;

-- Log the migration
INSERT INTO schema_version (version, applied_at, migration_hash, description, migration_time_ms)
VALUES (
    29,
    strftime('%s', 'now') * 1000,
    'user_settings_auto_create_trigger',
    'Added trigger to auto-create user_settings on user insert',
    0
);
```

---

### Phase 3: Testing & Validation (1-2 hours)

#### 3.1 Test Script

**File**: `scripts/test_user_settings.js`

```javascript
const { invoke } = require('@tauri-apps/api/tauri');

async function testUserSettings() {
  console.log('=== User Settings Test Suite ===\n');
  
  // Test 1: Get settings for existing user
  console.log('Test 1: Get settings for existing user');
  try {
    const settings = await invoke('get_user_settings', {
      userId: 'a2975c76-eeda-41f8-9efe-d0741c9785a5',
      sessionToken: 'YOUR_SESSION_TOKEN',
    });
    console.log('✓ Settings retrieved:', settings);
  } catch (error) {
    console.error('✗ Failed:', error);
  }
  
  // Test 2: Create new user and verify settings auto-created
  console.log('\nTest 2: Create new user and verify settings');
  try {
    const newUser = await invoke('create_user', {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      fullName: 'Test User',
      role: 'technician',
    });
    
    const settings = await invoke('get_user_settings', {
      userId: newUser.id,
      sessionToken: 'YOUR_SESSION_TOKEN',
    });
    
    console.log('✓ New user settings auto-created:', settings);
  } catch (error) {
    console.error('✗ Failed:', error);
  }
  
  // Test 3: Update settings
  console.log('\nTest 3: Update settings');
  try {
    await invoke('update_user_settings', {
      userId: 'a2975c76-eeda-41f8-9efe-d0741c9785a5',
      settings: {
        avatar_url: 'https://example.com/avatar.jpg',
      },
      sessionToken: 'YOUR_SESSION_TOKEN',
    });
    console.log('✓ Settings updated successfully');
  } catch (error) {
    console.error('✗ Failed:', error);
  }
  
  console.log('\n=== Test Suite Complete ===');
}

testUserSettings();
```

---

#### 3.2 Integration Test

**File**: `src-tauri/tests/integration/user_settings_test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_auto_create_user_settings() {
        let db = setup_test_db().await;
        let user_repo = UserRepository::new(db.clone());
        
        // Create user
        let user = user_repo.create_user(CreateUserRequest {
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password: "SecurePass123!".to_string(),
            full_name: "Test User".to_string(),
            role: UserRole::Technician,
        }).await.unwrap();
        
        // Verify settings exist
        let settings = user_repo.get_user_settings(&user.id).await.unwrap();
        assert!(settings.is_some());
        assert_eq!(settings.unwrap().user_id, user.id);
    }
    
    #[tokio::test]
    async fn test_ensure_user_settings_creates_if_missing() {
        let db = setup_test_db().await;
        let user_repo = UserRepository::new(db.clone());
        
        // Create user directly in DB (bypassing trigger)
        let user_id = "test-user-id";
        db.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            &[user_id, "test@example.com", "testuser", "hash", "Test", "technician", &now(), &now()]
        ).await.unwrap();
        
        // Delete settings if they exist (to simulate missing settings)
        db.execute("DELETE FROM user_settings WHERE user_id = ?", &[user_id]).await.unwrap();
        
        // Call ensure_user_settings
        user_repo.ensure_user_settings(user_id).await.unwrap();
        
        // Verify settings created
        let settings = db.query_row_optional(
            "SELECT * FROM user_settings WHERE user_id = ?",
            &[user_id],
            |row| Ok(())
        ).await.unwrap();
        
        assert!(settings.is_some());
    }
}
```

---

### Phase 4: Documentation & Monitoring (1 hour)

#### 4.1 Update Documentation

**File**: `docs/USER_SETTINGS_FIX.md`

```markdown
# User Settings Fix Documentation

## Problem
Users were experiencing database errors when accessing profile settings due to missing `user_settings` records.

## Solution

### 1. Auto-Creation
- Added `ensure_user_settings()` method to automatically create missing settings
- Added database trigger to auto-create settings when users are created

### 2. Migration
- Migration 028: Backfilled missing settings for existing users
- Migration 029: Added auto-creation trigger

### 3. Error Handling
- Frontend now gracefully handles missing settings with defaults
- Non-blocking error toast instead of hard failure

## Verification

Run verification script:
```bash
node scripts/verify_user_settings.js
```

## Testing

Run integration tests:
```bash
cargo test user_settings
```
```

---

#### 4.2 Add Monitoring

**File**: `src-tauri/src/repositories/user_repository.rs`

```rust
impl UserRepository {
    pub async fn get_user_settings(&self, user_id: &str) -> RepoResult<Option<UserSettings>> {
        // Ensure settings exist before querying
        self.ensure_user_settings(user_id).await?;
        
        let query = "SELECT user_id, avatar_url, updated_at FROM user_settings WHERE user_id = ?";
        
        // Add metrics
        let start = std::time::Instant::now();
        let result = self.db.query_row_optional(query, &[user_id], |row| {
            Ok(UserSettings {
                user_id: row.get(0)?,
                avatar_url: row.get(1)?,
                updated_at: row.get(2)?,
            })
        });
        
        // Log slow queries
        let duration = start.elapsed();
        if duration.as_millis() > 100 {
            tracing::warn!(
                "Slow user_settings query: {}ms for user_id: {}",
                duration.as_millis(),
                user_id
            );
        }
        
        result
    }
}
```

---

## 📊 Implementation Checklist

### Immediate (Today)

- [ ] Run `scripts/verify_user_settings.js` to identify all affected users
- [ ] Manually create missing `user_settings` records for existing users
- [ ] Deploy backend hotfix with `ensure_user_settings()` method
- [ ] Deploy frontend fix with better error handling
- [ ] Test with affected user ID: `a2975c76-eeda-41f8-9efe-d0741c9785a5`

### Short-term (This Week)

- [ ] Create and test migration 028 (backfill missing settings)
- [ ] Create and test migration 029 (auto-creation trigger)
- [ ] Run integration tests
- [ ] Update documentation
- [ ] Add monitoring and logging

### Long-term (Next Sprint)

- [ ] Review all other tables for similar issues
- [ ] Add comprehensive data integrity tests
- [ ] Implement database health check dashboard
- [ ] Add automated alerts for missing foreign key records

---

## 🎯 Success Criteria

- ✅ All existing users have `user_settings` records
- ✅ New users automatically get settings on creation
- ✅ Frontend gracefully handles missing settings
- ✅ No more "Failed to create user settings" errors
- ✅ Profile settings page loads successfully for all users
- ✅ Integration tests pass
- ✅ Database integrity maintained

---

## 📝 Notes

- **Breaking Change**: None - backward compatible
- **Rollback Plan**: Remove trigger, delete auto-created records
- **Performance Impact**: Minimal - one extra INSERT on user creation
- **Database Size Impact**: Negligible - ~100 bytes per user

---

**Estimated Total Time**: 5-8 hours  
**Priority**: HIGH  
**Status**: Ready for implementation