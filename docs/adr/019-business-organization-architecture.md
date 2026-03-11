# ADR-019: Business Organization and Onboarding Architecture

## Status
Accepted

## Context
To support multi-tenant business accounts on a shared workstation, the application must manage organization-level identity, branding, and configuration independent of individual user accounts.

## Decision

### Single-Tenant Organization Model
- The `organizations` table stores the business profile (legal name, tax ID, logo).
- A constraint `CHECK (id = 'default')` enforces a single active organization per installation for the current release.
- Organization settings are stored in a dedicated `organization_settings` table (key-value pairs) for flexible configuration (e.g., `default_task_priority`, `date_format`).

### Onboarding Lifecycle
- Onboarding status is tracked via the `onboarding_completed` flag in `organization_settings`.
- The `get_onboarding_status` command is public and used by the frontend to redirect unconfigured installations to the `/onboarding` wizard.
- `RootClientLayout.tsx` implements the `useOnboardingCheck` guard to prevent access to the dashboard until organization setup is complete.

### Branding and Regionalization
- Organization-specific branding (primary colors, logo) is loaded at startup and applied globally to the UI.
- Regional settings (currency, date format) are retrieved from the organization domain and override system defaults.

## Consequences
- The application can be white-labeled for different business units.
- Deployment can scale to multi-tenant configurations in the future by relaxing the `CHECK (id = 'default')` constraint.
- First-run experience is governed by a formal onboarding workflow.
