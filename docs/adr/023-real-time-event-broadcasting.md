# ADR-023: Real-Time Event Broadcasting and WebSocket Integration

## Status
Accepted

## Context
The frontend requires immediate updates for background state changes (e.g., task assignments, intervention status updates) without relying on expensive polling mechanisms.

## Decision

### WebSocket Event Handler
- The `WebSocketEventHandler` (`src-tauri/src/shared/services/websocket_event_handler.rs`) acts as a bridge between the internal event bus and connected frontend clients.
- It subscribes to specific domain events and translates them into typed `WSMessage` payloads.

### Selective Broadcasting
- Event broadcasting is filtered at the handler level to prevent sensitive information leakage (e.g., authentication failures are logged but never broadcasted).
- Domains can configure specific event types for broadcast using the `WebSocketEventHandlerBuilder`.

### Decoupled Integration
- The broadcasting logic is decoupled from the business operation via the event bus; a domain service publishes an event, and the `WebSocketEventHandler` asynchronously broadcasts it if a client is connected.

## Consequences
- The frontend UI remains synchronized with backend state in real-time.
- Network overhead is reduced compared to polling strategies.
- Security is maintained through centralized event filtering before broadcasting.
