---
title: "ADR-004: Centralized Service Builder Pattern"
summary: "`ServiceBuilder` creates all application services with explicit, documented dependency order in a single `build()` method, preventing circular dependencies and ensuring consistent initialization."
domain: "architecture"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-004: Centralized Service Builder Pattern

## Status

Accepted

## Date

2026-03-13

## Summary

`ServiceBuilder` creates all application services with explicit, documented dependency order in a single `build()` method, preventing circular dependencies and ensuring consistent initialization.

## Context

- Application has complex service initialization with dependencies (Database → Repositories → Services → Event Handlers)
- Services need to be injected into Tauri's state management
- Testing requires ability to inject mocks
- Debugging initialization failures is difficult with scattered service creation
- Need explicit dependency graph to prevent initialization order bugs

## Decision

We use a centralized `ServiceBuilder` pattern that:

1. **Defines the complete dependency graph** in code and documentation
2. **Initializes all services in dependency order** in a single `build()` method
3. **Stores all services in `AppStateType`** for Tauri state management
4. **Verifies initialization order with compile-time tests**

### Dependency Graph

```
ROOTS (no dependencies):
├── Database
├── Repositories.{client, user, quote, message}
└── AppDataDir

LAYER 1 (depend on roots):
├── TaskService                     ← Database
├── ClientService                   ← Repositories.client
├── InterventionService             ← Database
├── InterventionWorkflowService     ← Database
├── SettingsService                 ← Database
├── TaskImportService               ← Database
├── AuthService                     ← Database (+ init)
├── UserService                     ← Repositories.user
├── CacheService                    ← (self-contained)
├── SessionService                  ← Database
├── SessionStore                    ← (self-contained)
└── PhotoService                    ← Database + AppDataDir

LAYER 2 (depend on Layer 1):
├── MaterialService                 ← Database
├── InventoryFacade                 ← Database + MaterialService
├── QuoteEventBus                   ← (self-contained)
├── EventBus                        ← (self-contained)
├── QuoteService                    ← Repositories.quote + Database + QuoteEventBus
└── MessageService                  ← Repositories.message + Database

LAYER 3 (depend on Layer 2):
├── AsyncDatabase                   ← Database
└── AuditService                    ← Database (+ init)

LAYER 4 (depend on Layer 3 + event bus):
├── AuditLogHandler                 ← AuditService + EventBus
├── InterventionFinalizedHandler    ← InventoryFacade + EventBus
├── QuoteAcceptedHandler            ← InterventionWorkflowService + EventBus
└── QuoteConvertedHandler           ← InterventionWorkflowService + EventBus
```

### Implementation

```rust
// src-tauri/src/service_builder.rs
pub struct ServiceBuilder {
    db: Arc<Database>,
    repositories: Arc<Repositories>,
    app_data_dir: std::path::PathBuf,
}

impl ServiceBuilder {
    pub fn build(self) -> Result<AppStateType, Box<dyn std::error::Error>> {
        // Roots: Database and Repositories
        let db_instance = (*self.db).clone();

        // Layer 1: Core services
        let task_service = Arc::new(TaskService::new(self.db.clone()));
        let client_service = Arc::new(ClientService::new(self.repositories.client.clone()));
        // ... more Layer 1 services

        // Layer 2: Dependent services
        let material_service = Arc::new(MaterialService::new(db_instance.clone()));
        let event_bus = Arc::new(InMemoryEventBus::new());
        set_global_event_bus(event_bus.clone());

        // Layer 3: Async and audit
        let async_db = Arc::new(self.db.as_async());
        let audit_service = Arc::new(AuditService::new(self.db.clone()));

        // Layer 4: Event handlers
        let audit_log_handler = AuditLogHandler::new(audit_service);
        event_bus.register_handler(audit_log_handler);
        register_handler(inventory_service.intervention_finalized_handler());

        Ok(AppStateType {
            db: self.db,
            repositories: self.repositories,
            task_service,
            client_service,
            // ... all services
        })
    }
}
```

### Acyclicity Tests

```rust
#[test]
fn test_documented_service_graph_is_acyclic() {
    // Verifies no circular dependencies
    let graph: HashMap<_, _> = DOCUMENTED_SERVICE_DEPENDENCIES.iter().copied().collect();
    let mut visiting = HashSet::new();
    let mut visited = HashSet::new();

    for service in DOCUMENTED_SERVICE_INIT_ORDER {
        visit_service(service, &graph, &mut visiting, &mut visited);
    }
}

#[test]
fn test_documented_service_initialization_order_respects_dependencies() {
    // Verifies initialization order respects dependency order
    for (service, dependencies) in DOCUMENTED_SERVICE_DEPENDENCIES {
        for dependency in *dependencies {
            assert!(
                init_positions[dependency] < init_positions[service],
                "{} must be initialized before {}", dependency, service
            );
        }
    }
}
```

## Consequences

### Positive

- Initialization order is explicit and documented
- Circular dependencies detected at compile time via tests
- Easy to see all dependencies in one place (`service_builder.rs`)
- Services are properly initialized before Tauri app starts
- Testing: can create custom builders for injection

### Negative

- Adding new services requires updating builder
- Large `build()` function can be hard to read
- All services initialized even if not all needed
- Adding runtime dependencies requires graph update

## Related Files

- `src-tauri/src/service_builder.rs` - Service builder implementation
- `src-tauri/src/shared/app_state.rs` - AppStateType definition
- `src-tauri/src/main.rs:383-390` - ServiceBuilder usage in setup
- `src-tauri/src/shared/repositories/factory.rs` - Repository factory

## When to Read This ADR

- Adding a new service
- Understanding startup sequence
- Debugging initialization failures
- Writing service dependency tests
- Injecting mocks for testing
- Investigating circular dependency errors

## References

- Dependency Injection patterns
- AGENTS.md Service Builder section
- `service_builder.rs:64-89` - Documented initialization order
- `service_builder.rs:396-429` - Acyclicity and order tests