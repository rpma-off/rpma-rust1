# ADR-021: Centralized Service Orchestration and Dependency Injection

## Status
Accepted

## Context
As the number of domain services and cross-domain dependencies grows, application startup and service management become increasingly complex. A centralized mechanism is needed to ensure services are initialized in the correct order with their required dependencies.

## Decision

### Service Builder Pattern
- The `ServiceBuilder` (`src-tauri/src/service_builder.rs`) is the single authoritative factory for all application services.
- It receives core resources (database, repositories, filesystem paths) and constructs the dependency graph in the correct order.

### Application State (AppState)
- The resulting service instances are encapsulated in the `AppStateType` struct, which is registered as global state in the Tauri application.
- IPC handlers access services via the `AppState` guard, ensuring that all commands operate against consistent, initialized service instances.

### Lifecycle Management
- Heavy initialization logic (e.g., `AuthService::init()`, `AuditService::init()`) is performed within the builder before the application starts accepting IPC requests.
- The builder is responsible for registering cross-domain event handlers and background services (e.g., sync workers, performance monitors).

## Consequences
- Service dependencies are explicit and easy to trace.
- Application startup is deterministic and fails early if core services cannot be initialized.
- IPC handlers remain focused on routing and transport, delegating all logic to pre-constructed services.
