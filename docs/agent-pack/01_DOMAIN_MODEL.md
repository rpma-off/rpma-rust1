# Domain Model

This document outlines the core entities in RPMA v2 and their relationships. 

## Core Entities

### Task (`tasks` domain)
- **Purpose**: Represents a high-level job or work order for a client.
- **Key Fields**: `id`, `client_id`, `status`, `assigned_to`, `created_at`, `scheduled_date`.
- **Status Enums**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` (TODO: Verify exact Rust enums in `src-tauri/src/domains/tasks/domain/`).
- **Relations**: Belongs to a Client, contains one or more Interventions.

### Client (`clients` domain)
- **Purpose**: Customer profile.
- **Key Fields**: `id`, `first_name`, `last_name`, `email`, `phone`, `vehicle_details` (TODO: verify).
- **Relations**: Has many Tasks, Quotes.

### Intervention (`interventions` domain)
- **Purpose**: The actual PPF application process.
- **Key Fields**: `id`, `task_id`, `status`, `started_at`, `completed_at`.
- **Status Enums**: `PLANNED`, `IN_PROGRESS`, `PAUSED`, `QA_PENDING`, `DONE` (TODO: verify exactly in model).
- **Relations**: Belongs to a Task. Contains many InterventionSteps and Photos. Consumes Inventory.

### InterventionStep (`interventions` domain)
- **Purpose**: A granular step inside an intervention (e.g., "Preparation", "Application", "QA").
- **Key Fields**: `id`, `intervention_id`, `step_type`, `is_completed`, `completed_by`.

### Photo (`documents` / `interventions` domain)
- **Purpose**: Progress tracking and QA validation.
- **Key Fields**: `id`, `intervention_id` / `step_id`, `file_path`, `captured_at`.

### User (`users` domain)
- **Purpose**: System personnel (Technicians, Managers, Admins).
- **Key Fields**: `id`, `username`, `password_hash`, `role`, `first_name`, `last_name` (added in migration 029).
- **Roles**: `Admin`, `Supervisor`, `Technician`, `Viewer` (TODO: verify exactly).
- **Relations**: Performs Interventions, signs off on steps.

### Inventory / Material (`inventory` domain)
- **Purpose**: PPF rolls, tools, and consumables.
- **Key Fields**: `id`, `sku`, `name`, `quantity_in_stock`, `unit`.
- **Relations**: Deducted/used by Interventions.

## Storage Mapping & Rules
- **Table Names**: Typically mirror the pluralized entity names (`tasks`, `interventions`, `users`, etc.). Found in `src-tauri/migrations/`.
- **Soft Delete**: Entities generally rely on `deleted_at` timestamps for soft deletion rather than hard dropping rows, allowing offline sync reconciliation (TODO: verify soft-delete pattern across all tables in `migrations/`).
- **Audit/Logging**: Migrations indicate an `025_audit_logging.sql` script, confirming changes to high-value tables are tracked.
- **Domain Rules**: Cross-domain data fetching must go through public application services, never direct SQL joins across bounded contexts (e.g., `tasks` repository cannot directly query the `users` table).
