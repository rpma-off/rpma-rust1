---
title: "Domain Model"
summary: "Detailed overview of core entities, their relations, and domain rules."
read_when:
  - "Designing new features"
  - "Understanding entity relationships"
  - "Modifying database schema"
---

# 01. DOMAIN MODEL

The RPMA v2 domain model follows Bounded Context principles (**ADR-002**). Each domain is isolated in `src-tauri/src/domains/<name>/`.

## Core Entities

### 1. Task (`tasks`)
- **Location**: `src-tauri/src/domains/tasks/domain/models/task.rs`
- **Purpose**: Represents a requested job.
- **Status Flow**: `Draft` → `Scheduled` → `In Progress` → `Completed` | `Cancelled` | `Delayed`.
- **Relations**: Belongs to a **Client**, assigned to a **User** (Technician).

### 2. Client (`clients`)
- **Location**: `src-tauri/src/domains/clients/domain/models/client.rs`
- **Purpose**: Individuals or organizations requesting service.
- **Relations**: One client has many tasks.

### 3. Intervention (`interventions`)
- **Location**: `src-tauri/src/domains/interventions/domain/models/intervention.rs`
- **Purpose**: The execution phase of a task.
- **Flow**: Start → Step Progression → Consumption Recording → Finalization.
- **Relations**: 1:1 with **Task** (typically).

### 4. Material / Inventory (`inventory`)
- **Location**: `src-tauri/src/domains/inventory/domain/models/material.rs`
- **Purpose**: Consumables used during interventions.
- **Relations**: Linked to interventions via consumption records.

### 5. User (`users`)
- **Location**: `src-tauri/src/domains/users/domain/models/user.rs`
- **Roles**: `Admin`, `Supervisor`, `Technician`, `Viewer` (**ADR-007**).

### 6. Quote (`quotes`)
- **Location**: `src-tauri/src/domains/quotes/domain/models/quote.rs`
- **Lifecycle**: `Draft` → `Sent` → `Accepted` → `Converted to Task`.

## Storage & Implementation Patterns
- **Soft Delete**: `deleted_at` timestamp used for most entities (**ADR-011**).
- **Timestamps**: i64 Unix milliseconds everywhere (**ADR-012**).
- **IDs**: UUID v4 strings for primary keys.
- **Validation**: Centralized via `shared/services/validation/` (**ADR-008**).

## Cross-Domain Communication
1. **Shared Contracts**: `src-tauri/src/shared/contracts/`
2. **Cross-Domain Services**: `src-tauri/src/shared/services/cross_domain.rs` (**ADR-003**)
3. **Event Bus**: `src-tauri/src/shared/services/event_bus.rs` (**ADR-016**)

## Domain Rules
- Business logic MUST live in the **Domain Layer** (`domains/*/domain/`).
- Only an `Admin` or `Supervisor` can delete critical entities.
- Technicians have scoped access to their assigned tasks (**ADR-006**).
