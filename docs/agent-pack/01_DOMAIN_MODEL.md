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

## Architecture Compliance

Most domains follow the **4-layer pattern** (ADR-001):
`IPC → Application → Domain ← Infrastructure`

**Domains with full layer compliance:**
- `auth`, `interventions`, `inventory`, `quotes`, `tasks`, `trash`, `users`

**Domains with flat/handler-based structure:**
- `calendar`, `clients`, `documents`, `notifications`, `settings`

## Core Entities

### 1. Task (`tasks`)
- **Location**: `src-tauri/src/domains/tasks/domain/models/task.rs`
- **Purpose**: Represents a requested job.
- **Status Flow**: `Draft` → `Scheduled` → `In Progress` → `Completed` | `Cancelled` | `Delayed`.
- **Relations**: Belongs to a **Client**, assigned to a **User** (Technician).

### 2. Client (`clients`)
- **Location**: `src-tauri/src/domains/clients/` (flat structure)
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
- **Roles**: `Admin`, `Supervisor`, `Technician`, `Viewer`(**ADR-007**).

### 6. Quote (`quotes`)
- **Location**: `src-tauri/src/domains/quotes/domain/models/quote.rs`
- **Lifecycle**: `Draft` → `Sent` → `Accepted` → `Converted to Task`.

### 7. Auth Session (`auth`)
- **Location**: `src-tauri/src/domains/auth/`
- **Purpose**: Login, session management, token validation.

### 8. Notification (`notifications`)
- **Location**: `src-tauri/src/domains/notifications/` (flat structure)
- **Purpose**: System and user-triggered alerts.

## Storage & Implementation Patterns

- **Soft Delete**: `deleted_at` timestamp used for most entities (**ADR-011**).
- **Timestamps**: i64 Unix milliseconds everywhere (**ADR-012**).
- **IDs**: UUID v4 strings for primary keys.
- **Validation**: Centralized via `shared/services/validation/` (**ADR-008**).

## Cross-Domain Communication

| Mechanism | Location | Purpose |
|-----------|----------|---------|
| Shared Contracts | `src-tauri/src/shared/contracts/` | Common types across domains |
| Cross-Domain Re-exports | `src-tauri/src/shared/services/cross_domain.rs` | Service access across boundaries |
| Event Bus | `src-tauri/src/shared/event_bus/` | Decoupled domain events (**ADR-016**) |
| Domain Events | `src-tauri/src/shared/services/domain_event.rs` | Event type definitions (**ADR-017**) |

## Domain Events (ADR-017)

Key event types in the `DomainEvent` enum:
- **Task Events**: `TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskStatusChanged`, `TaskCompleted`, `TaskDeleted`
- **Client Events**: `ClientCreated`, `ClientUpdated`, `ClientDeactivated`
- **Intervention Events**: `InterventionCreated`, `InterventionStarted`, `InterventionCompleted`, `InterventionFinalized`
- **Material Events**: `MaterialConsumed`
- **Quote Events**: `QuoteAccepted`, `QuoteRejected`, `QuoteConverted`, `QuoteShared`
- **Trash Events**: `EntityRestored`, `EntityHardDeleted`

## Domain Rules

- Business logic MUST live in the **Domain Layer** (`domains/*/domain/`).
- Only an `Admin` or `Supervisor` can delete critical entities.
- Technicians have scoped access to their assigned tasks (**ADR-006**).
- Cross-domain calls MUST go through `shared/services/cross_domain.rs` or the `EventBus`.
- Direct imports from another domain's internals are **FORBIDDEN**.