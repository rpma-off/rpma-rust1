# RPMA v2 Domain Model

## Core Entities Overview

RPMA v2 revolves around a set of interconnected entities that model the PPF installation workflow. Each entity has a specific purpose, lifecycle, and set of relationships with other entities.

## 1. Task

**Purpose**: Represents a work request or job that can be converted into a full PPF intervention workflow.

**Key Fields**:
- `id`: Unique identifier
- `task_number`: Human-readable unique identifier
- `title`: Task description
- `status`: Lifecycle state (draft, scheduled, in_progress, completed, cancelled)
- `priority`: Urgency level (low, medium, high, urgent)
- `vehicle_plate`, `make`, `model`, `year`, `vin`: Vehicle details
- `ppf_zones`, `custom_ppf_zones`: PPF protection areas
- `technician_id`: Assigned user
- `scheduled_date`: Planned execution date
- `workflow_id`, `workflow_status`, `current_workflow_step_id`: Workflow tracking
- `created_at`, `updated_at`: Audit timestamps
- `deleted_at`, `deleted_by`: Soft delete support

**Storage**: `tasks` table in SQLite
**Lifecycle**: Draft → Scheduled → In Progress → Completed/Cancelled

## 2. Intervention

**Purpose**: Detailed PPF installation record created from a task, containing comprehensive workflow execution data.

**Key Fields**:
- `id`: Unique identifier
- `task_id`: Reference to parent task
- `client_id`: Associated customer
- `status`: Current intervention state
- `current_step`: Workflow step being executed
- `completion_percentage`: Progress indicator
- `vehicle_details`: Denormalized vehicle information
- `environmental_conditions`: Weather, lighting, temperature, humidity
- `gps_start_location`, `gps_end_location`: Location tracking with accuracy
- `quality_score`: Computed quality metric (0-100)
- `customer_satisfaction`: Client feedback (1-10)
- `film_details`: Type, brand, model used
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `interventions` table in SQLite
**Special Feature**: Denormalized client and vehicle data for offline support

## 3. InterventionStep

**Purpose**: Individual steps within an intervention workflow (inspection, preparation, installation, finalization).

**Key Fields**:
- `id`: Unique identifier
- `intervention_id`: Parent intervention
- `step_type`: inspection | preparation | installation | finalization
- `step_order`: Execution sequence
- `title`: Step description
- `status`: pending | in_progress | completed | failed
- `notes`: Technician observations
- `photo_requirements`: Required photos for this step
- `estimated_duration`: Planned time in minutes
- `actual_duration`: Execution time
- `started_at`, `completed_at`: Timing information
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `intervention_steps` table in SQLite
**Relationship**: One-to-many with Intervention

## 4. Client

**Purpose**: Customer information with vehicles and service history.

**Key Fields**:
- `id`: Unique identifier
- `client_type`: individual | business
- `first_name`, `last_name`: Personal information
- `company_name`: Business information
- `email`, `phone`: Contact details
- `address_line_1`, `address_line_2`, `city`, `state`, `zip`: Address
- `notes`: Additional information
- `computed_statistics`: total_tasks, active_tasks, completed_tasks
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `clients` table in SQLite
**Special Feature**: FTS5 virtual table for full-text search

## 5. User

**Purpose**: Application users with role-based access control.

**Key Fields**:
- `id`: Unique identifier
- `username`: Unique login identifier
- `email`: Contact information
- `password_hash`, `salt`: Authentication credentials
- `role`: admin | technician | supervisor | viewer
- `first_name`, `last_name`: Personal information
- `phone`: Contact details
- `is_active`: Account status
- `last_login`: Activity tracking
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `users` table in SQLite
**Session Management**: Via `user_sessions` table
**2FA Support**: Via `user_2fa` table

## 6. Material (Inventory)

**Purpose**: PPF film stock management with supplier and batch tracking.

**Key Fields**:
- `id`: Unique identifier
- `name`: Material description
- `category_id`: Hierarchical organization
- `sku`: Product identifier
- `brand`, `model`: Product details
- `width`, `length`: Dimensions
- `quantity`: Stock amount
- `unit`: Measurement unit
- `minimum_stock`: Reorder threshold
- `supplier_id`: Source
- `batch_number`, `expiry_date`: Batch tracking
- `cost_per_unit`: Pricing information
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `materials` table in SQLite
**Related Tables**: `material_categories`, `material_transactions`

## 7. Photo

**Purpose**: Visual documentation captured during intervention steps.

**Key Fields**:
- `id`: Unique identifier
- `intervention_id`: Parent intervention
- `step_id`: Optional step association
- `file_path`: Local file location
- `classification`: before | during | after
- `captured_at`: Timestamp
- `captured_by`: User who took photo
- `exif_data`: Camera metadata
- `gps_coordinates`: Capture location
- `quality_scores`: blur, exposure, composition metrics
- `is_required`: Workflow requirement indicator
- `created_at`, `updated_at`: Audit timestamps

**Storage**: `photos` table in SQLite
**Purpose**: Quality control and compliance documentation

## Key Relationships

```
Client (1) ←→ (N) Task (1) ←→ (N) Intervention (1) ←→ (N) InterventionStep
                   ↓                                   ↓
                User (as Technician)              Photo (0..N)
```

## Domain Rules

1. **Task Lifecycle**: A task can only have one active intervention at a time (enforced by migration 011)
2. **Step Sequence**: Intervention steps must be completed in order
3. **Photo Requirements**: Certain steps require specific photos before completion
4. **Role Permissions**: Only technicians can be assigned to tasks and execute interventions
5. **Quality Gates**: Quality scores below threshold require review
6. **Inventory Tracking**: Material consumption is tracked during intervention completion

## Status Enums

### Task Status
- `draft`: Initial creation
- `scheduled`: Assigned date and technician
- `in_progress`: Work started
- `completed`: Successfully finished
- `cancelled`: Abandoned work
- `on_hold`: Temporarily paused

### Intervention Status
- `created`: Generated from task
- `in_progress`: Workflow executing
- `pending_review`: Awaiting quality check
- `completed`: Passed all quality gates
- `failed`: Quality requirements not met
- `cancelled`: Workflow aborted

### Step Status
- `pending`: Waiting to start
- `in_progress`: Currently executing
- `completed`: Successfully finished
- `failed`: Needs retry
- `skipped`: Not applicable

### User Roles
- `admin`: Full system access
- `supervisor`: Oversight and reporting capabilities
- `technician`: Task execution and intervention management
- `viewer`: Read-only access to reports

## Storage Patterns

1. **Audit Trail**: All tables include `created_at`, `updated_at`, `created_by`, `updated_by`
2. **Soft Delete**: Important entities support `deleted_at`, `deleted_by` for recovery
3. **Denormalization**: Critical data duplicated for offline functionality
4. **Sync Support**: All tables include `synced` flag for offline-first architecture
5. **Search Optimization**: FTS5 virtual tables for text search capabilities