# User Flows & UX

RPMA v2 is designed to be highly intuitive, especially for Technicians who may interact with the system on workshop tablets or laptops with touch-friendly targets.

## Main User Flows

### 1. Daily Technician Routine (Interventions)
- **Entry Route**: `/dashboard` -> `/interventions`
- **Key UI States**: 
  - List of today's assigned tasks.
  - Detail view for an Intervention (`/interventions/[id]`).
- **Backend Commands Touched**: `list_assigned_tasks`, `start_intervention`, `complete_step`, `upload_photo`.
- **Main Validations**: Cannot start intervention if prerequisites are missing. Cannot complete certain steps without uploading mandatory QA photos.

### 2. Administrator & Supervisor Setup
- **Entry Route**: `/admin/`
- **Key UI States**:
  - User management (adding/removing technicians).
  - Editing global settings or materials in Inventory.
- **Backend Commands Touched**: `create_user`, `update_user_role`, `add_inventory_item`.
- **Main Validations**: Validates current user role via strict backend RBAC (`Admin` or `Supervisor` only).

### 3. Client & Quote Management
- **Entry Route**: `/clients` and `/quotes`
- **Key UI States**:
  - Creating a new client profile.
  - Generating and pricing a quote, converting an accepted quote into a Task.
- **Backend Commands Touched**: `create_client`, `create_quote`, `convert_quote_to_task`.
- **Main Validations**: Discounts cannot exceed logical limits (e.g., 100%), required client contact info ensuring valid tracking.

### 4. Authentication Flow
- **Entry Route**: `/login` (redirects unauthorized users here from root `middleware.ts`).
- **Key UI States**:
  - Login form with username/password.
- **Backend Commands Touched**: `login`, `logout`.
- **Main Validations**: Limits retry attempts. Ensures invalid token forces a re-login.

## Design System Guardrails
- **Tailwind Tokens**: Rely on utility classes. Primary colors, spacing, and typography are configured in `tailwind.config.js`. Avoid custom CSS.
- **Components (`shadcn/ui`)**: Located in `frontend/src/components/ui/`. Re-use primitives like `<Button>`, `<Dialog>`, `<Input>`, `<Select>`.
- **Forms**: Rely heavily on `react-hook-form` paired with zod validation (`@hookform/resolvers/zod`).
- **Toasts**: Success/Error notifications are unified using `sonner` via a toast hook.
- **Data Loading**: Use React Query for caching and loading states to present smooth skeleton loaders or spinners (`<PageSkeleton />`, `loading.tsx`) while waiting for IPC responses.
