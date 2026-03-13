---
title: "Cross-Domain Communication"
summary: "How domains interact in the RPMA backend without violating bounded context boundaries."
read_when:
  - "Designing cross-domain features"
  - "Implementing side effects"
  - "Sharing data across domains"
---

# Cross-Domain Communication

To maintain loose coupling and clear bounded contexts, we implement exactly three channels for cross-domain communication (ADR-003).

## 1. Shared Contracts (`src-tauri/src/shared/contracts/`)

**Purpose**: Type-only definitions shared across domains.

- Only contains data structures and enums.
- **No implementations** or business logic.
- Domains import these types when they need to represent data from another domain.
- *Reference*: `src-tauri/src/shared/contracts/auth.rs`

## 2. Cross-Domain Services (`src-tauri/src/shared/services/cross_domain.rs`)

**Purpose**: Concrete service re-exports at the composition layer.

- Used primarily during system startup (Service Builder) or when an IPC handler needs to coordinate between two domains.
- Domains MUST NOT import from `cross_domain.rs` directly.
- *Reference*: `src-tauri/src/shared/services/cross_domain.rs`

## 3. Event Bus (`src-tauri/src/shared/services/event_bus.rs`)

**Purpose**: Pub/sub for decoupled reactive coordination (ADR-016).

- **Publishing**: When a domain operation completes (e.g., `InterventionFinalized`), it publishes a `DomainEvent`.
- **Subscribing**: Other domains or shared services (like Audit Logs or Notifications) subscribe to specific events.
- Events are fire-and-forget; handlers cannot block the main operation.
- *Reference*: `src-tauri/src/shared/services/domain_event.rs`

## Communication Matrix

| Need | Recommended Channel | Example |
| :--- | :--- | :--- |
| Use types from another domain | **Shared Contracts** | Using `UserRole` in the Task domain. |
| Synchronous coordination (IPC) | **Cross-Domain Services** | `TaskService` coordinating with `ClientService` during a task update. |
| Reactive side effects | **Event Bus** | Sending a notification when a Task is overdue. |
| Cross-domain data retrieval | **Shared Service + Facade** | Fetching client info to display on a task detail page. |

## Rules of Engagement

- **No Direct Imports**: Never import from another domain's `application`, `domain`, or `infrastructure` layers.
- **Dependency Inversion**: Use traits defined in `shared/contracts` to decouple domains.
- **Auditability**: All cross-domain communication via the event bus is logged for auditing.
- **Fail-Safe**: Event handlers should handle their own errors and not crash the event bus or the initiating process.
