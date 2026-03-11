# Multi-Tenant Business Account Implementation

## Overview

Implementation of organization configuration layer with minimal changes to existing architecture.

- **No data model changes** - No org_id on task/client/intervention tables
- **4 roles unchanged** - Admin, Supervisor, Technician, Viewer
- **Smart onboarding** - Detect existing data, guide migration or fresh setup

---

## Phase 1: Database Schema

### Migration 055: Organizations Table

**File:** `src-tauri/migrations/055_organizations_table.sql`

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT 'default',
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  
  -- Business
  legal_name TEXT,
  tax_id TEXT,
  siret TEXT,              -- French business ID
  registration_number TEXT,
  
  -- Contact
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'France',
  
  -- Branding
  logo_url TEXT,
  logo_data TEXT,          -- Base64 for offline
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  accent_color TEXT,
  
  -- Settings JSON blobs
  business_settings TEXT,  -- hours, holidays, defaults
  invoice_settings TEXT,   -- payment terms, numbering
  
  -- Metadata
  industry TEXT,
  company_size TEXT,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  -- Enforce single org
  CHECK (id = 'default')
);

CREATE UNIQUE INDEX idx_organizations_single ON organizations(id) WHERE id = 'default';
```

### Migration 056: Organization Settings Table

**File:** `src-tauri/migrations/056_organization_settings_table.sql`

```sql
CREATE TABLE organization_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_org_settings_category ON organization_settings(category);

INSERT INTO organization_settings (key, value, category) VALUES
  ('onboarding_completed', 'false', 'system'),
  ('default_task_priority', 'medium', 'tasks'),
  ('default_session_timeout', '480', 'security'),
  ('require_2fa', 'false', 'security'),
  ('date_format', 'DD/MM/YYYY', 'regional'),
  ('currency', 'EUR', 'regional');
```

---

## Phase 2: Backend Domain Structure

```
src-tauri/src/domains/organizations/
├── mod.rs
├── facade.rs
├── domain/
│   ├── mod.rs
│   ├── models/
│   │   ├── mod.rs
│   │   ├── organization.rs
│   │   └── settings.rs
│   └── policy.rs
├── application/
│   ├── mod.rs
│   └── organization_service.rs
├── infrastructure/
│   ├── mod.rs
│   └── organization_repository.rs
├── ipc/
│   ├── mod.rs
│   └── commands.rs
└── tests/
    └── mod.rs
```

### IPC Commands

| Command | Access | Description |
|---------|--------|-------------|
| `get_onboarding_status` | Public | Check if onboarding is complete |
| `complete_onboarding` | Public | Complete onboarding with initial data |
| `get_organization` | Protected | Get organization details |
| `update_organization` | Protected (Admin) | Update organization |
| `upload_logo` | Protected (Admin) | Upload logo file |
| `get_organization_settings` | Protected | Get org settings |
| `update_organization_settings` | Protected (Admin) | Update org settings |

---

## Phase 3: Frontend Structure

```
frontend/src/domains/organizations/
├── index.ts
├── api/
│   ├── useOrganization.ts
│   └── useOnboarding.ts
├── components/
│   ├── OrganizationForm.tsx
│   ├── BrandingSettings.tsx
│   ├── BusinessInfoForm.tsx
│   └── LogoUploader.tsx
├── hooks/
│   └── useOrganizationSettings.ts
└── ipc/
    └── organization.ipc.ts

frontend/src/app/
├── onboarding/
│   └── page.tsx
└── (authenticated)/settings/
    └── organization/
        └── page.tsx
```

---

## Phase 4: Auth Flow Integration

Modify `RootClientLayout.tsx`:

```typescript
import { useOnboardingCheck } from '@/domains/organizations';

// In AppLayout component:
useOnboardingCheck(user, authLoading, isAuthenticating);
```

---

## Phase 5: Migration Logic

On first run with existing data:

1. Check if `organizations` table has the default row
2. If no organization exists:
   - Create default organization from system
   - Mark onboarding complete
3. If fresh install:
   - Redirect to `/onboarding`

---

## Files to Create/Modify

### Backend (Create)
- [x] `src-tauri/migrations/055_organizations_table.sql`
- [x] `src-tauri/migrations/056_organization_settings_table.sql`
- [x] `src-tauri/src/domains/organizations/mod.rs`
- [x] `src-tauri/src/domains/organizations/facade.rs`
- [x] `src-tauri/src/domains/organizations/domain/mod.rs`
- [x] `src-tauri/src/domains/organizations/domain/models/mod.rs`
- [x] `src-tauri/src/domains/organizations/domain/models/organization.rs`
- [x] `src-tauri/src/domains/organizations/domain/models/settings.rs`
- [x] `src-tauri/src/domains/organizations/domain/policy.rs`
- [x] `src-tauri/src/domains/organizations/application/mod.rs`
- [x] `src-tauri/src/domains/organizations/application/organization_service.rs`
- [x] `src-tauri/src/domains/organizations/infrastructure/mod.rs`
- [x] `src-tauri/src/domains/organizations/infrastructure/organization_repository.rs`
- [x] `src-tauri/src/domains/organizations/ipc/mod.rs`
- [x] `src-tauri/src/domains/organizations/ipc/commands.rs`
- [x] `src-tauri/src/domains/organizations/tests/mod.rs`

### Backend (Modify)
- [x] `src-tauri/src/domains/mod.rs` - Register organizations domain
- [x] `src-tauri/src/main.rs` - Register IPC commands

### Frontend (Create)
- [x] `frontend/src/domains/organizations/index.ts`
- [x] `frontend/src/domains/organizations/api/useOrganization.ts`
- [x] `frontend/src/domains/organizations/api/useOnboarding.ts`
- [x] `frontend/src/domains/organizations/hooks/useOnboardingCheck.ts`
- [x] `frontend/src/domains/organizations/ipc/organization.ipc.ts`
- [x] `frontend/src/app/onboarding/page.tsx`
- [ ] `frontend/src/domains/organizations/components/OrganizationForm.tsx`
- [ ] `frontend/src/domains/organizations/components/BrandingSettings.tsx`
- [ ] `frontend/src/domains/organizations/components/BusinessInfoForm.tsx`
- [ ] `frontend/src/domains/organizations/components/LogoUploader.tsx`
- [ ] `frontend/src/app/(authenticated)/settings/organization/page.tsx`

### Frontend (Modify)
- [x] `frontend/src/lib/ipc/commands.ts` - Added organization IPC commands
- [x] `frontend/src/app/RootClientLayout.tsx` - Added onboarding check hook
- [ ] `frontend/src/components/layout/Header.tsx` - Use org logo
- [ ] `frontend/src/components/layout/Sidebar.tsx` - Add org settings link

---

## Validation Commands

```bash
# Type sync
npm run types:sync

# Run backend tests
make test

# Architecture check
npm run architecture:check

# Bounded context check
npm run validate:bounded-contexts
```

---

## Progress Tracking

- [x] Phase 1: Database migrations
  - [x] `src-tauri/migrations/055_organizations_table.sql`
  - [x] `src-tauri/migrations/056_organization_settings_table.sql`
- [x] Phase 2: Backend domain implementation
  - [x] All domain files created and compiling
  - [x] IPC commands registered in main.rs
  - [ ] Backend tests passing (pre-existing test errors in other domains)
- [x] Phase 3: Frontend domain structure
  - [x] `frontend/src/domains/organizations/index.ts`
  - [x] `frontend/src/domains/organizations/ipc/organization.ipc.ts`
  - [x] `frontend/src/domains/organizations/api/useOrganization.ts`
  - [x] `frontend/src/domains/organizations/api/useOnboarding.ts`
  - [x] `frontend/src/domains/organizations/hooks/useOnboardingCheck.ts`
  - [x] `frontend/src/lib/ipc/commands.ts` - Added organization IPC commands
- [x] Phase 4: Auth flow integration
  - [x] `frontend/src/app/RootClientLayout.tsx` - Added onboarding check hook
  - [x] Onboarding check integrated with auth flow
- [x] Phase 5: Onboarding page
  - [x] `frontend/src/app/onboarding/page.tsx` - Multi-step onboarding wizard
- [ ] Phase 6: Settings pages (organization settings UI)
- [ ] Phase 7: Type sync and validation

## Backend Status

**Compiles:** ✅ Yes (warnings only, no errors)

**Domain Structure Created:**
- `src-tauri/src/domains/organizations/mod.rs`
- `src-tauri/src/domains/organizations/facade.rs`
- `src-tauri/src/domains/organizations/domain/mod.rs`
- `src-tauri/src/domains/organizations/domain/models/mod.rs`
- `src-tauri/src/domains/organizations/domain/models/organization.rs`
- `src-tauri/src/domains/organizations/domain/models/settings.rs`
- `src-tauri/src/domains/organizations/domain/policy.rs`
- `src-tauri/src/domains/organizations/application/mod.rs`
- `src-tauri/src/domains/organizations/application/organization_service.rs`
- `src-tauri/src/domains/organizations/infrastructure/mod.rs`
- `src-tauri/src/domains/organizations/infrastructure/organization_repository.rs`
- `src-tauri/src/domains/organizations/ipc/mod.rs`
- `src-tauri/src/domains/organizations/ipc/commands.rs`
- `src-tauri/src/domains/organizations/tests/mod.rs`

**IPC Commands Registered:**
- `get_onboarding_status` (Public)
- `complete_onboarding` (Public)
- `get_organization` (Protected, Viewer+)
- `update_organization` (Protected, Admin)
- `upload_logo` (Protected, Admin)
- `get_organization_settings` (Protected, Viewer+)
- `update_organization_settings` (Protected, Admin)

### Backend Warnings Fixed
- Added `Default` trait to `CreateOrganizationRequest`
- Changed IPC module to use `pub(crate) mod` + `pub use commands::*`

## Frontend Status

**Type Check:** ✅ Passed

**Frontend Structure Created:**
- `frontend/src/domains/organizations/index.ts`
- `frontend/src/domains/organizations/ipc/organization.ipc.ts`
- `frontend/src/domains/organizations/api/useOrganization.ts`
- `frontend/src/domains/organizations/api/useOnboarding.ts`
- `frontend/src/domains/organizations/hooks/useOnboardingCheck.ts`
- `frontend/src/app/onboarding/page.tsx`

**Frontend Modified:**
- `frontend/src/lib/ipc/commands.ts` - Added organization IPC commands
- `frontend/src/app/RootClientLayout.tsx` - Added onboarding check integration

## Next Steps

1. Run type sync (`npm run types:sync`) to generate TypeScript types from Rust models
2. Create organization settings page at `frontend/src/app/(authenticated)/settings/organization/page.tsx`
3. Create organization components (BrandingSettings, LogoUploader, etc.)
4. Update Header component to use organization logo
5. Update Sidebar to add organization settings link
